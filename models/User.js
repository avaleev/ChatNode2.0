const config     = require("config");
const jwt        = require("jsonwebtoken");
const joi        = require("joi");
const mongoose   = require("mongoose");

const formatDate = require("../public/js/helpers").formatDate;

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        minlength: 3,
        maxlength: 24,
        trim: true,
        required: true
    },
    email: {
        type: String,
        trim: true,
        minlength: 5,
        maxlength: 255,
        required: true
    },
    password: {
        type: String,
        trim: true,
        required: true,
        minlength: 8
    },
    created: {
        type: Date,
        default: new Date()
    },
    avatar: {
        type: String,
        default: "avatar.jpg"
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    resetPasswordToken: String,
    resetPasswordExpiry: Date
});

userSchema.methods.generateAuthToken = function() {
    const token = jwt.sign(
        {
            _id: this._id,
            username: this.username,
            avatar: this.avatar
        },
        config.get("encryptionstring"));
    return token;
}

const User = mongoose.model("User", userSchema);

function validateUser(user) {
    const restricted = [
        "system",
        "admin",
        "everyone",
        "null",
        "undefined",
    ]

    const schema = {
        username: joi.string().min(3).max(24).required().invalid(restricted),
        email: joi.string().min(5).max(255).required().email(),
        password: joi.string().min(3).max(255).required()
    };

    return joi.validate(user, schema);
}

exports.User = User;
exports.validate = validateUser;