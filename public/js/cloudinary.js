// ===============================
// cloudinary.js (Final Synced Version)
// ===============================
const BACKEND_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://your-deployed-backend-domain.com";

export async function uploadToCloudinary(file) {
  if (!file) throw new Error("No file provided for upload");

  try {
    console.log("📤 Uploading file to backend Cloudinary endpoint...");

    const formData = new FormData();
    formData.append("file", file); // 👈 changed from "files" → "file"

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

    if (!data || !Array.isArray(data) || !data[0]?.secure_url) {
      throw new Error("Invalid upload response from backend");
    }

    const { secure_url, public_id, resource_type } = data[0];
    return { secure_url, public_id, resource_type };
  } catch (err) {
    console.error("❌ Upload error:", err);
    throw err;
  }
}

export async function deleteFromCloudinary(publicId, resourceType = "auto") {
  if (!publicId) throw new Error("Missing publicId for delete");

  try {
    const res = await fetch(
      `${BACKEND_URL}/delete-cloudinary/${encodeURIComponent(
        publicId
      )}?resource_type=${resourceType}`,
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
