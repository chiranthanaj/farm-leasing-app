const BACKEND_URL = "http://localhost:5000"; // use your backend URL

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

    return {
      secure_url: data.secure_url,
      public_id: data.public_id,
      resource_type: data.resource_type || "image",
    };
  } catch (err) {
    console.error("❌ Cloudinary upload error:", err);
    throw err;
  }
}

export async function deleteFromCloudinary(publicId, resourceType = "auto") {
  if (!publicId) throw new Error("No publicId provided for deletion");

  try {
    const res = await fetch(`${BACKEND_URL}/delete-cloudinary/${publicId}?resource_type=${resourceType}`, {
      method: "DELETE",
    });

    const data = await res.json();
    if (!res.ok || !data.success) throw new Error("Delete failed: " + JSON.stringify(data));

    console.log(`✅ Successfully deleted ${publicId} from Cloudinary`);
    return true;
  } catch (err) {
    console.error("❌ Delete error:", err);
    throw err;
  }
}
