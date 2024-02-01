const multerS3 = require("multer-s3");
const { S3 } = require("@aws-sdk/client-s3");
const awsConfig = require("../config/awsConfig");
const s3 = new S3(awsConfig);
const { v4: uuidv4 } = require("uuid");

module.exports = {
    storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_BUCKET,
        acl: "public-read",
        key: (req, file, cb) => {
            const name = uuidv4();
            cb(null, name);
        },
    }),
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith("image/")) {
            const err = new Error("file is not image");
            err.status = 400;
            cb(err, false);
        } else {
            console.log("success@@@");
            cb(null, true);
        }
    },
    limits: {
        fileSize: 2 * 1024 * 1024,
    },
};
