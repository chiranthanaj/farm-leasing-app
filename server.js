import express from "express";
import cors from "cors";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";

const app = express();
const upload = multer({ dest: "uploads/" }); // temporary file store

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// --- Cloudinary config ---
cloudinary.config({
  cloud_name: "dp5br2uug",
  api_key: "358437331856298",      // replace with your actual API key
  api_secret: "SQHZloOPtUq-3IBsBoSvXcXjOTY" // replace with your actual API secret
});

// --- Upload route ---
// This route is NOT used by the provided frontend code (app.js) which uses unsigned direct uploads.
// It is kept here as an example of a signed backend upload.
app.post("/upload-cloudinary", upload.single("file"), async (req, res) => {
  try {
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
    res.status(500).json({ error: "Failed to upload file" });
  }
});

// --- Delete route (by public_id) ---
// Note: The frontend (cloudinary.js) calls this route with the publicId in the URL path: /delete-cloudinary/:publicId
// We will adjust the route definition to match.
app.delete("/delete-cloudinary/:publicId", async (req, res) => {
  try {
    const { publicId } = req.params; // Get publicId from URL parameters
    
    if (!publicId) return res.status(400).json({ success: false, error: "Missing publicId in URL" });

    // Note: The `resource_type` might be needed if not automatically detected, 
    // but for assets uploaded with resource_type: "auto", the default deletion should work.
    const result = await cloudinary.uploader.destroy(publicId);
    
    // Cloudinary returns { result: 'ok' } on success, or { result: 'not found' } if the asset doesn't exist
    if (result.result !== "ok") {
        // Log "not found" but still report success to the frontend if the asset is already gone
        if (result.result === "not found") {
            console.warn(`⚠️ Asset with public ID ${publicId} not found on Cloudinary (already deleted or wrong ID).`);
        } else {
            throw new Error(result.result);
        }
    }

    res.json({ success: true, message: `Asset ${publicId} deleted successfully.` });
  } catch (err) {
    console.error("❌ Delete error:", err);
    res.status(500).json({ success: false, error: "Failed to delete file: " + err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`✅ Server running on http://localhost:${PORT}`)
);