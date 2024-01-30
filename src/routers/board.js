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
//  GET/:uid            =>게시글 가져오기
//  POST/               =>게시글 작성
//  PUT/:uid            =>게시글 수정
//  DELETE/:uid         =>게시글 삭제
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
                     board.idx = account.idx
                     WHERE board.board_deleted = false
                     ORDER BY board.board_uid DESC
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
    const idx = req.session.idx;
    const result = {
        data: null,
    };
    try {
        queryCheck({ title });
        const queryTitle = `%${title}%`;

        const sql = "SELECT * FROM board WHERE title like $1 AND board_deleted = false ORDER BY board.board_uid DESC";
        const queryResult = await pgPool.query(sql, [queryTitle]);

        next(result);
        result.data = queryResult.rows;
        saveSearchHistory(idx, title);
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
    const idx = req.session.idx;
    const key = `history${idx}`;
    try {
        const history = await redisClient.zRange(key, 0, 4, { withScores: true });

        result.data = history.reverse();
        next(result);
        res.status(200).send(result);
    } catch (err) {
        next(err);
    }
});

//  GET/:uid            =>게시글 가져오기
router.get("/:uid", loginAuth, async (req, res, next) => {
    const { uid } = req.params;
    const userUid = req.session.idx;
    const result = {
        images: null,
        data: null,
        isMine: false,
    };
    const exception = {
        message: "board not Found",
        status: 400,
    };
    try {
        queryCheck({ uid });

        const sql = "SELECT * FROM board WHERE board_uid = $1 AND board_deleted = false";
        const queryResult = await pgPool.query(sql, [uid]);

        if (!queryResult || !queryResult.rows) {
            throw exception;
        }

        if (queryResult.rows[0].idx === userUid) {
            result.isMine = true;
        }
        const imgOrder = queryResult.rows[0].image_order;

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
    let boardUid;
    try {
        await pgPool.query("BEGIN");
        let imgOrder = "";
        for (let num = 0; num < images.length; num++) {
            imgOrder += num.toString();
        }
        console.log(imgOrder);
        queryCheck({ title, boardContents });
        const sql = `INSERT INTO board( idx, title, contents, update_at , board_deleted, image_order)
                     VALUES ($1 , $2 , $3, $4, false, $5)
                     RETURNING board_uid`;

        const queryResult = await pgPool.query(sql, [idx, title, boardContents, today, imgOrder]);
        boardUid = queryResult.rows[0].board_uid;
        boardCreate = true;

        let i = 0;
        for (img of images) {
            uploadToS3(boardUid, i, img);
            i++;
            2;
        }
        await pgPool.query("COMMIT");
        next(result);
        res.status(200).send();
    } catch (err) {
        await pgPool.query("ROLLBACK");
        next(err);
    }
});

//  PUT/:uid            =>게시글 수정
router.put("/:uid", loginAuth, async (req, res, next) => {
    const { uid } = req.params;
    const { title, boardContents } = req.query;
    const idx = req.session.idx;
    const result = {
        data: null,
    };
    const today = new Date();

    try {
        queryCheck({ uid, title, boardContents });
        const sql = "UPDATE board SET title = $1, contents = $2, update_at = $3 WHERE board_uid = $4 AND idx = $5";
        const queryResult = await pgPool.query(sql, [title, boardContents, today, uid, idx]);

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

//  DELETE/:uid         =>게시글 삭제
router.delete("/:uid", loginAuth, async (req, res, next) => {
    const { uid } = req.params;
    const idx = req.session.idx;
    const today = new Date();
    const result = {
        data: null,
    };
    try {
        queryCheck({ uid });

        const sql = "UPDATE board SET update_at = $1, board_deleted = true WHERE board_uid = $2 AND idx = $3";
        const queryResult = await pgPool.query(sql, [today, uid, idx]);

        if (queryResult.rowCount === 0) {
            const error = new Error("delete Fail");
            error.status = 400;
            throw error;
        }
        next(result);
        res.status(200).send(`Got a DELETE request at /${uid}`);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
