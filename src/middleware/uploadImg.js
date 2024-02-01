const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage, //diskStorage 권장
    limits: {
        fileSize: 20 * 1024 * 1024, //
    },
});

module.exports = upload.fields([{ name: "images", maxCount: 5 }]);
//여기서 에러나면 ??
//-> 함수로 한번 감쌀것

//mimetype

//express-rate-limit
//helmet
//express-validator
