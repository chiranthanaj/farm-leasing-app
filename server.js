import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";

const app = express();
const upload = multer({ dest: "uploads/" }); // temp storage

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// --- Cloudinary config ---
cloudinary.config({
  cloud_name: "dp5br2uug",
  api_key: "358437331856298",
  api_secret: "SQHZloOPtUq-3IBsBoSvXcXjOTY"
});

// --- Upload route for multiple files ---
app.post("/upload-cloudinary", upload.array("files"), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ error: "No file uploaded" });

    const uploadResults = [];

    for (const file of req.files) {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: "farm_app",
        resource_type: "auto"
      });

      uploadResults.push({
        secure_url: result.secure_url,
        public_id: result.public_id,
        resource_type: result.resource_type
      });

      // Delete temp file after upload
      fs.unlinkSync(file.path);
    }

    res.json(uploadResults);
  } catch (err) {
    console.error("❌ Upload error:", err);
    // Cleanup temp files if upload fails
    if (req.files) req.files.forEach(f => fs.existsSync(f.path) && fs.unlinkSync(f.path));
    res.status(500).json({ error: "Failed to upload file", details: err.message });
  }
});

// --- Delete route ---
app.delete("/delete-cloudinary/:publicId", async (req, res) => {
  try {
    const { publicId } = req.params;
    const resourceType = req.query.resource_type || "auto";

    if (!publicId) return res.status(400).json({ error: "Missing publicId" });

    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });

    if (result.result !== "ok" && result.result !== "not found") throw new Error(result.result);

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Delete error:", err);
    res.status(500).json({ error: "Failed to delete file", details: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
