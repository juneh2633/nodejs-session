const jwt = require("jsonwebtoken");
const tokenElement = require("../modules/tokenElement");
const verifyToken = require("../modules/verifyToken");
const signAccessToken = require("../modules/signAccessToken");

module.exports = (req, res, next) => {
    if (!req.session.admin) {
        const exception = {
            message: "dont have admin permission",
            status: 401,
        };

        next(exception);
    } else {
        next();
    }
};
