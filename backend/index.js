const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const path = require("path"); // ✅ Correctly importing 'path' for CommonJS

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const rooms = new Map();

io.on("connection", (socket) => {
  console.log(`🔵 A new client connected: ${socket.id}`);

  let currentRoom = null;
  let currentUser = null;

  // Handle joining a room
  socket.on("join", ({ roomId, userName }) => {
    if (!roomId || !userName) return;

    // Leave previous room if exists
    if (currentRoom) {
      socket.leave(currentRoom);
      rooms.get(currentRoom)?.delete(currentUser);
      io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom) || []));
    }

    currentRoom = roomId;
    currentUser = userName;
    socket.join(roomId);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    rooms.get(roomId).add(userName);

    console.log(`✅ User ${userName} joined room ${roomId}`);

    io.to(roomId).emit("userJoined", Array.from(rooms.get(roomId)));
  });

  // Handle code change event
  socket.on("codeChange", ({ roomId, code }) => {
    if (!roomId) return;
    io.to(roomId).emit("codeUpdate", code);
  });

  // Handle language change event
  socket.on("languageChange", ({ roomId, language }) => {
    if (!roomId) return;
    io.to(roomId).emit("languageUpdate", language);
  });

  // Handle typing indicator
  socket.on("typing", ({ roomId, userName }) => {
    if (!roomId) return;
    io.to(roomId).emit("userTyping", userName);
  });

  // ✅ New: Handle stop typing event
  socket.on("stopTyping", ({ roomId }) => {
    if (!roomId) return;
    io.to(roomId).emit("userTyping", ""); // Clears the typing indicator
  });

  // Handle user leaving the room
  socket.on("leaveRoom", () => {
    if (currentRoom) {
      rooms.get(currentRoom)?.delete(currentUser);
      io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom) || []));
    }
    socket.leave(currentRoom);
  });

  // Handle user disconnecting
  socket.on("disconnect", () => {
    if (currentRoom) {
      rooms.get(currentRoom)?.delete(currentUser);
      io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom) || []));
    }
    console.log(`🔴 Client ${socket.id} disconnected`);
  });
});

// ✅ Serve frontend files from the correct path
app.use(express.static(path.join(__dirname, "frontened", "real-time", "dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "frontened", "real-time", "dist", "index.html"));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
