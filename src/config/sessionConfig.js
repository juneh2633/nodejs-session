module.exports = {
    secret: process.env.SESSION_SECRET,
    resave: false, //변경이 없는 경우에도 다시 저장할지(매 request마다)
    saveUninitialized: true, //저장하지 않은 세션에 대해 아무내용없는 세션을 저장할지
    cookie: { httpOnly: true, secure: false }, // HTTPS를 사용하는 경우 true로 설정
};
