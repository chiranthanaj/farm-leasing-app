// backend URL (where server.js is running)
const BACKEND_URL = "http://localhost:5000"; // replace with deployed Render URL in production

/**
 * Uploads a file (image or document) to Cloudinary via backend
 */
export async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch(`${BACKEND_URL}/upload-cloudinary`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");

    return {
      secure_url: data.secure_url,
      public_id: data.public_id,
    };
  } catch (err) {
    console.error("❌ Upload error:", err);
    throw err;
  }
}

/**
 * Deletes a file from Cloudinary via backend
 */
export async function deleteFromCloudinary(publicId) {
  try {
    const res = await fetch(`${BACKEND_URL}/delete-cloudinary/${publicId}`, {
      method: "DELETE",
    });

    const data = await res.json();
    if (!res.ok || !data.success) throw new Error("Delete failed");

    return true;
  } catch (err) {
    console.error("❌ Delete error:", err);
    throw err;
  }
}
