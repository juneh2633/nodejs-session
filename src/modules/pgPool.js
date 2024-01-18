const pgConfig = require("../config/pgConfig");
const { Pool } = require("pg");

module.exports = new Pool({
    ...pgConfig,
});
