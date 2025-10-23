import express from "express";
import cors from "cors";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";

const app = express();
const upload = multer({ dest: "uploads/" }); // temporary file storage

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// --- Cloudinary config ---
cloudinary.config({
  cloud_name: "dp5br2uug",
  api_key: "YOUR_API_KEY",     // replace with your key
  api_secret: "YOUR_API_SECRET" // replace with your secret
});

// --- Upload route ---
app.post("/upload-cloudinary", upload.single("file"), async (req, res) => {
  try {
    const filePath = req.file.path;

    const result = await cloudinary.uploader.upload(filePath, {
      folder: "farm_app",
      resource_type: "auto" // important for non-image files
    });

    res.json({
      secure_url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type
    });
  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).json({ error: "Failed to upload file" });
  }
});

// --- Delete route ---
app.delete("/delete-cloudinary/:publicId", async (req, res) => {
  try {
    const { publicId } = req.params;
    const resourceType = req.query.resource_type || "auto";

    if (!publicId) return res.status(400).json({ error: "Missing publicId" });

    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });

    if (result.result !== "ok" && result.result !== "not found") {
      throw new Error(result.result);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Delete error:", err);
    res.status(500).json({ error: "Failed to delete file", details: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`✅ Server running on http://localhost:${PORT}`)
);
