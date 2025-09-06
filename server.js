import express from "express";
import cloudinary from "cloudinary";
import cors from "cors";

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cors()); // allow frontend to call API

// Cloudinary config
cloudinary.v2.config({
  cloud_name: "dp5br2uug",
  api_key: "358437331856298",
  api_secret: "SQHZloOPtUq-3IBsBoSvXcXjOTY"
});

// Upload endpoint (signed upload)
app.post("/upload-cloudinary", async (req, res) => {
  try {
    const { file } = req.body; // base64 or remote URL
    if (!file) return res.status(400).json({ error: "No file provided" });

    const result = await cloudinary.v2.uploader.upload(file, {
      resource_type: "auto",
      folder: "farm_app"
    });

    // Only return what we actually need
    res.json({
      secure_url: result.secure_url,
      public_id: result.public_id
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// Delete endpoint
app.post("/delete-cloudinary", async (req, res) => {
  const { publicId } = req.body;
  if (!publicId) return res.status(400).json({ error: "Missing publicId" });

  try {
    const result = await cloudinary.v2.uploader.destroy(publicId, {
      resource_type: "auto"
    });

    if (result.result === "ok" || result.result === "not found") {
      return res.json({ success: true });
    } else {
      return res.status(500).json({ error: "Cloudinary delete failed", details: result });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete file" });
  }
});

// Serve static files
app.use(express.static("public"));
app.get("*", (req, res) => {
  res.sendFile("index.html", { root: "public" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));