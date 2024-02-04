const redisClient = require("../modules/redisClient");

module.exports = async (req, res, next) => {
    const exception = {
        message: "dont have session",
        status: 401,
    };
    try {
        const { uuid } = req.cookies;
        if (!uuid) {
            throw exception;
        }
        const idx = await redisClient.get(uuid);
        if (!idx) {
            throw exception;
        }
        const currentUuid = await redisClient.get(String(idx));
        if (!currentUuid) {
            throw exception;
        }
        if (uuid !== currentUuid) {
            res.clearCookie("uuid");
            throw {
                message: "logged in another environment",
                status: 403,
            };
        }
        req.userIdx = idx;
        next();
    } catch (err) {
        next(err);
    }
};
