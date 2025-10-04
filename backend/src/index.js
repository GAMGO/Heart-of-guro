import express from "express";
import cors from "cors";
import mongoose from "mongoose";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

mongoose.connect("mongodb://localhost:27017/Buzz-Joe")
  .then(() => console.log("MongoDB connected successfully"))
  .catch(err => console.error("MongoDB connection failed:", err));

app.get("/api/status", (req, res) => {
  res.json({ 
    success: true, 
    message: "Server is running",
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});