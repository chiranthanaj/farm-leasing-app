// cloudinary.js

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dp5br2uug";
const CLOUDINARY_UPLOAD_PRESET = "unsigned_preset";
const BACKEND_URL = "http://localhost:3000";

/**
 * Detects file type for Cloudinary upload
 */
function getResourceType(file) {
  const type = file.type.split("/")[0];
  if (type === "image") return "image";
  if (type === "video") return "video";
  return "raw"; // for pdf, docx, csv, etc.
}

/**
 * Uploads a file (image, video, raw) to Cloudinary using unsigned preset.
 * Returns secure_url, public_id, and resource_type
 */
export async function uploadToCloudinary(file) {
  const resourceType = getResourceType(file);
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  try {
    const res = await fetch(`${CLOUDINARY_URL}/${resourceType}/upload`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error("Cloudinary upload failed: " + errorText);
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
 * Deletes a file from Cloudinary via backend endpoint
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
