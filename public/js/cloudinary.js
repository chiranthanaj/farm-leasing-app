const BACKEND_URL = "https://farm-leasing-app.onrender.com";

/**
 * Upload a file (image/pdf/docs) via backend
 */
export async function uploadToCloudinary(file) {
  try {
    const formData = new FormData();
    formData.append("file", file);

    console.log("📤 Uploading file to backend Cloudinary endpoint...");

    const res = await fetch(`${BACKEND_URL}/upload-cloudinary`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("Upload failed: " + await res.text());

    const data = await res.json();
    return {
      secure_url: data.secure_url,
      public_id: data.public_id,
      resource_type: data.resource_type,
    };
  } catch (err) {
    console.error("❌ Upload error:", err);
    throw err;
  }
}

/**
 * Delete a file via backend
 */
export async function deleteFromCloudinary(publicId, resourceType = "auto") {
  try {
    console.log("🗑 Deleting file with publicId:", publicId);

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
