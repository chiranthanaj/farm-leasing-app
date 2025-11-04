// ===============================
// server.js — Final Filestack Integration (Render Compatible)
// ===============================

import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import axios from "axios";
import FormData from "form-data";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url"; // ✅ only once here!

dotenv.config();

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ======== Filestack Configuration ========
const FILESTACK_API_KEY =
  process.env.FILESTACK_API_KEY || "A54XqHKu1TjCtCl3rTWhpz";
const FILESTACK_UPLOAD_URL = `https://www.filestackapi.com/api/store/S3?key=${FILESTACK_API_KEY}`;

// =================================================
// ✅ ROUTE: Upload File
// =================================================
app.post("/upload-filestack", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      console.error("❌ No file received!");
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = req.file;
    console.log("✅ File received:", file.originalname);

    const form = new FormData();
    const fileStream = fs.createReadStream(file.path);
    form.append("fileUpload", fileStream, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    const headers = form.getHeaders();

    const response = await axios.post(FILESTACK_UPLOAD_URL, form, {
      headers,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    // 🧹 Delete temp file
    fs.unlink(file.path, (err) => {
      if (err) console.warn("⚠️ Failed to delete temp file:", err);
    });

    const data = response.data || {};
    const secure_url =
      data.url ||
      (data.handle
        ? `https://cdn.filestackcontent.com/${data.handle}`
        : null);
    const public_id = data.handle || null;
    const resource_type = data.mimetype || "file";

    if (!secure_url) {
      console.error("❌ Filestack returned no URL:", data);
      return res.status(500).json({ error: "No URL from Filestack", data });
    }

    console.log("✅ Uploaded to Filestack:", secure_url);
    return res.json([{ secure_url, public_id, resource_type }]);
  } catch (err) {
    console.error("❌ Upload error:", err.response?.data || err.message);
    return res.status(500).json({ error: "Upload failed", details: err.message });
  }
});

// =================================================
// ✅ ROUTE: Delete File
// =================================================
app.delete("/delete-filestack/:publicId", async (req, res) => {
  try {
    const { publicId } = req.params;
    if (!publicId) return res.status(400).json({ error: "Missing publicId" });

    const deleteUrl = `https://www.filestackapi.com/api/file/${encodeURIComponent(
      publicId
    )}?key=${FILESTACK_API_KEY}`;

    const response = await axios.delete(deleteUrl);

    if (response.status === 200) {
      console.log("🗑️ Deleted:", publicId);
      return res.json({ success: true });
    }

    return res.status(500).json({ error: "Failed to delete file" });
  } catch (err) {
    console.error("❌ Delete error:", err.response?.data || err.message);
    return res.status(500).json({ error: "Delete failed", details: err.message });
  }
});

// =================================================
// ✅ STATIC FRONTEND HOSTING (Express 5 Compatible)
// =================================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static frontend from /public
app.use(express.static(path.join(__dirname, "public")));

// ✅ Express 5 wildcard fix: use regex instead of "*"
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// =================================================
// ✅ START SERVER
// =================================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`✅ Server running and serving frontend on port ${PORT}`)
);
