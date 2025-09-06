// js/cloudinary.js
const BASE_URL = "https://farm-leasing-app.onrender.com"; // <-- your deployed backend URL

// Upload via backend
async function uploadToCloudinary(file) {
  try {
    console.log("📤 Uploading file to backend Cloudinary endpoint...");

    // Convert file to Base64
    const reader = new FileReader();
    const base64Promise = new Promise((resolve, reject) => {
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
    });
    reader.readAsDataURL(file);
    const fileBase64 = await base64Promise;

    const response = await fetch(`${BASE_URL}/upload-cloudinary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file: fileBase64 })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Upload failed: ${text}`);
    }

    const data = await response.json();
    console.log("📦 Upload response:", data);
    return data;
  } catch (err) {
    console.error("❌ Upload error:", err);
    throw err;
  }
}

// Delete via backend
async function deleteFromCloudinary(publicId) {
  try {
    console.log("🗑 Deleting file with publicId:", publicId);

    const response = await fetch(`${BASE_URL}/delete-cloudinary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicId })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Delete failed: ${text}`);
    }

    const data = await response.json();
    console.log("🗑 Delete response:", data);
    return data;
  } catch (err) {
    console.error("❌ Delete error:", err);
    throw err;
  }
}
