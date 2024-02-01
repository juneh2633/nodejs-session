const router = require("express").Router();
const pgPool = require("../modules/pgPool");
const loginAuth = require("../middleware/loginAuth");
const logoutAuth = require("../middleware/logoutAuth");
const queryCheck = require("../modules/queryCheck");
const pwHash = require("../modules/pwHash");
const pwCompare = require("../modules/pwComapre");

const redisClient = require("../modules/redisClient");
const recordDailyVisited = require("../modules/recordDailyVisited");
/////////-----account---------///////////
//  POST/login           => 로그인
//  GET/logout          =>로그아웃
//  GET/find/id         =>아이디 찾기
//  GET/find/password   =>비밀번호 찾기
//  GET/                =>회원정보 열람
//  POST/               =>회원가입
//  PUT/                =>회원정보 수정
//  DELETE/             =>회원탈퇴
//  GET/visited         =>접속자수 열람
/////////////////////////////////////////

//  POST/login           => 로그인
router.post("/login", logoutAuth, async (req, res, next) => {
    const { id, password } = req.query;
    const exception = {
        message: "id not Found",
        status: 401,
    };
    const result = {
        data: null,
    };
    try {
        queryCheck({ id, password });
        const sql = "SELECT * FROM account WHERE id = $1  AND deleted_at = null";
        const queryResult = await pgPool.query(sql, [id]);
        if (!queryResult.rows[0]) {
            throw exception;
        }

        const match = await pwCompare(password, queryResult.rows[0].password);
        if (!match) {
            throw exception;
        }
        const idx = queryResult.rows[0].idx;
        req.session.idx = idx;

        const adminPermission = queryResult.rows[0].is_admin ? "true" : "false";
        await redisClient.set(`admin${idx}`, adminPermission);
        await redisClient.set(String(idx), req.session.id);
        recordDailyVisited(idx);
        next(result);

        res.status(200).send();
    } catch (err) {
        next(err);
    }
});

//  GET/logout          =>로그아웃
router.get("/logout", loginAuth, async (req, res, next) => {
    const result = {
        data: null,
    };
    const account = req.session;
    try {
        next(result);
        await redisClient.del(String(idx));
        await redisClient.del(`admin${idx}`);
        req.session.destroy();

        res.status(200).send();
    } catch (err) {
        next(err);
    }
});

//  GET/find/id         =>아이디 찾기
router.get("/find/id", logoutAuth, async (req, res, next) => {
    const { name, phonenumber } = req.query;
    const result = {
        data: null,
    };
    const exception = {
        message: "id not Found",
        status: 401,
    };
    try {
        queryCheck({ name, phonenumber });

        const sql = "SELECT id FROM account WHERE name = $1 AND phonenumber = $2 AND deleted_at = NULL";
        const queryResult = await pgPool.query(sql, [name, phonenumber]);

        if (!queryResult.rows) {
            throw exception;
        }

        result.data = queryResult.rows[0].id;
        next(result);
        res.status(200).send(result);
    } catch (err) {
        next(err);
    }
});

//  GET/find/password   =>비밀번호 찾기
router.get("/find/password", logoutAuth, async (req, res, next) => {
    const { id, name, phonenumber } = req.query;
    const result = {
        data: null,
    };
    const exception = {
        message: "id not Found",
        status: 401,
    };
    try {
        queryCheck({ id, name, phonenumber });

        const sql = `SELECT password FROM account WHERE id = $1 AND name = $2 AND phonenumber = $3 AND deleted_at = NULL`;
        const queryResult = await pgPool.query(sql, [id, name, phonenumber]);

        if (!queryResult.rows) {
            throw exception;
        }

        result.data = queryResult.rows[0].password; //해시된 값 출력
        next(result);
        res.status(200).send(result);
    } catch (err) {
        next(err);
    }
});

//===============================회원정보========================================

//  GET/                =>회원정보 열람
router.get("/", loginAuth, async (req, res, next) => {
    const account = req.session;
    const result = {
        data: null,
    };

    try {
        const sql = "SELECT * FROM account WHERE idx = $1";
        const queryResult = await pgPool.query(sql, [account.idx]);

        if (!queryResult || !queryResult.rows) {
            throw {
                message: "id not Found",
                status: 401,
            };
        }
        next(result);
        result.data = {
            id: queryResult.rows[0].id,
            //password: queryResult.rows[0].password,
            name: queryResult.rows[0].name,
            phonenumber: queryResult.rows[0].phonenumber,
        };
        res.status(200).send(result);
    } catch (err) {
        next(err);
    }
});

//  POST/               =>회원가입
router.post("/", logoutAuth, async (req, res, next) => {
    const { id, password, passwordCheck, name, phonenumber } = req.query;
    const result = {
        data: null,
    };
    const exception = {
        message: "id already exist",
        status: 400,
    };
    try {
        queryCheck({ id, password, passwordCheck, name, phonenumber });
        const pwHashed = await pwHash(password);

        const doubleCheckSql = "SELECT * FROM account WHERE id = $1";
        const doubleCheckQueryResult = await pgPool.query(doubleCheckSql, [id]);

        if (doubleCheckQueryResult.rows[0]) {
            throw exception;
        }

        const sql = "INSERT INTO account (id, name, password, phonenumber) VALUES ($1, $2, $3, $4)";
        await pgPool.query(sql, [id, name, pwHashed, phonenumber]);

        next(result);
        res.status(200).send();
    } catch (err) {
        next(err);
    }
});

//  PUT/                =>회원정보 수정
router.put("/", loginAuth, async (req, res, next) => {
    const account = req.session;
    const { password, passwordCheck, name, phonenumber } = req.query;

    try {
        queryCheck({ password, passwordCheck, name, phonenumber });
        const pwHashed = await pwHash(password);
        const sql = "UPDATE account SET password = $1, name = $2, phonenumber = $3 WHERE idx = $4 ";
        await pgPool.query(sql, [pwHashed, name, phonenumber, account.idx]);
        next({ data: null });
        res.status(200).send();
    } catch (err) {
        next(err);
    }
});

//  DELETE/             =>회원탈퇴
router.delete("/", loginAuth, async (req, res, next) => {
    const account = req.session;
    const result = {
        data: null,
    };
    const today = new Date();
    try {
        const sql = "UPDATE account SET deleted_at = $1 WHERE idx = $2 ";
        await pgPool.query(sql, [today, account.idx]);

        next(result);
        req.session.destroy();
        res.status(200).send();
    } catch (err) {
        next(err);
    }
});

router.get("/visited", loginAuth, async (req, res, next) => {
    const result = {
        todayString: null,
        today: null,
        total: null,
    };
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    try {
        result.todayString = today;
        result.today = await redisClient.get(today);
        result.total = await redisClient.get("total");
        next(result);
        res.status(200).send(result);
    } catch (err) {
        next(err);
    }
});
module.exports = router;
