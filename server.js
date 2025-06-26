const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const cron = require("node-cron");
const connectDB = require("./config/db");
const deleteOldFiles = require("./initialService/deleteOldFiles");
const createAdmin = require("./initialService/createAdmin");

const app = express();

const http = require("http");
const socketIO = require("socket.io");

const server = http.createServer(app);

// Set the timeout to 5 minutes (300000 milliseconds)
server.setTimeout(600000); // Adjust the timeout value as needed

const io = socketIO(server);

app.use(cors());

// Increase the limit to handle larger request bodies (e.g., file uploads)
app.use(bodyParser.json({ limit: "2000mb" }));
app.use(bodyParser.urlencoded({ limit: "2000mb", extended: true }));

// Parse JSON bodies
app.use(bodyParser.json());

// Connect Database
connectDB();

app.get("/", (req, res) => {
  res.send("API running");
});

// Define Routes
app.use("/api/users", require("./routes/api/users"));
app.use("/api/admin", require("./routes/api/admin"));
app.use("/api/auth", require("./routes/api/auth"));
app.use("/api/profile", require("./routes/api/profile"));
app.use("/api/posts", require("./routes/api/posts"));
app.use("/api/pdf", require("./routes/api/pdf"));
app.use("/api/comment", require("./routes/api/comment"));

// Serve files from the 'uploads' directory

// Expose a route to serve the PDF file
app.get("/uploads/:filename", (req, res) => {
  const filename = req.params.filename;
  res.sendFile(path.join(__dirname, "uploads", filename));
});
app.get("/blog/:filename", (req, res) => {
  const filename = req.params.filename;
  res.sendFile(path.join(__dirname, "blog", filename));
});
app.get("/img/:filename", (req, res) => {
  const filename = req.params.filename;
  res.sendFile(path.join(__dirname, "uploads", filename));
});

// Schedule the deletion task to run every hour
cron.schedule("0 * * * *", () => {
  deleteOldFiles();
});

// Serve static files from the 'dist' directory
//app.use(express.static(path.join(__dirname, "dist")));

// Handle any routes by serving the 'index.html' file
//app.get("*", (req, res) => {
//  res.sendFile(path.join(__dirname, "dist", "index.html"));
//});

// Example: Run the task immediately on server start (optional)
deleteOldFiles();

//create admin on server start
createAdmin();

let clientsData = [];

let socketss = [];
io.on("connection", (socket) => {
  socketss.push(socket);
  // Add client data when a client connects
  const item = clientsData.filter((data) => data.socketId == socket.id);
  if (item.length == 0) {
    clientsData.push({ socketId: socket.id, data: null });
  }
  socket.on("disconnect", () => {
    console.log("Client disconnected");
    // Remove client data when a client disconnects
    clientsData = clientsData.filter((data) => data.socketId != socket.id);
    socketss = socketss.filter((data) => data.id != socket.id);
  });
});
app.get("/api/client_data", async (req, res) => {
  await getClientsData(clientsData, socketss).then((clientsData) => {
    return res.json(clientsData);
  });
});
function getClientsData(clientsData, socketss) {
  return new Promise(async (resolve, reject) => {
    await clientsData.forEach((client) => {
      io.to(client.socketId).emit("requestData", {
        /* request data */
      });
    });
    await socketss.forEach(async (socket, index) => {
      await socket.on("clientData", (data) => {
        if (data) {
          clientsData[index].data = data;
        }
        if (index == clientsData.length - 1) {
          resolve(clientsData);
        }
      });
    });
  });
}

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => console.log(`Server started on port ${PORT}`));
