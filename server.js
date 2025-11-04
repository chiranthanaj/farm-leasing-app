// ===============================
// server.js — Filestack Integrated Upload Backend
// ===============================

import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import axios from "axios";
import FormData from "form-data";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ======== Filestack Configuration ========
const FILESTACK_API_KEY = process.env.FILESTACK_API_KEY || "A54XqHKu1TjCtCl3rTWhpz";
const FILESTACK_UPLOAD_URL = `https://www.filestackapi.com/api/file?key=${FILESTACK_API_KEY}`;

// =================================================
// ROUTE: Upload File (Image or Document)
// =================================================
app.post("/upload-cloudinary", upload.single("files"), async (req, res) => {
  try {
    if (!req.file) return res.json([]);

    const file = req.file;
    const form = new FormData();

    const fileStream = fs.createReadStream(file.path);
    form.append("file", fileStream, {
      filename: file.originalname || path.basename(file.path),
      contentType: file.mimetype || "application/octet-stream",
    });

    const response = await axios.post(FILESTACK_UPLOAD_URL, form, {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    // Delete temp file after upload
    try {
      fs.unlinkSync(file.path);
    } catch (err) {
      console.warn("⚠️ Warning: Failed to delete temp file:", file.path);
    }

    const data = response.data || {};
    const secure_url =
      data.url || (data.handle ? `https://cdn.filestackcontent.com/${data.handle}` : null);
    const public_id = data.handle || null;
    const resource_type = data.mimetype || "file";

    if (!secure_url) {
      console.error("❌ Invalid Filestack response:", data);
      return res.status(500).json({ error: "No secure URL returned from Filestack" });
    }

    console.log("✅ Uploaded to Filestack:", secure_url);

    return res.json([
      {
        secure_url,
        public_id,
        resource_type,
      },
    ]);
  } catch (err) {
    console.error("❌ Upload to Filestack error:", err.response?.data || err.message);
    return res.status(500).json({
      error: "Upload failed",
      details: err.response?.data || err.message,
    });
  }
});

// =================================================
// ROUTE: Delete File from Filestack
// =================================================
app.delete("/delete-cloudinary/:publicId", async (req, res) => {
  try {
    const { publicId } = req.params;
    if (!publicId) return res.status(400).json({ error: "Missing publicId" });

    const deleteUrl = `https://www.filestackapi.com/api/file/${encodeURIComponent(
      publicId
    )}?key=${FILESTACK_API_KEY}`;

    const response = await axios.delete(deleteUrl);

    if (response.status === 200) {
      console.log("🗑️ Deleted file from Filestack:", publicId);
      return res.json({ success: true });
    } else {
      console.warn("⚠️ Filestack delete returned non-200:", response.status);
      return res.status(500).json({ error: "Failed to delete file" });
    }
  } catch (err) {
    console.error("❌ Delete error:", err.response?.data || err.message);
    return res.status(500).json({
      error: "Failed to delete file",
      details: err.response?.data || err.message,
    });
  }
});

// =================================================
// START SERVER
// =================================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
