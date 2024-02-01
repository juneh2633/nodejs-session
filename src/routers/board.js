const router = require("express").Router();
const pgPool = require("../modules/pgPool");
const loginAuth = require("../middleware/loginAuth");
const queryCheck = require("../modules/queryCheck");
const redisClient = require("../modules/redisClient");
const saveSearchHistory = require("../modules/saveSearchHistory");
const uploadImg = require("../middleware/uploadImg");
const uploadToS3 = require("../modules/uploadToS3");
/////////-----board---------///////////
//  GET/all?page        =>게시글 목록 가져오기(pagenation)
//  GET/:boardIdx            =>게시글 가져오기
//  POST/               =>게시글 작성
//  PUT/:boardIdx            =>게시글 수정
//  DELETE/:boardIdx         =>게시글 삭제
///////////////////////////////////////////

//  GET/all?page        =>게시글 목록 가져오기(pagenation)
router.get("/all", loginAuth, async (req, res, next) => {
    const { page } = req.query;
    const pageSizeOption = 10;
    const result = {
        data: null,
    };

    try {
        const sql = `SELECT board.*, account.id FROM board
                     JOIN account ON
                     board.account_idx = account.idx
                     WHERE board.deleted_at = null
                     ORDER BY idx DESC
                     LIMIT $1 OFFSET $2;`;
        const queryResult = await pgPool.query(sql, [pageSizeOption, (parseInt(page) - 1) * pageSizeOption]);

        next(result);
        result.data = queryResult.rows;
        res.status(200).send(result);
    } catch (err) {
        next(err);
    }
});
//  GET/search            =>게시글 검색
router.get("/search", loginAuth, async (req, res, next) => {
    const { title } = req.query;
    const account = req.session;
    const result = {
        data: null,
    };
    try {
        queryCheck({ title });
        const queryTitle = `%${title}%`;

        const sql = "SELECT * FROM board WHERE title like $1 AND delete_at = false ORDER BY idx DESC";
        const queryResult = await pgPool.query(sql, [queryTitle]);

        next(result);
        result.data = queryResult.rows;
        saveSearchHistory(account.idx, title);
        res.status(200).send(result);
    } catch (err) {
        next(err);
    }
});
//  GET/search/history            => 최근 검색어
router.get("/search/history", loginAuth, async (req, res, next) => {
    const result = {
        data: null,
    };
    const account = req.session;
    const key = `history${account.idx}`;
    try {
        const history = await redisClient.zRange(key, 0, 4, { withScores: true });

        result.data = history.reverse();
        next(result);
        res.status(200).send(result);
    } catch (err) {
        next(err);
    }
});

//  GET/:boardIdx            =>게시글 가져오기
router.get("/:boardIdx", loginAuth, async (req, res, next) => {
    const { boardIdx } = req.params;
    const account = req.session;
    const result = {
        images: [],
        data: null,
        isMine: false,
    };

    try {
        queryCheck({ boardIdx });

        const sql = "SELECT * FROM board WHERE idx = $1 AND delete_at = null";
        const queryResult = await pgPool.query(sql, [boardIdx]);

        if (!queryResult || !queryResult.rows[0]) {
            throw {
                message: "board not Found",
                status: 400,
            };
        }

        if (queryResult.rows[0].idx === idx) {
            result.isMine = true;
        }
        const imgOrder = queryResult.rows[0].image_order;
        const bucket = process.env.AWS_BUCKET;
        const region = process.env.AWS_REGION;
        for (char of imgOrder) {
            result.images.push(`https://${bucket}.s3.${region}.amazonaws.com/${boardIdx}-${char}`);
        }
        next(result);
        result.data = queryResult.rows[0];
        res.status(200).send(result);
    } catch (err) {
        next(err);
    }
});

//  POST/               =>게시글 작성
router.post("/", loginAuth, uploadImg, async (req, res, next) => {
    const idx = req.session.idx;
    const { title, boardContents } = req.body;
    const images = req.files.images || [];
    const today = new Date();
    const result = {
        data: null,
    };
    let boardCreate = false;
    let boardboardIdx;
    try {
        await pgPool.query("BEGIN");
        let imgOrder = "";
        for (let num = 0; num < images.length; num++) {
            imgOrder += num.toString();
        }

        queryCheck({ title, boardContents });
        const sql = `INSERT INTO board( idx, title, contents)
                     VALUES ($1 , $2 , $3)
                     RETURNING board_boardIdx`;

        const queryResult = await pgPool.query(sql, [idx, title, boardContents, today, imgOrder]);
        boardboardIdx = queryResult.rows[0].board_boardIdx;
        boardCreate = true;

        let i = 0;
        for (img of images) {
            uploadToS3(boardboardIdx, i, img);
            i++;
        }

        // 비동기 업로드 작업을 동시에 처리
        await Promise.all(images.map((img, i) => uploadToS3(boardIdx, numbers[i], img)));
        await pgPool.query("COMMIT");
        next(result);
        res.status(200).send();
    } catch (err) {
        await pgPool.query("ROLLBACK");
        next(err);
    }
});

//  PUT/:boardIdx            =>게시글 수정
router.put("/:boardIdx", loginAuth, async (req, res, next) => {
    const { boardIdx } = req.params;
    const { title, boardContents } = req.query;
    const account = req.session;
    const result = {
        data: null,
    };

    try {
        queryCheck({ boardIdx, title, boardContents });
        const sql = "UPDATE board SET title = $1, contents = $2 WHERE idx = $3 AND account_idx = $4";
        const queryResult = await pgPool.query(sql, [title, boardContents, boardIdx, account.idx]);

        if (queryResult.rowCount === 0) {
            const error = new Error("update Fail");
            error.status = 400;
            throw error;
        }
        next(result);
        res.status(200).send();
    } catch (err) {
        next(err);
    }
});
//             =>게시글 이미지 추가
router.post("/img/:boardIdx/add", loginAuth, uploadImg, async (req, res, next) => {
    const { boardIdx } = req.params;
    const { inputIndex } = req.body || [];
    const images = req.files.images || [];
    const idx = req.session.idx;
    const result = {
        data: null,
    };
    const exception = {
        message: "",
        status: 400,
    };
    try {
        //queryCheck({ inputIndex });
        const sql = "SELECT * FROM board WHERE board_boardIdx = $1 AND idx = $2 AND delete_at = false";
        const queryResult = await pgPool.query(sql, [boardIdx, idx]);
        const currentOrder = queryResult.rows[0].image_order;

        let numbers = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

        for (let num of currentOrder) {
            const index = numbers.indexOf(num);
            if (index > -1) {
                numbers.splice(index, 1);
            }
        }
        if (images.length > numbers.length) {
            exception.message = "over limits";
            throw exception;
        }
        const intInputIndex = parseInt(inputIndex);
        let orderString = numbers.join("");
        orderString = orderString.slice(0, images.length);

        if (intInputIndex > currentOrder.length) {
            exception.message = "inputIndex index fault";
            throw exception;
        }

        if (inputIndex) {
            currentOrder = currentOrder.substring(0, intInputIndex) + orderString + currentOrder.substring(intInputIndex);
        } else {
            currentOrder += orderString;
        }

        let i = 0;
        for (img of images) {
            uploadToS3(boardIdx, numbers[i], img);
            i++;
        }
        const updateSql = "UPDATE board SET image_order = $1 WHERE board_boardIdx = $2";
        await pgPool.query(updateSql, [currentOrder, boardIdx]);
        next(result);
        res.status(200).send();
    } catch (err) {
        next(err);
    }
});
//             =>게시글 이미지 삭제
router.post("/img/:boardIdx/delete", loginAuth, uploadImg, async (req, res, next) => {
    const { boardIdx } = req.params;
    const { inputIndex } = req.body || [];
    const images = req.files.images || [];
    const idx = req.session.idx;
    const result = {
        data: null,
    };
    const exception = {
        message: "",
        status: 400,
    };
    try {
        //queryCheck({ inputIndex });
        const sql = "SELECT * FROM board WHERE board_boardIdx = $1 AND idx = $2 AND delete_at = false";
        const queryResult = await pgPool.query(sql, [boardIdx, idx]);
        const currentOrder = queryResult.rows[0].image_order;

        let numbers = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

        for (let num of currentOrder) {
            const index = numbers.indexOf(num);
            if (index > -1) {
                numbers.splice(index, 1);
            }
        }
        if (images.length > numbers.length) {
            exception.message = "over limits";
            throw exception;
        }
        const intInputIndex = parseInt(inputIndex);
        let orderString = numbers.join("");
        orderString = orderString.slice(0, images.length);

        if (intInputIndex > currentOrder.length) {
            exception.message = "inputIndex index fault";
            throw exception;
        }

        if (inputIndex) {
            currentOrder = currentOrder.substring(0, intInputIndex) + orderString + currentOrder.substring(intInputIndex);
        } else {
            currentOrder += orderString;
        }

        let i = 0;
        for (img of images) {
            uploadToS3(boardIdx, numbers[i], img);
            i++;
        }

        next(result);
        res.status(200).send();
    } catch (err) {
        next(err);
    }
});
//  DELETE/:boardIdx         =>게시글 삭제
router.delete("/:boardIdx", loginAuth, async (req, res, next) => {
    const { boardIdx } = req.params;
    const account = req.session;
    const today = new Date();
    const result = {
        data: null,
    };
    try {
        queryCheck({ boardIdx });

        const sql = "UPDATE board SET delete_at = $1 WHERE idx = $2 AND account_idx = $3";
        const queryResult = await pgPool.query(sql, [today, boardIdx, account.idx]);

        if (queryResult.rowCount === 0) {
            const error = new Error("delete Fail");
            error.status = 400;
            throw error;
        }
        next(result);
        res.status(200).send(`Got a DELETE request at /${boardIdx}`);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
