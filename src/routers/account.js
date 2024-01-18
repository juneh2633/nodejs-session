const router = require("express").Router();
const pgPool = require("../modules/pgPool");
const loginAuth = require("../middleware/loginAuth");
const logoutAuth = require("../middleware/logoutAuth");
const queryCheck = require("../modules/queryCheck");
const pwHash = require("../modules/pwHash");
const pwCompare = require("../modules/pwComapre");
const jwt = require("jsonwebtoken");
const tokenElement = require("../modules/tokenElement");
const signAccessToken = require("../modules/signAccessToken");
const signRefreshToken = require("../modules/signRefreshToken");

/////////-----account---------///////////
//  POST/login           => 로그인
//  GET/logout          =>로그아웃
//  GET/find/id         =>아이디 찾기
//  GET/find/password   =>비밀번호 찾기
//  GET/                =>회원정보 열람
//  POST/               =>회원가입
//  PUT/                =>회원정보 수정
//  DELETE/             =>회원탈퇴
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
        const sql = "SELECT * FROM account WHERE id = $1  AND account_deleted = false";
        const queryResult = await pgPool.query(sql, [id]);

        if (!queryResult.rows) {
            throw exception;
        }
        const match = await pwCompare(password, queryResult.rows[0].password);
        if (!match) {
            throw exception;
        }

        const idx = queryResult.rows[0].idx;

        session.idx = queryResult.rows[0].idx;
        session.admin = queryResult.rows[0].is_admin ? true : false;
        next(result);

        res.status(200).send(result);
    } catch (err) {
        next(err);
    }
});

//  GET/logout          =>로그아웃
router.get("/logout", loginAuth, async (req, res, next) => {
    const result = {
        data: null,
    };

    try {
        next(result);
        req.session.destroy();

        res.status(200).send(result);
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

        const sql = "SELECT id FROM account WHERE name = $1 AND phonenumber = $2 AND account_deleted = false";
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

        const sql = `SELECT password FROM account WHERE id = $1 AND name = $2 AND phonenumber = $3 AND account_deleted = false`;
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
    const idx = tokenElement(req.cookies.accessToken).idx;
    console.log(idx);
    const result = {
        data: null,
    };
    const exception = {
        message: "id not Found",
        status: 401,
    };
    try {
        const sql = "SELECT * FROM account WHERE idx = $1";
        const queryResult = await pgPool.query(sql, [idx]);

        if (!queryResult || !queryResult.rows) {
            throw exception;
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

        if (doubleCheckQueryResult.rows) {
            throw exception;
        }

        const sql = "INSERT INTO account (id, name, password, phonenumber, account_deleted) VALUES ($1, $2, $3, $4, false)";
        await pgPool.query(sql, [id, name, pwHashed, phonenumber]);

        next(result);
        res.status(200).send();
    } catch (err) {
        next(err);
    }
});

//  PUT/                =>회원정보 수정
router.put("/", loginAuth, async (req, res, next) => {
    const idx = tokenElement(req.cookies.accessToken).idx;
    const { password, passwordCheck, name, phonenumber } = req.query;
    const result = {
        data: null,
    };
    try {
        queryCheck({ password, passwordCheck, name, phonenumber });
        const pwHashed = await pwHash(password);
        const sql = "UPDATE account SET password = $1, name = $2, phonenumber = $3 WHERE idx = $4 ";
        await pgPool.query(sql, [pwHashed, name, phonenumber, idx]);
        next(result);
        res.status(200).send();
    } catch (err) {
        next(err);
    }
});

//  DELETE/             =>회원탈퇴
router.delete("/", loginAuth, async (req, res, next) => {
    const idx = tokenElement(req.cookies.accessToken).idx;
    const result = {
        data: null,
    };
    try {
        const sql = "UPDATE account SET account_deleted = true WHERE idx = $1 ";
        await pgPool.query(sql, [idx]);

        next(result);
        req.session.destroy();
        res.status(200).send();
    } catch (err) {
        next(err);
    }
});

module.exports = router;
