const router = require("express").Router();
const redisClient = require("../modules/redisClient");

router.get("/", async (req, res, next) => {
    // let today = new Date();
    // today = new Date(2023, 11, 31);
    // const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    // console.log(today);
    // console.log(midnight);
    // console.log((midnight - today) / 1000 / 3600);
    // const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    // console.log(today);
    const idx = req.session.idx;
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const now = new Date();
    const i = await redisClient.get(`visited${idx}`, now.toISOString());
    const t = await redisClient.get(today);
    console.log(i);
    console.log(t);
    console.log(req.query.title);
    res.status(200).send();
});
module.exports = router;
