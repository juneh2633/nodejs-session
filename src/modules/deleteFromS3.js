const awsConfig = require("../config/awsConfig");
const AWS = require("aws-sdk");
const s3 = new AWS.S3(awsConfig);

module.exports = async (boardUid, i) => {
    const params = {
        Bucket: process.env.AWS_Bucket,
        Key: `${boardUid}-${i}`,
    };

    try {
        await s3.deleteObject(params).promise();
    } catch (err) {
        throw err;
    }
};
