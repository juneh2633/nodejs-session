const bcrypt = require("bcrypt");
const saltRounds = 10;

module.exports = (password) => bcrypt.hash(password, saltRounds);
