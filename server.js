const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "chat.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

let adminSocket = null;
let chatSockets = new Set();

io.on("connection", (socket) => {
  socket.on("register-admin", () => {
    adminSocket = socket;
    console.log("Admin connected");
    socket.emit("status", "You are now the operator.");
  });

  socket.on("register-chat", () => {
    chatSockets.add(socket);
    console.log("A victim connected");
    if (adminSocket) {
      adminSocket.emit("victim-joined", chatSockets.size);
    }
  });

  // Friend sends a question
  socket.on("user-message", (msg) => {
    if (adminSocket) {
      adminSocket.emit("user-message", msg);
    }
  });

  // Admin sends a reply — relay to ALL chat users
  socket.on("admin-reply", (msg) => {
    for (const s of chatSockets) {
      s.emit("ai-response", msg);
    }
  });

  // Admin signals "typing" indicator
  socket.on("admin-typing", () => {
    for (const s of chatSockets) {
      s.emit("ai-typing");
    }
  });

  socket.on("admin-stop-typing", () => {
    for (const s of chatSockets) {
      s.emit("ai-stop-typing");
    }
  });

  socket.on("disconnect", () => {
    if (socket === adminSocket) {
      adminSocket = null;
      console.log("Admin disconnected");
    }
    chatSockets.delete(socket);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
