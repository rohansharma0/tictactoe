import { useEffect, useState } from "react";
import { socket } from "./utils/socket";

const App = () => {

  //initBoard
  const initBoard = [[-1, -1, -1], [-1, -1, -1], [-1, -1, -1]];

  const [roomId, setRoomId] = useState<string | null>();
  const [currentPlayer, setCurrentPlayer] = useState<any>({ name: "Rohan" });
  const [opponentPlayer, setOpponentPlayer] = useState<any>();
  const [currentTurn, setCurrentTurn] = useState();
  const [board, setBoard] = useState(initBoard)
  const [playingAs, setPlayingAs] = useState(null);
  const [gameStatus, setGameStatus] = useState("NOT_STARTED");
  const [finishedState, setFinishedState] = useState<any>();

  socket?.on("connect", function () {
    console.log("Socket connection established");
    setCurrentPlayer({ ...currentPlayer, socketId: socket.id })
  });

  socket?.on("game_status", (data) => {
    setGameStatus(data);
  })

  socket?.on("game_turn", (data) => {
    console.log(data);
    setCurrentTurn(data);
  })

  socket?.on("game_board", (data) => {
    setBoard(data);
  })

  socket?.on("room_info", (data: any) => {
    console.log(data);
    if (data?.player1?.id === currentPlayer?.socketId) {
      setPlayingAs(data?.player1?.playingAs);
      setOpponentPlayer({ socketId: data?.player2?.id, name: data?.player2?.name })
    } else {
      setPlayingAs(data?.player2?.playingAs);
      setOpponentPlayer({ socketId: data?.player1?.id, name: data?.player1?.name })
    }
  })

  useEffect(() => {
    const winner = checkWinner();
    if (winner !== null) {
      setFinishedState(winner);
    }
  }, [board])

  const checkWinner = () => {
    // row dynamic
    for (let row = 0; row < board.length; row++) {
      if (
        board[row][0] === board[row][1] &&
        board[row][1] === board[row][2] && board[row][0] !== -1
      ) {
        // setFinishedArrayState([row * 3 + 0, row * 3 + 1, row * 3 + 2]);.\
        return board[row][0];
      }
    }
    // column dynamic
    for (let col = 0; col < board.length; col++) {
      if (
        board[0][col] === board[1][col] &&
        board[1][col] === board[2][col] && board[0][col] !== -1
      ) {
        // setFinishedArrayState([0 * 3 + col, 1 * 3 + col, 2 * 3 + col]);
        return board[0][col];
      }
    }

    if (
      board[0][0] === board[1][1] &&
      board[1][1] === board[2][2] && board[1][1] !== -1
    ) {
      return board[0][0];
    }

    if (
      board[0][2] === board[1][1] &&
      board[1][1] === board[2][0] && board[1][1] !== -1
    ) {
      return board[1][1];
    }

    const isDrawMatch = board.flat().every((e) => {
      if (e === 0 || e === 1) return true;
    });

    if (isDrawMatch) return "DRAW";
    return null;
  }

  //genetare 6digit random number for roomId
  const generateRoomId = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  const createRoom = () => {
    if (!checkName()) {
      alert("Please enter your name");
      return;
    };
    const roomId: string = generateRoomId();
    setRoomId(roomId);
    socket?.emit("create_room", { roomId: roomId, playerName: currentPlayer.name, playerId: socket.id });
  }

  const resetGame = () => {
    setGameStatus("NOT_STARTED")
    setRoomId(null);
    setOpponentPlayer(null);
    setPlayingAs(null);
  }
  const playAgain = () => {
    setBoard(initBoard);
    socket.emit("turn", { roomId: roomId, currentTurn: currentPlayer, board: initBoard });
    setFinishedState(null);
  }
  const joinRoom = () => {
    if (!checkName()) {
      alert("Please enter your name");
      return;
    };
    socket?.emit("request_to_play", {
      playerName: currentPlayer.name,
      playerId: socket.id,
      roomId: roomId,
    });
  }
  const leaveRoom = (roomId: string) => {
    socket?.emit("leave_room", { roomId, playerId: socket.id });
    resetGame();
  }

  const checkName = () => {
    return !(currentPlayer && (!currentPlayer.name || currentPlayer.name === ""))
  }

  const handelClick = (rowId: number, colId: number, previousState: number) => {
    if (currentTurn !== socket.id || previousState !== -1 || !playingAs) {
      return;
    }
    let gameBoard = board;
    if (playingAs === "CROSS") {
      gameBoard[rowId][colId] = 0;
    } else {
      gameBoard[rowId][colId] = 1;
    }
    setBoard(gameBoard);
    socket.emit("turn", { roomId: roomId, currentTurn: currentPlayer, board: gameBoard });
  }

  if (gameStatus === "NOT_STARTED") {
    return <>
      <p>{JSON.stringify(currentPlayer)}</p>
      <p>{JSON.stringify(opponentPlayer)}</p>
      <input type="text" placeholder="Enter your name" onChange={(e) => setCurrentPlayer({ ...currentPlayer, name: e.target.value })} />
      <br />
      <br />
      <button onClick={createRoom}>CREATE ROOM</button>
      <br />
      <br />
      <input type="text" placeholder="Enter Room ID" onChange={(e) => setRoomId(e.target.value)} />
      <button onClick={joinRoom}>JOIN ROOM</button>
    </>
  }
  if (gameStatus === "ROOM_FULL_INVALID") {
    return <>
      <p>{JSON.stringify(currentPlayer)}</p>
      <p>{JSON.stringify(opponentPlayer)}</p>
      <p>Room is ether full or something went wrong</p>
      <p>Refresh your page</p>
    </>
  }
  if (gameStatus === "WAITING" && roomId) {
    return <>
      <p>{JSON.stringify(currentPlayer)}</p>
      <p>{JSON.stringify(opponentPlayer)}</p>
      <p>Waiting for your friend - ROOM ID : {roomId}</p>
      <button onClick={() => leaveRoom(roomId)}>LEAVE ROOM</button>
    </>
  }
  return (
    <>
      <p>YOU - {JSON.stringify(currentPlayer)} As - {playingAs}</p>
      <p>OPPONENT - {JSON.stringify(opponentPlayer)} As - {opponentPlayer?.playingAs}</p>
      <p>Game Started</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
        {board.map((rowArr: number[], rowId) =>
          <div key={rowId} style={{ display: "flex", gap: "5px" }}>
            {rowArr.map((e: number, colId) => {
              return <div onClick={() => handelClick(rowId, colId, e)} key={colId} style={{ width: "50px", height: "50px", border: "1px solid black", cursor: finishedState !== null ? "not-allowed" : "pointer" }}>{e}</div >
            })}
          </div>
        )}
      </div>
      <br />
      {finishedState === 0 ? <h2>CROSS WON</h2> : finishedState === 1 ? <h2>CIRCLE won</h2> : finishedState === "DRAW" ? <p>Match is draw</p> : null}
      {finishedState !== null ? <button onClick={playAgain}>PLAY AGAIN</button> : null}
      {roomId && <button onClick={() => leaveRoom(roomId)}>LEAVE ROOM</button>}
    </>
  )
}

export default App