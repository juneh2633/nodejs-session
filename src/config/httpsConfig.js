const fs = require("fs");
const path = require("path");

module.exports = {
    key: fs.readFileSync(path.join(__dirname, "../keys/key.pem")),
    cert: fs.readFileSync(path.join(__dirname, "../keys/cert.pem")),
    //ca:
    passphrase: process.env.HTTPS_PASSPHRASE,
};
