const router = require("express").Router();
const pgPool = require("../modules/pgPool");
const loginAuth = require("../middleware/loginAuth");
const queryCheck = require("../modules/queryCheck");
const redisClient = require("../modules/redisClient");
const saveSearchHistory = require("../modules/saveSearchHistory");
const uploadImg = require("../middleware/uploadImg");

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
    const userIdx = req.userIdx;
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
        saveSearchHistory(userIdx, title);
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
    const userIdx = req.userIdx;
    const key = `history${userIdx}`;
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
    const userIdx = req.userIdx;
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

        if (board.rows[0].idx === userIdx) {
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
    const userIdx = req.userIdx;
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

        const queryResult = await client.query(sql, [userIdx, title, boardContents]);
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
//  이미지 순서 변경
//  !{1}첫번째 이미지\n!{0}두번째줄\n!{3}
//  모든 이미지를 삭제하고 3개 추가
//  !{3}!{4}!{5}
//  두번째 이미지 삭제하고 맨 앞에 이미지 추가
//  !{3}!{0}!{1}
router.put("/:boardIdx", loginAuth, uploadImg, async (req, res, next) => {
    const { boardIdx } = req.params;
    let { title, boardContents } = req.body;
    const files = req.files;
    const userIdx = req.userIdx;
    const result = {
        data: null,
    };
    const client = await pgPool.connect();
    try {
        queryCheck({ boardIdx, title });
        //트랜잭션 시작
        await client.query("BEGIN");

        //이미지 인덱스를 불러오기
        const currentImgSql = "SELECT * FROM image WHERE board_idx = $1 ORDER BY img_order ASC";
        const currentImgQuery = await client.query(currentImgSql, [boardIdx]);
        let currentImg = currentImgQuery.rows;
        let newImgStartIndex = currentImg.length;

        //수정 전 글 불러오기
        const currentBoardSql = "SELECT * FROM board WHERE idx = $1 AND deleted_at IS NULL";
        const currentBoardQuery = await client.query(currentBoardSql, [boardIdx]);
        let currentBoard = currentBoardQuery.rows[0];
        if (!currentBoard) {
            const err = new Error("board not Found");
            err.status = 401;
            throw err;
        }

        // 원래 글의 이미지 인덱스 불러오기
        let currentImgArray = [];
        let newNumber;
        const pattern = /!\{(\d+)\}/g;
        while ((newNumber = pattern.exec(currentBoard.contents)) !== null) {
            currentImgArray.push(parseInt(newNumber[1], 10));
        }
        //새로운 글의 이미지 인덱스 순서 불러오기
        let newImgArray = [];
        while ((newNumber = pattern.exec(boardContents)) !== null) {
            newImgArray.push(parseInt(newNumber[1], 10));
        }

        // 새로운글 인덱스 다시 0부터 n까지 차례대로 바꿔서 db에 저장
        let index = 0;
        boardContents = boardContents.replace(pattern, () => `!{${index++}}`);
        const sql = "UPDATE board SET title = $1, contents = $2 WHERE idx = $3 AND account_idx = $4";
        const board = await client.query(sql, [title, boardContents, boardIdx, userIdx]);

        //새로운 이미지의 url을 배열에 미리 저장하기
        let newImgUrlArray = [];
        if (files.length) {
            files.forEach((file, index) => {
                newImgUrlArray.push(file.location);
            });
        }

        //이미지를 db에 다시 넣기 위해 기존 테이블 삭제
        const deleteImgSql = "DELETE FROM image WHERE board_idx = $1";
        await client.query(deleteImgSql, [boardIdx]);

        //이미지 목록 db에 다시 넣기
        let imgSql = `INSERT INTO image (board_idx, img_order, img_url) VALUES`;
        index = 0;
        let newImgIndex = 0;
        //이미지변경없이 글만 바꾼다면 sql문 실행하지 않기
        let imgChangeCheck = false;
        for (i of newImgArray) {
            //한번이라도 이미지를 바꾼다면 true
            imgChangeCheck = true;

            //새로운 이미지라면 newImgUrlArray에서 추출, 아니라면 currentImg에서 추출
            if (i >= newImgStartIndex) {
                imgSql += ` (${boardIdx}, ${index},  '${newImgUrlArray[newImgIndex]}'),`;
                newImgIndex++;
            } else {
                imgSql += ` (${boardIdx}, ${index},  '${currentImg[i].img_url}'),`;
            }
            index++;
        }

        if (imgChangeCheck) {
            console.log("imgChange SQL!");
            imgSql = imgSql.slice(0, -1);
            await client.query(imgSql);
        }

        await client.query("COMMIT");
        next(result);
        res.status(200).send();
    } catch (err) {
        //오류 발생시 롤백
        await client.query("ROLLBACK");
        next(err);
    }
});

//  DELETE/:boardIdx         =>게시글 삭제
router.delete("/:boardIdx", loginAuth, async (req, res, next) => {
    const { boardIdx } = req.params;
    const userIdx = req.userIdx;
    const today = new Date();
    const result = {
        data: null,
    };
    try {
        queryCheck({ boardIdx });

        const sql = "UPDATE board SET deleted_at = $1 WHERE idx = $2 AND account_idx = $3";
        const queryResult = await pgPool.query(sql, [today, boardIdx, userIdx]);

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
