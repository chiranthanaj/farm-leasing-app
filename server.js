// server.js
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import axios from "axios";
import FormData from "form-data";
import path from "path";

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// === Filestack config ===
// Keep your Filestack API key private. You provided it as:
// A54XqHKu1TjCtCl3rTWhpz
// It's better to store it in an environment variable: process.env.FILESTACK_API_KEY
const FILESTACK_API_KEY = process.env.FILESTACK_API_KEY || "A54XqHKu1TjCtCl3rTWhpz";
const FILESTACK_UPLOAD_URL = `https://www.filestackapi.com/api/file?key=${FILESTACK_API_KEY}`;

// --- Upload route (keeps same endpoint name and response shape as Cloudinary version) ---
app.post("/upload-cloudinary", upload.array("files"), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.json([]);

    const results = [];

    for (const file of req.files) {
      // Build multipart form with the file stream
      const form = new FormData();
      const fileStream = fs.createReadStream(file.path);

      // Append file as 'file' field (Filestack accepts the file as multipart/form-data)
      form.append("file", fileStream, {
        filename: file.originalname || path.basename(file.path),
        contentType: file.mimetype || "application/octet-stream",
      });

      // Optional: tell Filestack what filename to store as
      form.append("filename", file.originalname || path.basename(file.path));

      // Post to Filestack
      const headers = form.getHeaders();
      const response = await axios.post(FILESTACK_UPLOAD_URL, form, {
        headers,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        // timeout: 300000
      });

      // Remove temp file
      try {
        fs.unlinkSync(file.path);
      } catch (e) {
        console.warn("Warning: failed to delete temp file", file.path, e.message);
      }

      // Filestack returns JSON with a file handle and url(s). Typical fields:
      // handle -> unique file handle (like "3AB23..."), url -> full URL, filename etc.
      const data = response.data || {};

      // Map Filestack response to the previous Cloudinary response shape used by the frontend:
      // { secure_url, public_id, resource_type }
      const secure_url = data.url || (data && data.handle ? `https://cdn.filestackcontent.com/${data.handle}` : null);
      const public_id = data.handle || data.file ? data.handle : null;
      const resource_type = data.mimetype || "file";

      results.push({
        secure_url,
        public_id,
        resource_type,
        // also include raw filestack response for debugging if you want
        filestack_raw: data,
      });
    }

    return res.json(results);
  } catch (err) {
    console.error("Upload to Filestack error:", err.response?.data || err.message || err);
    return res.status(500).json({ error: "Upload failed", details: err.response?.data || err.message });
  }
});

// --- Delete route (keeps same endpoint name) ---
// Expects :publicId (we'll treat it as the Filestack handle)
app.delete("/delete-cloudinary/:publicId", async (req, res) => {
  try {
    const { publicId } = req.params;
    // resource_type param is ignored for Filestack; kept only to preserve existing calls
    // Example delete URL: DELETE https://www.filestackapi.com/api/file/{handle}?key={APIKEY}
    if (!publicId) return res.status(400).json({ error: "Missing publicId" });

    const deleteUrl = `https://www.filestackapi.com/api/file/${encodeURIComponent(publicId)}?key=${FILESTACK_API_KEY}`;

    const response = await axios.delete(deleteUrl);

    // Filestack typically returns a success status. To remain compatible with previous logic:
    // We'll respond with { success: true } when filestack reports success.
    if (response.status === 200) {
      return res.json({ success: true, filestack: response.data });
    } else {
      console.warn("Filestack delete returned non-200", response.status, response.data);
      return res.status(500).json({ error: "Failed to delete file", details: response.data });
    }
  } catch (err) {
    console.error("❌ Delete error:", err.response?.data || err.message || err);
    return res.status(500).json({ error: "Failed to delete file", details: err.response?.data || err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
