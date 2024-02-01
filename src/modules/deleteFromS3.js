const awsConfig = require("../config/awsConfig");
const { S3 } = require("@aws-sdk/client-s3");
const s3 = new S3(awsConfig);

module.exports = async (boardUid, i) => {
    const params = {
        Bucket: process.env.AWS_Bucket,
        Key: `${boardUid}-${i}`,
    };

    try {
        await s3.deleteObject(params);
    } catch (err) {
        throw err;
    }
};
