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

// Track users: socketId -> { name, socket }
const users = new Map();
let adminSocket = null;

io.on("connection", (socket) => {
  socket.on("register-admin", () => {
    adminSocket = socket;
    // Send current user list to admin
    const userList = [];
    for (const [id, u] of users) {
      userList.push({ id, name: u.name });
    }
    socket.emit("user-list", userList);
  });

  socket.on("register-chat", (name) => {
    users.set(socket.id, { name, socket });
    if (adminSocket) {
      adminSocket.emit("user-joined", { id: socket.id, name });
    }
  });

  // User sends a message
  socket.on("user-message", (msg) => {
    const user = users.get(socket.id);
    if (user && adminSocket) {
      adminSocket.emit("user-message", {
        userId: socket.id,
        name: user.name,
        text: msg,
      });
    }
  });

  // Admin replies to a specific user
  socket.on("admin-reply", ({ userId, text }) => {
    const user = users.get(userId);
    if (user) {
      user.socket.emit("ai-response", text);
    }
  });

  // Typing indicators per user
  socket.on("admin-typing", (userId) => {
    const user = users.get(userId);
    if (user) user.socket.emit("ai-typing");
  });

  socket.on("admin-stop-typing", (userId) => {
    const user = users.get(userId);
    if (user) user.socket.emit("ai-stop-typing");
  });

  socket.on("disconnect", () => {
    if (socket === adminSocket) {
      adminSocket = null;
    }
    if (users.has(socket.id)) {
      const name = users.get(socket.id).name;
      users.delete(socket.id);
      if (adminSocket) {
        adminSocket.emit("user-left", { id: socket.id, name });
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
