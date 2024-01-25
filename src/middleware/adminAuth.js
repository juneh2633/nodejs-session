const redisClient = require("../modules/redisClient");

module.exports = async (req, res, next) => {
    const idx = req.session.idx;
    const exception = {
        message: "dont have admin permission",
        status: 401,
    };

    try {
        if (!idx) {
            throw exception;
        }
        const permission = await redisClient.get(`admin${idx}`);
        if (!permission || permission !== "true") {
            throw exception;
        }
        next();
    } catch (err) {
        console.err;
        next(err);
    }
};
