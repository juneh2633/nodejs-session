const jwt = require("jsonwebtoken");

module.exports = (token) => {
    try {
        jwt.verify(token, process.env.SECRET_KEY, { algorithms: ["HS256"] });
        return true;
    } catch (err) {
        return false;
    }
};
// expired 말고 verify에서 걸리는 경우가 있는가?
// 이상한 토큰까지 검증해줘야 하는가?
// => 해커에게 에러 메세지를 남겨야 하는가
