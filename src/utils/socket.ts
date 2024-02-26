import { io } from 'socket.io-client';

// const getHOST = () => {
//     if (process.env.ENV ?? "DEV" === "DEV") {
//         return process.env.DEV_HOST ?? "http://localhost:4000"
//     }
//     return process.env.PROD_HOST ?? "http://localhost:4000"
// }

export const socket = io("https://tictactoe-ws-backend.onrender.com", {
    autoConnect: true,
});
