module.exports = (req, res, next) => {
    const { uuid } = req.cookies;
    if (uuid) {
        next({
            message: "already have session",
            status: 401,
        });
    } else {
        next();
    }
};
