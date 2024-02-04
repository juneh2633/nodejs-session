const redisClient = require("../modules/redisClient");
const pgPool = require("../modules/pgPool");
module.exports = async () => {
    try {
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const todayVisited = await redisClient.get(today);
        const total = await redisClient.get("total");
        const totalSql = "INSERT INTO total_visited (total) VALUES ($1)";
        await pgPool.query(totalSql, total);
        const dailySql = "INSERT INTO daily_visited (today_visited) VALUES ($1)";
        await pgPool.query(dailySql, todayVisited);
    } catch (err) {
        throw err;
    }
};
