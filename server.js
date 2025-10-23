import express from "express";
import cors from "cors";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

const app = express();
const upload = multer({ dest: "uploads/" }); // temporary storage

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// --- Cloudinary config ---
cloudinary.config({
  cloud_name: "dp5br2uug",
  api_key: "786482751155221",
  api_secret: "lDqOIxijkgS1OCK8n69M84dh7l8"
});

// --- Upload route ---
app.post("/upload-cloudinary", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: "auto",
      folder: "farm_app"
    });

    fs.unlinkSync(req.file.path); // remove temp file

    res.json({ secure_url: result.secure_url, public_id: result.public_id });
  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).json({ error: "Failed to upload file" });
  }
});

// --- Delete route ---
app.delete("/delete-cloudinary", async (req, res) => {
  try {
    const { publicId } = req.body; // get from JSON body
    if (!publicId) return res.status(400).json({ error: "Missing publicId" });

    const result = await cloudinary.uploader.destroy(publicId);
    if (result.result !== "ok") throw new Error(result.result);

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Delete error:", err);
    res.status(500).json({ error: "Failed to delete file" });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
