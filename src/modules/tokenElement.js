module.exports = (token) => {
    const payload = token.split(".")[1];
    const convert = Buffer.from(payload, "base64");
    const data = JSON.parse(convert.toString());
    return data;
};
