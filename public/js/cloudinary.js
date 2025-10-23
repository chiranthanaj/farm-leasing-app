// Frontend Cloudinary helper
const BACKEND_URL = "https://farm-leasing-app.onrender.com"; // Render live backend

/**
 * Uploads any file (image, PDF, CSV, Word, etc.) to the backend Cloudinary endpoint.
 * Returns { secure_url, public_id, resource_type }
 */
export async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);

  try {
    console.log("📤 Uploading file to backend...");
    const res = await fetch(`${BACKEND_URL}/upload-cloudinary`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error("Upload failed: " + text);
    }

    const data = await res.json();
    return {
      secure_url: data.secure_url,
      public_id: data.public_id,
      resource_type: data.resource_type,
    };
  } catch (err) {
    console.error("❌ Cloudinary upload error:", err);
    throw err;
  }
}

/**
 * Deletes a file from Cloudinary using the backend.
 * @param {string} publicId Cloudinary public_id
 * @param {string} resourceType image, raw, video, etc.
 */
export async function deleteFromCloudinary(publicId, resourceType = "auto") {
  try {
    const res = await fetch(
      `${BACKEND_URL}/delete-cloudinary/${publicId}?resource_type=${resourceType}`,
      { method: "DELETE" }
    );

    const data = await res.json();
    if (!res.ok || !data.success) throw new Error("Delete failed: " + JSON.stringify(data));

    return true;
  } catch (err) {
    console.error("❌ Delete error:", err);
    throw err;
  }
}
