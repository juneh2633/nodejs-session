const redisClient = require("../modules/redisClient");

module.exports = async (idx, word) => {
    const key = `history${idx}`;
    const score = Number(new Date());
    const limit = 5;
    try {
        await redisClient.zAdd(key, { score: score, value: word }); // 새 검색어 추가
        const length = await redisClient.zCard(key); // Sorted Set의 길이 확인

        if (length > limit) {
            await redisClient.zRemRangeByRank(key, 0, 0); // 가장 오래된 검색어 삭제
        }
    } catch (err) {
        throw err;
    }
};
