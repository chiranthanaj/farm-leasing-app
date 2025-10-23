const BACKEND_URL = "https://your-backend-url.onrender.com"; // deployed backend


/**
 * Uploads multiple files (images, docs, etc.) to backend.
 * Accepts array of File objects.
 * Returns array of {secure_url, public_id, resource_type}.
 */
export async function uploadToCloudinary(files) {
  const formData = new FormData();
  files.forEach(file => formData.append("files", file)); // backend expects "files" array

  try {
    const res = await fetch(`${BACKEND_URL}/upload-cloudinary`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error("Upload failed: " + errorText);
    }

    const data = await res.json();
    return data; // always an array
  } catch (err) {
    console.error("❌ Cloudinary upload error:", err);
    throw err;
  }
}

/**
 * Deletes a file from Cloudinary via backend endpoint
 */
export async function deleteFromCloudinary(publicId, resourceType = "auto") {
  try {
    const res = await fetch(
      `${BACKEND_URL}/delete-cloudinary/${publicId}?resource_type=${resourceType}`,
      { method: "DELETE" }
    );
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
