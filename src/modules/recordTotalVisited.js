const redisClient = require("../modules/redisClient");

module.exports = async () => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    try {
        const todayVisted = await redisClient.get(today);
        if (todayVisted) {
            await redisClient.incrby("today", parseInt(todayVisted));
        }
    } catch (err) {
        throw err;
    }
};
