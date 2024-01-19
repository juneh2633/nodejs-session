const redisClient = require("../modules/redisClient");

module.exports = async (req, res, next) => {
    const idx = req.session.idx;
    try {
        if (!idx) {
            throw {
                message: "dont have session",
                status: 401,
            };
        }
        const sid = await redisClient.get(String(idx));
        if (!sid || sid != req.session.id) {
            req.session.destroy();
            throw {
                message: "logged in another environment",
                status: 403,
            };
        }
        next();
    } catch (err) {
        console.err;
        next(err);
    }
};
