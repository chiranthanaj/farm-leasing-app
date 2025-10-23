const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dp5br2uug/auto/upload";
const CLOUDINARY_UPLOAD_PRESET = "unsigned_preset";
const BACKEND_URL = "http://localhost:3000";

export async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  try {
    const res = await fetch(CLOUDINARY_URL, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("Cloudinary upload failed");

    const data = await res.json();
    return { secure_url: data.secure_url, public_id: data.public_id };
  } catch (err) {
    console.error("❌ Cloudinary upload error:", err);
    throw err;
  }
}

export async function deleteFromCloudinary(publicId) {
  try {
    const res = await fetch(`${BACKEND_URL}/delete-cloudinary/${publicId}`, {
      method: "DELETE",
    });

    const data = await res.json();
    if (!res.ok || !data.success) throw new Error("Delete failed: " + JSON.stringify(data));

    return true;
  } catch (err) {
    console.error("❌ Delete error:", err);
    throw err;
  }
}
