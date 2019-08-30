'use strict'

const config  = require("config");
const express = require("express");
const router  = express.Router();

const jwt     = require("jsonwebtoken");
const auth    = require("../middleware/auth");

const Chat    = require("../models/Chat");
const Message = require("../models/Message");
const User    = require("../models/User").User;

router.get("/conversations", auth, async (req, res) => {
    const self  = jwt.verify(req.session.token, config.get("encryptionstring"));
    
    let rooms = [];

    const chats = await Chat.find({ $or: [{ users: req.session.uid }, { users: "everyone" }] }).sort("-lastUpdated");
    for (let i = 0; i < chats.length; ++i) {
        if (chats[i].roomtype === "personal") {
            const otherone = (chats[i].users[0] == req.session.uid)? chats[i].users[1] : chats[i].users[0];
            const partner  = await User.findById(otherone, "-password");

            rooms.push({
                link: "/personal/" + partner.username,
                title: partner.username,
                cover: partner.avatar
            });
        } else {
            rooms.push({
                link: "/" + chats[i].roomtype + "/" + chats[i]._id,
                title: chats[i].title,
                cover: chats[i].cover
            });
        }
    }

    res.render("conversations", {
        title: "CN.Conversations",
        self: self,
        rooms: rooms
    });
});

// different chatroom type rendering definition
router.get("/personal/:partner", auth, async (req, res) => {
    const self = jwt.verify(req.session.token, config.get("encryptionstring"));
    var room = {
        title: '',
        cover: '',
        messages: []
    };

    try {
        User.findOne({ username: req.params.partner }, "username avatar", (err, user) => {
            room.title = user.username;
            room.cover = user.avatar;
    
            if (err || !user) {
                return res.status(400).send("Seems like your friend is not in the network yet. Or maybe your link was broken, dunno");
            } else {
                Chat.findOne({ $and: [{ users: req.session.uid }, { users: user._id }] }, async (err, chat) => {
                    if (err) {
                        return res.status(500).send(err);
                    } else if (!chat) {
                        const newchat = new Chat({
                            roomtype: "personal",
                            users: [
                                req.session.uid,
                                user._id
                            ],
                            privileged: undefined,
                            created: new Date(),
                            lastUpdated: new Date()
                        });
    
                        const initMessage = new Message({
                            chat: newchat._id,
                            sender: "System",
                            message: "Enjoy your private room, guys",
                            attachments: undefined,
                            created: new Date()
                        });
    
                        await newchat.save();
                        await initMessage.save();
    
                        res.redirect(req.path);
                    } else {
                        res.render("chat", {
                            title: "CN:{" + user.username + '}',
                            self: self,
                            room: room,
                            script: "chatter"
                        });
                    }
                });
            }
        });
    } catch (ex) {
        return res.status(500).send(ex);
    }
});

router.get("/group/:groupid", auth, (req, res) => {
    const self = jwt.verify(req.session.token, config.get("encryptionstring"));
    var room = {
        title: '',
        cover: '',
        messages: []
    }

    Chat.findOne({ $and: [{_id: req.params.groupid}, { users: req.session.uid }] }, async (err, chat) => {
        if (err || !chat) {
            return res.status(400).send("Seems like you are not welcome in this room. Maybe text someone who's in there, so they will let you in");
        } else {
            room.title = chat.title;
            room.cover = chat.cover;
            room.users = await User.find({ _id: { $in: chat.users }}, "username avatar").limit(3);

            res.render("chat", {
                title: "CN:{" + chat.title + '}',
                self: self,
                room: room,
                script: "chatter"
            });
        }
    });
});

router.get("/feed/:feedid", auth, (req, res) => {
    const self = jwt.verify(req.session.token, config.get("encryptionstring"));
    var room = {
        title: '',
        cover: '',
        users: []
    }

    Chat.findById(req.params.feedid, (err, chat) => {
        if (err || !chat) {
            return res.status(400).send("Hey buddy, I think you've got the wrong door, the leather club's two blocks down");
        } else {
            room.title = chat.title;
            room.cover = chat.cover;

            res.render("chat", {
                title: "CN:{" + chat.title + '}',
                self: self,
                room: room,
                script: "chatter"
            });
        }
    });
});

router.post("/message", auth, async (req, res) => {
    try {
        var findchat;
        if (req.body.roomtype === "personal") {
            let partner = await User.findOne({ username: req.body.chat }, "_id");
            findchat = await Chat.findOne({ $and: [{ users: partner._id }, { users: req.session.uid }] }, "_id");
        }

        const message = new Message({
            sender: req.session.uid,
            chat: (req.body.roomtype !== "personal") ? req.body.chat : findchat._id,
            message: req.body.message,
            created: new Date(),
            attachments: undefined
        });

        await message.save();

        return res.status(201).json({ result: "success "});
    } catch (ex) {
        console.log(ex);
        return res.status(500).json({ result: "fail", ex: ex });
    }
});

router.get("/messages", auth, async (req, res) => {
    let chatId = req.query.c;
    let prec   = req.query.precision || 0;

    try {
        let permitted;
        if (req.query.t === "personal") {
            let partner = await User.findOne({ username: chatId }, "_id");
            permitted = await Chat.findOne({ $and: [{ users: partner._id }, { users: req.session.uid }] });
        } else {
            permitted = await Chat.findOne({ $and: [{ _id: chatId }, { $or: [{ users: req.session.uid }, { users: "everyone" }] } ] });
        }

        if (!permitted) {
            res.status(403).send("You are not allowed to access this information. Stay back!");
        } else {
            let msgs = [];

            Message.find({ chat: permitted._id }).limit(20).exec(async (err, messages) => {
                for (let i = 0; i < messages.length; i++) {
                    if (messages[i].sender === "System") {
                        msgs.push({
                            self: false,
                            sender: "System",
                            message: messages[i].message,
                            created: messages[i].created
                        });
                    } else {
                        await User.findById(messages[i].sender, "username avatar", (err, user) => {
                            msgs.push({
                                self: (messages[i].sender === req.session.uid),
                                sender: { name: user.username, avatar: user.avatar },
                                message: messages[i].message,
                                created: messages[i].created
                            });
                        });
                    }
                }

                return res.send(msgs);
            });
        }
    } catch (ex) {
        console.log(ex);
        return res.status(500).send(ex);
    }
});

module.exports = router;