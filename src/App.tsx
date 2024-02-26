import { useEffect, useRef, useState } from "react";
import { socket } from "./utils/socket";
import "./App.css";
import "react-responsive-modal/styles.css";
import Circle from "./components/Circle";
import Cross from "./components/Cross";
import Modal from "react-responsive-modal";

const App = () => {
  //initBoard
  const initBoard = [[-1, -1, -1], [-1, -1, -1], [-1, -1, -1]];
  const [roomId, setRoomId] = useState<string | null>();
  const [currentPlayer, setCurrentPlayer] = useState<any>({});
  const [opponentPlayer, setOpponentPlayer] = useState<any>({});
  const [currentTurn, setCurrentTurn] = useState();
  const [initialTurn, setInitialTurn] = useState();
  const [board, setBoard] = useState(initBoard);
  const [gameStatus, setGameStatus] = useState("NOT_STARTED");
  const [finishedState, setFinishedState] = useState<number>(-1);
  // const [isNameDisabled, setIsNameDisabled] = useState(true);
  const [isCreateRoomModal, setIsCreateRoomModal] = useState(false);
  const [isJoinRoomModal, setIsJoinRoomModal] = useState(false);
  const [isPlayingAsCross, setIsPlayingAsCross] = useState(true);
  const MainRef = useRef(null);

  socket?.on("connect", function () {
    console.log("Socket connection established");
    setCurrentPlayer({ ...currentPlayer, socketId: socket.id })
  });

  socket?.on("game_status", (data) => {
    setGameStatus(data);
  })

  socket?.on("game_turn", (data) => {
    setCurrentTurn(data);
  })

  socket?.on("game_board", (data) => {
    setBoard(data);
  })

  socket?.on("room_info", (data: any) => {
    console.log(data);
    setFinishedState(-1);
    setBoard(initBoard)
    if (data?.player1?.id === currentPlayer?.socketId) {
      setCurrentPlayer({ ...currentPlayer, playingAs: data?.player1?.playingAs });
      setOpponentPlayer({ socketId: data?.player2?.id, name: data?.player2?.name, playingAs: data?.player2?.playingAs })
    } else {
      setCurrentPlayer({ ...currentPlayer, playingAs: data?.player2?.playingAs });
      setOpponentPlayer({ socketId: data?.player1?.id, name: data?.player1?.name, playingAs: data?.player1?.playingAs })
    }
    setInitialTurn(data?.turn);
    setCurrentTurn(data?.turn);
  })

  useEffect(() => {
    const winner = checkWinner();
    if (winner !== null) {
      setFinishedState(winner);
    }
  }, [board])

  // useEffect(() => {
  //   getRandomName();
  // }, [])

  // const getRandomName = async () => {
  //   const res = await fetch("https://randomuser.me/api");
  //   const data = await res.json();
  //   const name = data.results[0].name.first;
  //   // console.log(currentPlayer);

  //   setCurrentPlayer({ ...currentPlayer, name: name });
  //   // const onlyAlphaNumericPattern: RegExp = new RegExp('[a-zA-Z0-9]+');
  //   // const s = onlyAlphaNumericPattern.text(name);
  //   // console.log(s);
  //   // if () {
  //   //   setCurrentPlayer({ ...currentPlayer, name: name });
  //   // } else {
  //   //   await getRandomName();
  //   // }
  // }

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

    if (isDrawMatch) return 2;
    return null;
  }

  //genetare 6digit random number for roomId
  const generateRoomId = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  const createRoom = () => {
    setIsCreateRoomModal(false);
    if (!checkName()) {
      alert("Please enter your name");
      return;
    };
    const roomId: string = generateRoomId();
    setRoomId(roomId);
    socket?.emit("create_room", { roomId: roomId, playerName: currentPlayer.name, playerId: socket.id, playingAs: isPlayingAsCross ? "CROSS" : "CIRCLE" });
  }

  const resetGame = () => {
    setGameStatus("NOT_STARTED")
    setRoomId(null);
    setFinishedState(-1);
    setOpponentPlayer(null);
  }
  const playAgain = () => {
    setBoard(initBoard);
    setFinishedState(-1);
    socket.emit("reset", { roomId: roomId, previousMatchTurn: initialTurn, currentPlayerPlayingAs: currentPlayer?.playingAs, opponentPlayerPlayingAs: opponentPlayer?.playingAs });
  }
  const joinRoom = () => {
    setIsJoinRoomModal(false);
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
    if (currentTurn !== socket.id || previousState !== -1 || finishedState > -1) {
      return;
    }
    let gameBoard = board;
    if (currentPlayer?.playingAs === "CROSS") {
      gameBoard[rowId][colId] = 0;
    } else {
      gameBoard[rowId][colId] = 1;
    }
    setBoard(gameBoard);
    socket.emit("turn", { roomId: roomId, currentTurn: currentPlayer, board: gameBoard });
  }
  if (!currentPlayer || currentPlayer?.name === null) {
    return JSON.stringify(currentPlayer);
  }
  if (currentPlayer && gameStatus === "NOT_STARTED") {
    return <main className="home-page" ref={MainRef}>
      <div className="home-icons">
        <Cross />
        <Circle />
      </div>
      <div className="home-actions">
        <input className="home-action-btn home-action-input" type="text" placeholder="Enter Name" value={currentPlayer.name} onChange={(e) => { setCurrentPlayer({ ...currentPlayer, name: e.target.value }) }} />
        <button className="home-action-btn" onClick={() => setIsCreateRoomModal(true)}>CREATE</button>
        <button className="home-action-btn" onClick={() => setIsJoinRoomModal(true)}>JOIN</button>
      </div>
      <Modal classNames={{
        modal: 'room-modal',
      }} center showCloseIcon={false} blockScroll container={MainRef.current} open={isCreateRoomModal} onClose={() => setIsCreateRoomModal(false)} aria-labelledby="create-room-modal"
        aria-describedby="create-room-modal">
        <div className="room-modal-container">
          <p>Please choose</p>
          <label className="switch">
            <input type="checkbox" checked={isPlayingAsCross} onChange={() => setIsPlayingAsCross(!isPlayingAsCross)} />
            <span className="slider round"></span>
          </label>
          {/* <input className="home-action-choose-playing-as" type="checkbox" checked></input> */}
          <button className="room-join-btn" onClick={createRoom}>JOIN</button>
        </div>
      </Modal>
      <Modal classNames={{
        modal: 'room-modal',
      }} center showCloseIcon={false} blockScroll container={MainRef.current} open={isJoinRoomModal} onClose={() => setIsJoinRoomModal(false)} aria-labelledby="join-room-modal"
        aria-describedby="join-room-modal">
        <div className="room-modal-container">
          <input type="text" className="room-join-btn join-room-roomid-input" placeholder="Enter Room ID" onChange={(e) => setRoomId(e.target.value)} />
          <button className="room-join-btn" onClick={joinRoom}>JOIN</button>
        </div>
      </Modal>
    </main >
  }
  if (currentPlayer && gameStatus === "ROOM_FULL_INVALID") {
    return <main className="invalid-page">
      <p>Room is either full or something went wrong !!!</p>
      <p>Refresh your page</p>
    </main>
  }
  if (currentPlayer && gameStatus === "WAITING" && roomId) {
    return <main className="waiting-page">
      <div className="waiting-lable">
        <p>Waiting for your friend!!</p>
        <p>ROOM ID : {roomId}</p>
      </div>
      <button className="leave-room-btn" onClick={() => leaveRoom(roomId)}>LEAVE ROOM</button>
    </main>
  }
  return (
    <main className="game-page">
      <div className="game-page-top">
        <p className="game-my-playingAs">You are {currentPlayer.playingAs}</p>
        <div className="players-name">
          <div className={currentTurn === currentPlayer.socketId ? "name current-turn" : "name"}>{currentPlayer.name}</div>
          <div className={currentTurn === opponentPlayer.socketId ? "name current-turn" : "name"}>{opponentPlayer.name}</div>
        </div>
      </div>
      <div className="game">
        {board.map((rowArr: number[], rowId) =>
          <div key={rowId} className="game-row">
            {rowArr.map((e: number, colId) => {
              return <div className="game-box" onClick={() => handelClick(rowId, colId, e)} key={colId} >{e === 0 ? <Cross /> : e === 1 ? <Circle /> : ""}</div >
            })}
          </div>
        )}
      </div>
      <div className="game-page-bottom">
        {finishedState === 0 ? <h2 className="game-msg">CROSS WON</h2> : finishedState === 1 ? <h2 className="game-msg">CIRCLE won</h2> : finishedState === 2 ? <h2 className="game-msg">Match is draw</h2> : null}
        {finishedState !== -1 ? <button className="play-again-btn" onClick={playAgain}>PLAY AGAIN</button> : null}
        {roomId && <button className="leave-room-btn" onClick={() => leaveRoom(roomId)}>LEAVE ROOM</button>}
        <p className="game-roomid">ROOM ID : {roomId}</p>
      </div>
    </main>
  )
}

export default App