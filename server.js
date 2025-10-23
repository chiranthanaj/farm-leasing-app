import express from "express";
import cors from "cors";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";

const app = express();
const upload = multer({ storage: multer.memoryStorage() }); // no temp files

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Cloudinary config
cloudinary.config({
  cloud_name: "dp5br2uug",
  api_key: "786482751155221",
  api_secret: "lDqOIxijkgS1OCK8n69M84dh7l8",
});

// Upload endpoint
app.post("/upload-cloudinary", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const result = await cloudinary.uploader.upload_stream(
      { folder: "farm_app", resource_type: "auto" },
      (error, result) => {
        if (error) return res.status(500).json({ error: error.message });
        res.json({
          secure_url: result.secure_url,
          public_id: result.public_id,
          resource_type: result.resource_type,
        });
      }
    );

    result.end(req.file.buffer); // send the uploaded file buffer to Cloudinary
  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).json({ error: "Failed to upload file" });
  }
});

// Delete endpoint
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
app.listen(PORT, () => console.log(`✅ Server running on Render at port ${PORT}`));
