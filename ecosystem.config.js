module.exports = {
    apps: [
        {
            name: "app",
            script: "./server.js",
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: "1G",
            env: {
                NODE_ENV: "development",
            },
            env_production: {
                NODE_ENV: "production",
            },
        },
        {
            name: "scheduler",
            script: "./scheduler.js",
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: "1G",
            env: {
                NODE_ENV: "development",
            },
            env_production: {
                NODE_ENV: "production",
            },
        },
    ],
};

// module.exports = {
//     /* apps 항목은 우리가 pm2에 사용할 옵션을 기재 */
//     apps: [
//         {
//             name: "projectName", // app이름
//             script: "./index.js", // 실행할 스크립트 파일
//             instances: 2, // cpu 코어수 만큼 프로세스 생성 (instance 항목값을 ‘0’으로 설정하면 CPU 코어 수 만큼 프로세스를 생성)
//             exec_mode: "cluster", // 클러스터 모드
//             max_memory_restart: "300M", // 프로세스의 메모리가 300MB에 도달하면 reload 실행

//             watch: ["bin", "routes"], //bin폴더, routes폴더를 감시해서 변경사항 실행
//             ignore_watch: ["node_modules"], // 반대로 해당폴더의 파일변경은 무시

//             env: {
//                 // 환경변수 지정
//                 Server_PORT: 4000,
//                 NODE_ENV: "development",
//                 Redis_HOST: "localhost",
//                 Redis_PORT: 6379,
//             },

//             output: "~/logs/pm2/console.log", // 로그 출력 경로 재설정
//             error: "~/logs/pm2/onsoleError.log", // 에러 로그 출력 경로 재설정
//         },
//     ],

//     /* deploy는 원격 서버와 git을 연동해서 배포하는 방식 */
//     deploy: {
//         production: {
//             user: "SSH_USERNAME",
//             host: "SSH_HOSTMACHINE",
//             ref: "origin/master",
//             repo: "GIT_REPOSITORY",
//             path: "DESTINATION_PATH",
//             "pre-deploy-local": "",
//             "post-deploy": "npm install && pm2 reload ecosystem.config.js --env production",
//             "pre-setup": "",
//         },
//     },
// };
// 출처: https://inpa.tistory.com/entry/node-📚-PM2-모듈-사용법-클러스터-무중단-서비스 [Inpa Dev 👨‍💻:티스토리]
