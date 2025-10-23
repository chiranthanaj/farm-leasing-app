const BACKEND_URL = "http://localhost:5000"; // match server port

export async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch(`${BACKEND_URL}/upload-cloudinary`, {
      method: "POST",
      body: formData
    });

    if (!res.ok) throw new Error("Upload failed");

    const data = await res.json();
    return { secure_url: data.secure_url, public_id: data.public_id };
  } catch (err) {
    console.error("❌ Upload error:", err);
    throw err;
  }
}

export async function deleteFromCloudinary(publicId) {
  try {
    const res = await fetch(`${BACKEND_URL}/delete-cloudinary`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicId }) // send in body
    });

    const data = await res.json();
    if (!res.ok || !data.success) throw new Error("Delete failed");

    return true;
  } catch (err) {
    console.error("❌ Delete error:", err);
    throw err;
  }
}
