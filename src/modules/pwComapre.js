const bcrypt = require("bcrypt");

module.exports = (password, pwHashed) => bcrypt.compare(password, pwHashed);
