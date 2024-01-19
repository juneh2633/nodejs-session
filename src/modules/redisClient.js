const redis = require("redis");
let redisClient = redis.createClient();
redisClient.connect().catch((err) => {
    console.error("Redis connect Error:", err.stack);
});

module.exports = redisClient;
