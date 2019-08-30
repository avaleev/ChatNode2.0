const config = require("config");
const jwt    = require("jsonwebtoken");

module.exports = (req, res, next) => {
    const token = req.session.token;

    if (!token) return res.redirect("/");

    try {
        const decoded = jwt.verify(token, config.get("encryptionstring"));
        next();
    } catch (ex) {
        res.status(400).send("Invalid token.");
    }
};