module.exports = (req, res, next) => {
    if (req.session.idx) {
        const exception = {
            message: "already have session",
            status: 401,
        };

        next(exception);
    } else {
        next();
    }
};
