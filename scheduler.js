const schedule = require("node-schedule");
const recordTotalVisited = require("./src/modules/recordTotalVisited");

// 매일 23시 59분 59초에 실행
schedule.scheduleJob("59 59 23 * * *", function () {
    console.log("스케줄러 실행: 매일 23시 59분 59초에 recordTotalVisited 실행");
    recordTotalVisited();
});
