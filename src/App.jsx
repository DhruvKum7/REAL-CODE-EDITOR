import { useEffect, useState } from "react";
import "./App.css";
import io from "socket.io-client";
import Editor from "@monaco-editor/react";

const socket = io("http://localhost:5000");

const App = () => {
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("// Start coding here...");
  const [copySuccess, setCopySuccess] = useState("");
  const [users, setUsers] = useState([]);
  const [typing, setTyping] = useState("");

  useEffect(() => {
    socket.on("userJoined", (usersList) => {
      console.log("Users in room:", usersList);
      setUsers(usersList);
    });

    socket.on("codeUpdate", (newCode) => {
      setCode((prevCode) => (prevCode !== newCode ? newCode : prevCode));
    });

    socket.on("userTyping", (user) => {
      setTyping(`${user.slice(0, 8)}... is Typing`);
      setTimeout(() => setTyping(""), 2000);
    });

    socket.on("languageUpdate", (newLanguage) => {
      setLanguage((prevLang) => (prevLang !== newLanguage ? newLanguage : prevLang));
    });

    return () => {
      socket.off("userJoined");
      socket.off("codeUpdate");
      socket.off("userTyping");
      socket.off("languageUpdate");
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (roomId) socket.emit("leaveRoom", { roomId, userName });
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [roomId, userName]);

  const joinRoom = () => {
    if (!roomId.trim() || !userName.trim()) return;
    socket.emit("join", { roomId: roomId.trim(), userName: userName.trim() });
    setJoined(true);
  };

  const leaveRoom = () => {
    if (roomId) socket.emit("leaveRoom", { roomId, userName });
    setJoined(false);
    setRoomId("");
    setUserName("");
    setCode("// Start coding here...");
    setLanguage("javascript");
  };

  const copyRoomId = () => {
    if (!roomId.trim()) return;
    navigator.clipboard.writeText(roomId);
    setCopySuccess("Copied!");
    setTimeout(() => setCopySuccess(""), 2000);
  };

  useEffect(() => {
    if (!userName || !roomId) return;

    const timeout = setTimeout(() => {
      socket.emit("userTyping", userName);
    }, 1000); // Increased delay to reduce spam

    return () => clearTimeout(timeout);
  }, [code, userName, roomId]);

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    if (roomId) {
      socket.emit("codeChange", { roomId, code: newCode });
    }
  };

  const handleLanguageChange = (e) => {
    const newLanguage = e.target.value;
    setLanguage(newLanguage);
    if (roomId) {
      socket.emit("languageChange", { roomId, language: newLanguage });
    }
  };

  if (!joined) {
    return (
      <div className="join-container">
        <div className="join-form">
          <h1>Join Code Room</h1>
          <input type="text" placeholder="Room Id" value={roomId} onChange={(e) => setRoomId(e.target.value)} />
          <input type="text" placeholder="Your Name" value={userName} onChange={(e) => setUserName(e.target.value)} />
          <button onClick={joinRoom}>Join Room</button>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-container">
      <div className="sidebar">
        <div className="room-info">
          <h2>Code Room: {roomId}</h2>
          <button onClick={copyRoomId} className="copy-button">Copy Id</button>
          {copySuccess && <span className="copy-success">{copySuccess}</span>}
        </div>
        <h3>Users in Room:</h3>
        <ul>
          {users.map((user, index) => (
            <li key={index}>{user.slice(0, 8)}... {user === userName ? "(You)" : ""}</li>
          ))}
        </ul>
        <p className="typing-indicator">{typing}</p>
        <select className="language-selector" value={language} onChange={handleLanguageChange}>
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="java">Java</option>
          <option value="cpp">C++</option>
        </select>
        <button className="leave-button" onClick={leaveRoom}>Leave Room</button>
      </div>
      <div className="editor-wrapper">
        <Editor height="100%" language={language} value={code} onChange={handleCodeChange} theme="vs-dark" />
      </div>
    </div>
  );
};

export default App;
