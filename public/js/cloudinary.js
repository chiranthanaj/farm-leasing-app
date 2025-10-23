const BACKEND_URL = "https://farm-leasing-app.onrender.com"; // Render backend

/**
 * Upload multiple files (images, PDFs, docs, etc.)
 * Returns array of { secure_url, public_id, resource_type }
 */
export async function uploadToCloudinary(files) {
  const formData = new FormData();
  files.forEach(file => formData.append("files", file));

  try {
    const res = await fetch(`${BACKEND_URL}/upload-cloudinary`, {
      method: "POST",
      body: formData
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error("Upload failed: " + errorText);
    }

    return await res.json();
  } catch (err) {
    console.error("❌ Cloudinary upload error:", err);
    throw err;
  }
}

/**
 * Delete a file from Cloudinary
 */
export async function deleteFromCloudinary(publicId, resourceType = "auto") {
  try {
    const res = await fetch(`${BACKEND_URL}/delete-cloudinary/${publicId}?resource_type=${resourceType}`, {
      method: "DELETE"
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error("Delete failed: " + JSON.stringify(data));
    }

    return true;
  } catch (err) {
    console.error("❌ Delete error:", err);
    throw err;
  }
}
