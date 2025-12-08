// backend/src/app.js
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");

// Load Combined API Routes
const apiRoutes = require("./routes/api");

const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: "5mb" }));
app.use(bodyParser.urlencoded({ extended: true }));

// 🟢 SERVE FRONTEND
app.use(express.static(path.join(__dirname, "..", "..", "frontend", "public")));

// 🟢 All API routes (including vendors) come from api.js
app.use("/api", apiRoutes);

// 🟢 Default route → login page
app.get("/", (req, res) => {
  res.sendFile(
    path.join(__dirname, "..", "..", "frontend", "public", "pages", "login.html")
  );
});

// Health check
app.get("/api/health", (req, res) => res.json({ ok: true }));

// Error handler
app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err);
  res.status(500).json({
    error: "Server error",
    details: err.message,
  });
});

module.exports = app;
