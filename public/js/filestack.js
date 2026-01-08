// ===============================
// filestack.js — CLEAN FINAL VERSION
// ===============================

// Backend URL (local vs Render)
const BACKEND_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://farm-leasing-app.onrender.com";

// ====================================================
// Upload File to Filestack via Backend
// ====================================================
export async function uploadToFilestack(file) {
  if (!file) throw new Error("No file provided for upload");

  try {
    console.log("📤 Uploading file to backend (Filestack)...");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${BACKEND_URL}/upload-filestack`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error("Upload failed: " + text);
    }

    const data = await res.json();
    console.log("📦 Backend upload response:", data);

    if (!Array.isArray(data) || !data[0]?.secure_url) {
      throw new Error("Invalid upload response from backend");
    }

    const { secure_url, public_id, resource_type } = data[0];

    return { secure_url, public_id, resource_type };
  } catch (err) {
    console.error("❌ Upload error:", err);
    throw err;
  }
}

// ====================================================
// Delete File from Filestack via Backend
// ====================================================
export async function deleteFromFilestack(publicId, resourceType = "auto") {
  if (!publicId) throw new Error("Missing publicId for delete");

  try {
    const res = await fetch(
      `${BACKEND_URL}/delete-filestack/${encodeURIComponent(publicId)}?resource_type=${encodeURIComponent(
        resourceType
      )}`,
      { method: "DELETE" }
    );

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error("Delete failed: " + JSON.stringify(data));
    }

    console.log(`🗑️ Successfully deleted from Filestack: ${publicId}`);
    return true;
  } catch (err) {
    console.error("❌ Delete error:", err);
    throw err;
  }
}
