const BACKEND_URL = "https://farm-leasing-app.onrender.com";

/**
 * Uploads a file (image, video, raw) to Cloudinary via your backend.
 * Returns { secure_url, public_id, resource_type } on success.
 */
export async function uploadToCloudinary(file) {
  if (!file) throw new Error("No file provided for upload");

  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${BACKEND_URL}/upload-cloudinary`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error("Upload failed: " + text);
    }

    const data = await res.json();

    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error("Upload returned empty response");
    }

    // If multiple files, return array; for single file, take first
    const result = data[0] || data;

    return {
      secure_url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type || "image",
    };
  } catch (err) {
    console.error("❌ Cloudinary upload error:", err);
    throw err;
  }
}

/**
 * Deletes a file from Cloudinary via your backend.
 * publicId: Cloudinary public_id
 * resourceType: image, raw, video, etc.
 */
export async function deleteFromCloudinary(publicId, resourceType = "auto") {
  if (!publicId) throw new Error("No publicId provided for deletion");

  try {
    const res = await fetch(`${BACKEND_URL}/delete-cloudinary`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicId, resourceType }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error("Delete failed: " + JSON.stringify(data));
    }

    console.log(`✅ Successfully deleted ${publicId} from Cloudinary`);
    return true;
  } catch (err) {
    console.error("❌ Delete error:", err);
    throw err;
  }
}
