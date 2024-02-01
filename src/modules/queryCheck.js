const patternSelect = (str) => {
    if (str === "id" || str === "password" || str === "passwordCheck") {
        return /^[a-zA-Z0-9]{6,20}$/;
    }
    if (str === "name") {
        return /^[a-zA-Z가-힣]{1,20}$/;
    }
    if (str === "phonenumber") {
        return /^[0-9]{11}$/;
    }
    if (str === "title") {
        return /^.{1,30}$/;
    }
    if (str === "boardContents") {
        return /^.{1,5000}$/;
    }
    if (str === "replyContents") {
        return /^.{1,500}$/;
    }
    if (str === "page" || str === "idx" || str === "boardIdx" || str === "replyIdx") {
        return /^[0-9]{1,20}$/;
    }
    return /^[0]{9999999}$/;
};

module.exports = (query) => {
    const list = Object.entries(query);

    const error = new Error();
    error.status = 400;
    console.log(list);
    for (let idx = 0; idx < list.length; idx++) {
        const queryName = list[idx][0];
        const queryString = list[idx][1];
        if (!queryString || queryString === undefined) {
            error.message = `error occurs at ${queryName} , ${queryName} = [${queryString}]`;

            throw error;
        }
        if (!patternSelect(queryName).test(queryString)) {
            error.message = `regex fault at ${queryName}`;

            throw error;
        } //pattern.test(id)
        if (queryName === "passwordCheck" && list[idx - 1][1] !== queryString) {
            error.message = "passwordCheck is not equal";
            throw error;
        }
    }
    console.log("success");
};
