const Redis = require("ioredis");
// const redis = require("redis");
const redisConfig = require("../config/redisConfig");
//let redisClient = redis.createClient(redisConfig);
// redisClient.connect().catch((err) => {
//     console.error("Redis connect Error:", err.stack);
// });

let redisClient = new Redis(redisConfig);

module.exports = redisClient;
