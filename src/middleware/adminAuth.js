const jwt = require("jsonwebtoken");
const tokenElement = require("../modules/tokenElement");
const verifyToken = require("../modules/verifyToken");
const signAccessToken = require("../modules/signAccessToken");

module.exports = (req, res, next) => {
    if (!req.session.admin) {
        const error = new Error("dont have admin permission");
        error.status = 401;
        next(error);
    } else {
        next();
    }
};
