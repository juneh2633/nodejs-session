const mongoClient = require("../modules/mongoClient");
const url = require("url");
module.exports = async (result, req, res, next) => {
    const input = Object.entries(req.query);
    const urlObj = url.parse(req.originalUrl);
    const userIdx = req.cookies.idx;
    try {
        if (result instanceof Error) {
            console.log(result.message);

            await mongoClient.insertOne({
                level: "error",
                ip: req.ip,
                id: userIdx || null,
                method: req.method,
                api_path: urlObj.pathname,
                input: input || null,
                stack: result.stack || null,
                status: result.status || 500,
                message: result.message || null,
                time: new Date(),
            });

            next(result);
            return;
        }

        if (result.status) {
            console.log(result.message);
            await mongoClient.insertOne({
                level: "exception",
                ip: req.ip,
                id: userIdx || null,
                method: req.method,
                api_path: urlObj.pathname,
                input: input || null,
                status: result.status || 500,
                message: result.message || null,
                time: new Date(),
            });

            next(result);
        } else {
            await mongoClient.insertOne({
                level: "info",
                ip: req.ip,
                id: userIdx || null,
                method: req.method,
                api_path: urlObj.pathname,
                input: input || null,
                output: result,
                time: new Date(),
            });
        }
    } catch (err) {
        console.log(err.stack);
        next(err);
    }
};
