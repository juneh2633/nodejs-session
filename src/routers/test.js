const router = require("express").Router();
const getExpireTime = require("../modules/getExpireTime");
const redisClient = require("../modules/redisClient");
const awsConfig = require("../config/awsConfig");
const multer = require("multer");

const AWS = require("aws-sdk");
// AWS.config.update()
const s3 = new AWS.S3(awsConfig);

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
    console.log("getExpireTime", getExpireTime());
    console.log(req.query.title);
    res.status(200).send();
});

router.get("/idx", async (req, res, next) => {
    const result = {
        idx: req.session.idx,
    };
    console.log(result.idx);
    res.status(200).send(result);
});
const path = require("path");
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 5MB
    },
});

// 여러 필드 처리를 위한 Multer 설정
const boardUpload = upload.fields([
    { name: "images", maxCount: 5 },
    { name: "title", maxCount: 1 },
    { name: "boardContents", maxCount: 1 },
]);

router.post("/upload", boardUpload, async (req, res, next) => {
    const images = req.files.images || [];
    const idx = 12;
    const allowedExtensions = [".png", ".jpg", ".jpeg"];
    const error = new Error();
    error.status = 400;
    try {
        let i = 0;
        for (img of images) {
            const fileSize = img.size;
            const maxSize = 10 * 1024 * 1024;
            const extension = path.extname(img.originalname).toLowerCase();
            if (fileSize > maxSize) {
                throw (error.message = "file");
            }
            if (!allowedExtensions.includes(extension)) {
                error.message = "extension error";
                throw error;
            }
            const params = {
                Bucket: "imagebucket2633",
                Key: idx + "-" + i,
                Body: img.buffer,
                ACL: "public-read",
            };

            await s3.upload(params).promise();
            i++;
        }
    } catch (err) {
        console.log(err);
    }

    res.status(200).send();
});
const uploadImg = require("../middleware/uploadImg");
router.get("/a", uploadImg, async (req, res, next) => {
    const images = req.files.images || [];
    console.log(images);
    res.status(200).send();
});
router.get("/asd", async (req, res, next) => {
    let numbers = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
    let currentOrder = "0245";
    for (let num of currentOrder) {
        const index = numbers.indexOf(num);
        if (index > -1) {
            numbers.splice(index, 1);
        }
    }
    console.log(numbers);
    res.status(200).send();
});
module.exports = router;
