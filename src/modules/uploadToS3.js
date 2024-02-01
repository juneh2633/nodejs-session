const awsConfig = require("../config/awsConfig");

const { Upload } = require("@aws-sdk/lib-storage");
const { S3 } = require("@aws-sdk/client-s3");

const s3 = new S3(awsConfig);
const path = require("path");

module.exports = async (boardUid, i, img) => {
    const fileSize = img.size;
    const maxSize = 10 * 1024 * 1024;
    const allowedExtensions = [".png", ".jpg", ".jpeg"]; //포함으로는 막을 수 없는 경우도? ->
    const extension = path.extname(img.originalname).toLowerCase();
    const error = new Error("extension error");
    error.status = 400;
    try {
        if (fileSize > maxSize) {
            throw (error.message = "file size error");
        }
        if (!allowedExtensions.includes(extension)) {
            error.message = "extension error";
            throw error;
        }
        const params = {
            Bucket: process.env.AWS_BUCKET,
            Key: `${boardUid}-${i}`,
            Body: img.buffer,
            ACL: "public-read",
        };

        await new Upload({
            client: s3,
            params,
        }).done();
    } catch (err) {
        throw err;
    }
};
