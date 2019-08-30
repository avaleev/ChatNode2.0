const config      = require("config");
const express     = require("express");
const router      = express.Router();

const nodemailer  = require("nodemailer");

const { User, validate } = require("../models/User");
const auth = require("../middleware/auth");

const jwt    = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const async  = require("async");

router.get("/self", auth, (req, res) => {
    const self = jwt.verify(req.session.token, config.get("encryptionstring"));
    if (req.query.basic) {
        return res.send({ name: self.username, avatar: self.avatar });
    } else {
        res.render("user", {
            title: "CN->" + self.username,
            self: self,
            user: self,
            script: "profiler"
        });
    }
});

router.get("/n/:uname", auth, async (req, res) => {
    const self = jwt.verify(req.session.token, config.get("encryptionstring"));

    const user = await User.findOne({ username: req.params.uname }, "-password");
    if (!user) {
        user = 0;
    }

    res.render("user", {
        title: "CN->" + user.username,
        self: self,
        user: user,
        script: "profiler"
    });
});

router.get("/forgot", (req, res) => {
    res.render("forgot", {
        title: "CN.pwd_recovery",
        script: "auther"
    });
});

router.get("/reset/:token", (req, res) => {
    User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpiry: { $gt: Date.now() } }, (err, user) => {
        if (!user) {
            return res.status(400).send("Token is either invalid or expired. I'm sorry about that");
        }
        res.render("reset", {
            title: "CN.pwd_reassignment",
            script: "profiler"
        });
    })
});

router.post("/register", async (req, res) => {
    const { error } = validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    let user = await User.findOne({ email: req.body.email });
    if (user) return res.status(400).send("This email is already registered with us");

    user = new User({
        username: req.body.username,
        email: req.body.email,
        password: req.body.password
    });
    user.password = await bcrypt.hash(user.password, 13);
    await user.save();

    delete user["password"];
    const token = user.generateAuthToken();

    req.session.uid   = user._id;
    req.session.token = token;
});

router.post("/authenticate", (req, res, next) => {
    User.findOne({ $or: [{ username: req.body.login }, { email: req.body.login }] }, function(err, user) {
        if (err || !user) {
            res.status(401).send("Your name is not in the invite list. Sign up if you want to get inside");
        } else {
            if (bcrypt.compareSync(req.body.password, user.password)) {
                delete user["password"];
                const token = user.generateAuthToken();

                req.session.uid   = user._id;
                req.session.token = token;

                return res.status(201).json({ status: "success", message: "Gotcha name on the tombstone on this service", data: { user: user, token: token }});
            } else {
                return res.status(401).send("That's a miss! Try another passphrase, my friend");
            }
        }
    });
});

router.post("/forgot", (req, res, next) => {
    async.waterfall([
        function(done) {
            crypto.randomBytes(20, (err, buf) => {
                var token = buf.toString("hex");
                done(err, token);
            });
        },
        function(token, done) {
            console.log(req.body.email);
            User.findOne({ email: req.body.email }, (err, user) => {
                if (!user) return res.status(401).send("Oi! You don't even have an account here, what are you trying to recover?");

                user.resetPasswordToken = token;
                user.resetPasswordExpiry = Date.now() + 3600000;

                user.save(function(err) {
                    done(err, token, user);
                });
            });
        },
        function(token, user, done) {
            var smtpTransport = nodemailer.createTransport({
                host: "smtp.gmail.com",
                port: 465,
                secure: true,
                auth: {
                    user: config.get("gmail").user,
                    pass: config.get("gmail").pass
                }
            });
            var mailOptions = {
                to: user.email,
                from: '"Koolaid Buddy" <koolaidbuddy@demo.com>',
                subject: "ChatNode Password Reset",
                text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
                    'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                    'http://' + req.headers.host + '/user/reset/' + token + '\n\n' +
                    'If you did not request this, please ignore this email and your password will remain unchanged.\n',
                html: "<b>Please don't steal others' accounts</b>"
            };

            smtpTransport.sendMail(mailOptions, function(err) {
                if (err) {
                    return res.status(500).send("Ugh, my mailing service provider isn't picking up their phone. Please come over again later");
                } else {
                    return res.status(200).send("Go find your recovery code in your mailbox and come back with what you get");
                }
            });
        }
    ], function(err) {
        if (err) return next(err);
        res.redirect("/forgot");
    });
});

router.post("/reset/:token", (req, res) => {
    async.waterfall([
        function(done) {
            User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpiry: { $gt: Date.now() } }, (err, user) => {
                if (!user) {
                    return res.redirect("back").status(400).send("Token is either invalid or expired. I'm sorry about that");
                }

                user.password = req.body.password;
                user.resetPasswordToken = undefined;
                user.resetPasswordExpiry = undefined;

                user.save(function(err) {
                    if (err) {
                        return res.redirect("back").status(500).send("Um, I forgot what I was going do. Give me some time please");
                    } else {
                        delete user["password"];
                        const token = user.generateAuthToken();

                        req.session.uid = user._id;
                        req.session.token = token;

                        done(err, user);
                    }
                });
            });
        },
        function(user, done) {
            var smtpTransport = nodemailer.createTransport({
                host: "smtp.gmail.com",
                port: 465,
                secure: true,
                auth: {
                    user: config.get("gmail").user,
                    pass: config.get("gmail").pass
                }
            });
            var mailOptions = {
                to: user.email,
                from: '"Koolaid Buddy" <koolaidbuddy@demo.com>',
                subject: "Your ChatNode password has been changed",
                text: "Hello, \n\n" +
                "This is a confirmation that the password for your account " + user.email + " has just been changed.\n",
                html: "<b>Please don't steal others' accounts</b>"
            };
            smtpTransport.sendMail(mailOptions, function(err) {
                if (err) {
                    return res.status(500).send("Ugh, my mailing service provider isn't picking up their phone. Please come over again later");
                } else {
                    return res.status(200).send("You are all set. Enjoy your brand new password");
                }
            });
        }
    ], function(err) {
        res.redirect("/user/self");
    });
});

router.get("/exit", (req, res, next) => {
    req.session.destroy();
    res.redirect("/");
});

module.exports = router;