// cloudinary.js

const BACKEND_URL = "http://localhost:5000"; // your backend port

/**
 * Uploads a single file (image, video, doc, etc.) to backend which handles Cloudinary.
 * Returns secure_url, public_id, and resource_type.
 */
export async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("files", file); // backend expects field name "files"

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

    // Backend now returns an array even for single file, so get first element
    return Array.isArray(data) ? data[0] : data;
  } catch (err) {
    console.error("❌ Cloudinary upload error:", err);
    throw err;
  }
}

/**
 * Deletes a file from Cloudinary via backend endpoint
 * publicId: Cloudinary public_id
 * resourceType: image, raw, video, etc.
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
