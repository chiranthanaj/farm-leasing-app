const BACKEND_URL = "https://farm-leasing-app.onrender.com";

/**
 * Deletes a file from Cloudinary using the backend.
 * publicId: Cloudinary public_id
 * resourceType: image, raw, video, etc.
 */
export async function deleteFromCloudinary(publicId, resourceType = "auto") {
  try {
    const res = await fetch(`${BACKEND_URL}/delete-cloudinary/${publicId}?resource_type=${resourceType}`, {
      method: "DELETE",
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
