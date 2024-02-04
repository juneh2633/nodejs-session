const multerConfig = require("../config/multerConfig");
const multer = require("multer");
const upload = multer(multerConfig);
const uploadArray = upload.array("images", 5);

module.exports = (req, res, next) => {
    uploadArray(req, res, (err) => {
        if (err) {
            console.log("ERR", err);
            next(err);
        } else {
            next();
        }
    });
};

//여기서 에러나면 ??
//-> 함수로 한번 감쌀것

//mimetype

//express-rate-limit
//helmet
//express-validator
//3 layer architec/
