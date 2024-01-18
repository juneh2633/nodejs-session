require("dotenv").config();

const env = {
    HTTP_PORT: process.env.HTTP_PORT,
};

// 환경변수 검증 로직

module.exports = env;
