const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
    const accessToken = req.cookies.accessToken;
    const exception = {
        message: "already have token",
        status: 401,
    };

    try {
        if (accessToken) {
            jwt.verify(accessToken, process.env.SECRET_KEY);

            throw exception;
        }

        next();
    } catch (err) {
        if (err.message === "jwt expired") {
            res.clearCookie("accessToken");
            next();
        } else {
            next(err);
        }
    }
};
//jwt must be provided
