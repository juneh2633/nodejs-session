const router = require("express").Router();
const mongoClient = require("../modules/mongoClient");
const queryCheck = require("../modules/queryCheck");
const adminAuth = require("../middleware/adminAuth");
const pattern = /^(\d{4})(-\d{2})?(-\d{2})?(T\d{2}(:\d{2}(:\d{2}(\.\d{3})?)?)?(Z)?)?$/;

/////////-------log---------///////////s
//  GET/all             =>모두 가져오기
//  GET/                =>
/////////////////////////////////////////
router.get("/all", adminAuth, async (req, res, next) => {
    const { orderBy } = req.query;
    const asc = orderBy === "desc" ? -1 : 1;
    const result = {
        data: null,
    };
    try {
        const queryResult = await mongoClient.find().sort({ time: asc }).toArray();

        result.data = queryResult;
        res.status(200).send(result);
    } catch (err) {
        next(err);
    }
});

router.get("/", adminAuth, async (req, res, next) => {
    const { orderBy, id, method, api, fromDate, toDate } = req.query;
    const asc = orderBy === "desc" ? -1 : 1;
    const result = {
        data: null,
    };
    let findObj = {};

    if (id) {
        findObj.id = id === "null" ? null : id;
    }
    if (method) {
        findObj.method = method;
    }
    if (api) {
        findObj.api_path = new RegExp(encodeURIComponent(api));
    }
    if (fromDate && pattern.test(fromDate)) {
        if (!toDate) {
            findObj.time = {
                $gte: new Date(fromDate),
            };
        } else if (pattern.test(toDate)) {
            findObj.time = {
                $gte: new Date(fromDate),
                $lte: new Date(toDate),
            };
        }
    }
    if (fromDate === toDate) {
        findObj.time = {
            $gte: new Date(fromDate),
        };
    }

    try {
        const queryResult = await mongoClient.find(findObj).sort({ time: asc }).toArray();

        result.data = queryResult;
        res.status(200).send(result);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
