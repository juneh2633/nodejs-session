const router = require("express").Router();
const pgPool = require("../modules/pgPool");
const loginAuth = require("../middleware/loginAuth");
const queryCheck = require("../modules/queryCheck");

/////////-----reply---------///////////                     uid
//  GET/:uid?page           =>댓글 가져오기(pagenation)      board_uid
//  POST/:uid               =>댓글 작성                     board_uid
//  PUT/:uid                =>댓글 수정                     reply_uid
//  DELETE/:uid             =>댓글 삭제                     reply_uid
////////////////////////////////////////////////////////////////

// get/reply/:uid/?page 게시글의 댓글 목록 가져오기
router.get("/", loginAuth, async (req, res, next) => {
    //board의 uid
    const account = req.session;
    const { boardIdx, page } = req.query;
    const pageSizeOption = 10;

    const result = {
        data: null,
    };

    try {
        queryCheck({ boardIdx, page });

        const sql = "SELECT * FROM reply WHERE deleted_at IS NULL AND board_idx = $1 ORDER BY idx LIMIT $2 OFFSET $3";
        let queryResult = await pgPool.query(sql, [boardIdx, pageSizeOption, (parseInt(page) - 1) * pageSizeOption]);
        if (!queryResult || !queryResult.rows) {
            result.message = "no reply";
        }
        queryResult.rows.forEach((elem) => {
            if (elem.account_idx === account.idx) {
                elem.isMine = true;
            } else {
                elem.isMine = false;
            }
        });
        next(result);
        result.data = queryResult.rows;
        res.status(200).send(result);
    } catch (err) {
        next(err);
    }
});

//  댓글 쓰기
router.post("/", loginAuth, async (req, res, next) => {
    const { boardIdx, replyContents } = req.query;
    const account = req.session;
    const result = {
        data: null,
    };
    const today = new Date();
    try {
        queryCheck({ uid, replyContents });
        const sql = "INSERT INTO reply ( account_idx, board_idx, contents) VALUES ($1, $2, $3)";
        await pgPool.query(sql, [account.idx, boardIdx, replyContents]);
        next(result);
        res.status(200).send();
    } catch (err) {
        next(err);
    }
});

//댓글 수정
router.put("/:replyIdx", loginAuth, async (req, res, next) => {
    const { replyIdx } = req.params;
    const { replyContents } = req.query;
    const account = req.session;
    const result = {
        data: null,
    };
    const today = new Date();
    try {
        queryCheck({ replyIdx, replyContents });

        const sql = "UPDATE reply SET contents = $1 WHERE idx = $2 AND account_idx = $3 AND deleted_at IS NULL";
        const queryResult = await pgPool.query(sql, [replyContents, replyIdx, account.idx]);
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

//댓글 삭제
router.delete("/:replyIdx", loginAuth, async (req, res, next) => {
    const { replyIdx } = req.params;
    const account = req.session;
    const result = {
        data: null,
    };
    const today = new Date();
    try {
        queryCheck({ replyIdx });

        const sql = "UPDATE reply SET deleted_at = $1,  WHERE idx = $2 AND account_idx = $3";

        const queryResult = await pgPool.query(sql, [today, replyIdx, account.idx]);

        if (queryResult.rowCount === 0) {
            const error = new Error("delete Fail");
            error.status = 400;
            throw error;
        }
        next(result);
        res.status(200).send(`Got a DELETE request at /reply/${replyIdx}`);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
