const BACKEND_URL = "http://localhost:5000"; // use your backend URL

export async function uploadToCloudinary(file) {
  if (!file) throw new Error("No file provided for upload");

  try {
    const formData = new FormData();
    formData.append("files", file); // original code expects 'files' array on backend

    const res = await fetch(`${BACKEND_URL}/upload-cloudinary`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error("Upload failed: " + text);
    }

    const data = await res.json();
    // Expecting an array of uploaded file info (keeps old shape)
    // Example: [{ secure_url, public_id, resource_type, filestack_raw }]
    return data;
  } catch (err) {
    console.error("❌ Upload error:", err);
    throw err;
  }
}

export async function deleteFromCloudinary(publicId, resourceType = "auto") {
  if (!publicId) throw new Error("Missing publicId for delete");

  try {
    const res = await fetch(`${BACKEND_URL}/delete-cloudinary/${publicId}?resource_type=${resourceType}`, {
      method: "DELETE",
    });

    const data = await res.json();
    if (!res.ok || !data.success) throw new Error("Delete failed: " + JSON.stringify(data));

    console.log(`✅ Successfully deleted ${publicId} from Filestack`);
    return true;
  } catch (err) {
    console.error("❌ Delete error:", err);
    throw err;
  }
}
