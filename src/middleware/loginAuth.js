module.exports = (req, res, next) => {
    if (req.session.idx) {
        next();
    } else {
        const error = new Error("dont have session");
        error.status = 401;
        next(error);
    }
};
