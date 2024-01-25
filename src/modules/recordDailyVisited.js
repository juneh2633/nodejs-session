const redisClient = require("../modules/redisClient");
const getExpireTime = require("../modules/getExpireTime");

module.exports = async (idx) => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    console.log(idx);
    try {
        const visited = await redisClient.get(`visited${idx}`);
        if (visited) {
            return;
        }
        const now = new Date();
        await redisClient.set(`visited${idx}`, now.toISOString());
        await redisClient.expire(`visited${idx}`, getExpireTime());
        await redisClient.incr(today);
        console.log(await redisClient.get(today));
        await redisClient.expire(today, 86401);
        await redisClient.incr(total);
    } catch (err) {
        throw err;
    }
};
