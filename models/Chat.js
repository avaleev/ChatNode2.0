const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
    roomtype: {
        type: String,
        enum: [
            "personal",
            "group",
            "feed"
        ]
    },
    users: {
        type: [String],
        required: true
    },
    privileged: {
        type: [String]
    },
    lastUpdated: {
        type: Date,
        default: new Date()
    },
    created: {
        type: Date,
        required: true,
        default: new Date()
    },
    title: {
        type: String,
        minlength: 3,
        maxlength: 64
    },
    cover: {
        type: String,
        default: "cover.jpg"
    }
});

module.exports = Chat = mongoose.model("Chat", chatSchema);