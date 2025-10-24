import express from "express";
import cors from "cors";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// --- Cloudinary config ---
cloudinary.config({
  cloud_name: "dp5br2uug",
  api_key: "358437331856298",
  api_secret: "SQHZloOPtUq-3IBsBoSvXcXjOTY"
});

// --- Upload route ---
app.post("/upload-cloudinary", upload.array("files"), async (req, res) => {
  try {
    const files = req.files || [];

    if (files.length === 0) {
      // No files uploaded, return empty array
      return res.json([]);
    }

    const uploadPromises = files.map(file =>
      cloudinary.uploader.upload(file.path, {
        folder: "farm_app",
        resource_type: "auto"
      }).finally(() => fs.unlink(file.path, () => {})) // delete temp file
    );

    const results = await Promise.all(uploadPromises);

    res.json(results.map(r => ({
      secure_url: r.secure_url,
      public_id: r.public_id,
      resource_type: r.resource_type
    })));
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
