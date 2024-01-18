const jwt = require("jsonwebtoken");

module.exports = (idx, admin) => {
    return jwt.sign(
        {
            idx: idx,
            admin: admin,
        },
        process.env.SECRET_KEY,
        {
            issuer: "juneh",
            expiresIn: "1m",
        }
    );
};
