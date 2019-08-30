const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    chat: {
        type: String,
        required: true
    },
    sender: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    attachments: {
        type: [String]
    },
    created: {
        type: Date,
        required: true,
        default: new Date()
    }
});

module.exports = Message = mongoose.model("Message", messageSchema);