const BACKEND_URL = "http://localhost:5000"; // Backend URL

// Upload file to Filestack through backend
export async function uploadToCloudinary(file) {
  if (!file) throw new Error("No file provided for upload");

  try {
    console.log("📤 Uploading file to backend (Filestack)...");
    const formData = new FormData();
    formData.append("files", file);

    const res = await fetch(`${BACKEND_URL}/upload-cloudinary`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error("Upload failed: " + text);
    }

    const data = await res.json();
    console.log("📦 Upload response:", data);

    // ✅ Ensure consistent return object (not array)
    if (!data || data.length === 0 || !data[0].secure_url) {
      throw new Error("Invalid upload response from backend");
    }

    // Return single object for simpler handling
    return {
      secure_url: data[0].secure_url,
      public_id: data[0].public_id,
      resource_type: data[0].resource_type,
    };
  } catch (err) {
    console.error("❌ Upload error:", err);
    throw err;
  }
}

// Delete file from Filestack via backend
export async function deleteFromCloudinary(publicId, resourceType = "auto") {
  if (!publicId) throw new Error("Missing publicId for delete");

  try {
    const res = await fetch(
      `${BACKEND_URL}/delete-cloudinary/${publicId}?resource_type=${resourceType}`,
      { method: "DELETE" }
    );

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error("Delete failed: " + JSON.stringify(data));
    }

    console.log(`✅ Successfully deleted ${publicId} from Filestack`);
    return true;
  } catch (err) {
    console.error("❌ Delete error:", err);
    throw err;
  }
}
