require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");

const apiRoutes = require("./routes/api");

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "5mb" }));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "..", "..", "frontend", "public")));
app.use("/api", apiRoutes);

app.get("/", (req, res) => {
  res.sendFile(
    path.join(__dirname, "..", "..", "frontend", "public", "pages", "login.html")
  );
});

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err);
  res.status(500).json({
    error: "Server error",
    details: err.message,
  });
});

module.exports = app;
