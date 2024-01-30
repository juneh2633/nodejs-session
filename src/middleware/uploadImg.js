const awsConfig = require("../config/awsConfig");
const multer = require("multer");

const AWS = require("aws-sdk");
const s3 = new AWS.S3(awsConfig);
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 5MB
    },
});

module.exports = upload.fields([
    { name: "images", maxCount: 5 },
    { name: "title", maxCount: 1 },
    { name: "boardContents", maxCount: 1 },
]);
