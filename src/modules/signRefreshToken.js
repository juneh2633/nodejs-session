const jwt = require("jsonwebtoken");

module.exports = (idx) => {
    return jwt.sign(
        {
            idx: idx,
        },
        process.env.SECRET_KEY,
        {
            issuer: "juneh",
            expiresIn: "1d",
        }
    );
};
