import express from "express";
import cors from "cors";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";

const app = express();
const upload = multer({ dest: "uploads/" }); // temporary file store

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// --- Cloudinary config (Your confirmed credentials) ---
cloudinary.config({
  cloud_name: "dp5br2uug",
  api_key: "358437331856298",
  api_secret: "SQHZloOPtUq-3IBsBoSvXcXjOTY"
});

// --- Upload route (Signed Upload via Backend) ---
app.post("/upload-cloudinary", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file provided for upload." });
    }
    
    const filePath = req.file.path; // multer gives temp path
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: "auto",
      folder: "farm_app"
    });

    res.json({
      secure_url: result.secure_url,
      public_id: result.public_id
    });
  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).json({ success: false, error: "Failed to upload file to Cloudinary." });
  }
});

// --- Delete route (by public_id) ---
app.delete("/delete-cloudinary/:publicId", async (req, res) => {
  try {
    const { publicId } = req.params;
    
    if (!publicId) return res.status(400).json({ success: false, error: "Missing publicId in URL" });

    const result = await cloudinary.uploader.destroy(publicId);
    
    if (result.result !== "ok") {
        if (result.result === "not found") {
            console.warn(`⚠️ Asset with public ID ${publicId} not found on Cloudinary.`);
        } else {
            throw new Error(`Cloudinary destroy failed: ${result.result}`);
        }
    }

    res.json({ success: true, message: `Asset ${publicId} deleted successfully.` });
  } catch (err) {
    console.error("❌ Delete error:", err);
    res.status(500).json({ success: false, error: "Failed to delete file: " + err.message });
  }
});

const PORT = 5000; // 🎯 Set port to 5000 as confirmed by the user
app.listen(PORT, () =>
  console.log(`✅ Server running on http://localhost:${PORT}`)
);
