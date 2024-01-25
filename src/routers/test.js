const router = require("express").Router();
router.get("/", async (req, res, next) => {
    // let today = new Date();
    // today = new Date(2023, 11, 31);
    // const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    // console.log(today);
    // console.log(midnight);
    // console.log((midnight - today) / 1000 / 3600);
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    console.log(today);
    res.status(200).send();
});
module.exports = router;
