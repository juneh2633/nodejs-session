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
                     WHERE board.deleted_at IS NULL
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

        const sql = "SELECT * FROM board WHERE title like $1 AND deleted_at IS NULL ORDER BY idx DESC";
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

        const sql = "SELECT * FROM board WHERE idx = $1 AND deleted_at IS NULL";
        const board = await pgPool.query(sql, [boardIdx]);

        if (!board || !board.rows[0]) {
            throw {
                message: "board not Found",
                status: 400,
            };
        }

        if (board.rows[0].idx === account.idx) {
            result.isMine = true;
        }

        next(result);
        result.data = board.rows[0];
        let currentContents = result.data.contents;

        const imgSql = "SELECT * FROM image WHERE board_idx = $1 ORDER BY img_order ASC";
        const imgUrl = await pgPool.query(imgSql, [boardIdx]);
        if (imgUrl.rows[0]) {
            imgUrl.rows.forEach((img, index) => {
                const regex = new RegExp(`!\\{${index}\\}`, "g"); // 이미지 위치에 !{0} !{1}
                let tmp = currentContents;
                console.log(img.img_url);
                currentContents = currentContents.replace(regex, `!{${img.img_url}}`);
                if (currentContents === tmp) {
                    throw {
                        message: "image regex fault",
                        status: 400,
                    };
                }
            });
        }
        result.data.contents = currentContents;
        res.status(200).send(result);
    } catch (err) {
        next(err);
    }
});

//  POST/               =>게시글 작성
router.post("/", loginAuth, uploadImg, async (req, res, next) => {
    const account = req.session;
    let { title, boardContents } = req.body;
    const files = req.files;
    const result = {
        data: null,
    };
    const client = await pgPool.connect();
    try {
        await client.query("BEGIN");
        queryCheck({ title });

        const sql = `INSERT INTO board( account_idx, title, contents)
                     VALUES ($1 , $2 , $3)
                     RETURNING idx`;

        const queryResult = await client.query(sql, [account.idx, title, boardContents]);
        const boardIdx = queryResult.rows[0].idx;

        if (files.length) {
            let imgSql = `INSERT INTO image (board_idx, img_order, img_url) VALUES`;
            files.forEach((file, index) => {
                imgSql += ` (${boardIdx}, ${index},  '${file.location}'),`;
            });
            imgSql = imgSql.slice(0, -1);
            await client.query(imgSql);
        }
        await client.query("COMMIT");
        next(result);
        res.status(200).send();
    } catch (err) {
        console.log(err.stack);
        await client.query("ROLLBACK");
        next(err);
    }
});

//  PUT/:boardIdx            =>게시글 수정
// 이미지 수정 예시
// !{0}첫번째 이미지\n!{1} 두번째줄\n!{2}세번째 줄

//    1. 이미지 순서 바꾸기
// !{1}첫번째 이미지\n!{0}두번째줄\n!{2}세번째 줄

//    2. 이미지 삭제
// !{0}첫번째 이미지\n 두번째줄\n!{2}세번째 줄

//    3. 이미지 추가
// !{0}첫번째 이미지\n!{1} 두번째줄\n!{2}세번째 줄\n {3}

//    복합
//  !{1}첫번째 이미지\n!{0}두번째줄\n!{3}
//  !{3}!{4}!{5}
//  !{3}!{0}!{1}
router.put("/:boardIdx", loginAuth, uploadImg, async (req, res, next) => {
    const { boardIdx } = req.params;
    let { title, boardContents } = req.body;
    const files = req.files;
    const account = req.session;
    const result = {
        data: null,
    };
    const client = await pgPool.connect();
    try {
        queryCheck({ boardIdx, title });
        await client.query("BEGIN");

        const currentImgSql = "SELECT * FROM image WHERE board_idx = $1 ORDER BY img_order ASC";
        const currentImgQuery = await client.query(currentImgSql, [boardIdx]);
        let currentImg = currentImgQuery.rows;
        let newImgStartIndex = currentImg.length;

        const currentBoardSql = "SELECT * FROM board WHERE idx = $1 AND deleted_at IS NULL";
        const currentBoardQuery = await client.query(currentBoardSql, [boardIdx]);
        let currentBoard = currentBoardQuery.rows[0];
        if (!currentBoard) {
            throw new Error();
        }
        let currentImgArray = [];
        let newNumber;
        const pattern = /!\{(\d+)\}/g;
        while ((newNumber = pattern.exec(currentBoard.contents)) !== null) {
            currentImgArray.push(parseInt(newNumber[1], 10));
        }

        let newImgArray = [];
        while ((newNumber = pattern.exec(boardContents)) !== null) {
            currentImgArray.push(parseInt(newNumber[1], 10));
        }
        let index = 0;
        boardContents = boardContents.replace(pattern, () => `!{${index++}}`);
        const sql = "UPDATE board SET title = $1, contents = $2 WHERE idx = $3 AND account_idx = $4";
        const board = await client.query(sql, [title, boardContents, boardIdx, account.idx]);
        // [0 ,1 ,2]
        // [1, 0 , 3]
        let newImgUrlArray = [];
        if (files.length) {
            files.forEach((file, index) => {
                newImgUrlArray.push(file.location);
            });
        }
        const deleteImgSql = "DELETE FROM image WHERE board_idx = $1";
        await client.query(deleteImgSql, [boardIdx]);

        let imgSql = `INSERT INTO image (board_idx, img_order, img_url) VALUES`;
        index = 0;
        let newImgIndex = 0;
        for (i of newImgArray) {
            if (i >= newImgStartIndex) {
                imgSql += ` (${boardIdx}, ${index},  '${newImgUrlArray[newImgIndex]}'),`;
                newImgIndex++;
            } else {
                imgSql += ` (${boardIdx}, ${index},  '${currentImg[i].img_url}'),`;
            }
            index++;
        }
        await client.query(imgSql);

        await client.query("COMMIT");
        next(result);
        res.status(200).send();
    } catch (err) {
        await client.query("ROLLBACK");
        next(err);
    }
});

////////////////////////////////////////////////////////
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
        const sql = "SELECT * FROM board WHERE board_boardIdx = $1 AND idx = $2 AND deleted_at IS NULL";
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
        const sql = "SELECT * FROM board WHERE board_boardIdx = $1 AND idx = $2 AND deleted_at IS NULL";
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

        const sql = "UPDATE board SET deleted_at = $1 WHERE idx = $2 AND account_idx = $3";
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
