const BACKEND_URL = "http://localhost:5000"; // or your deployed backend URL

export async function uploadToCloudinary(files) {
  const formData = new FormData();
  files.forEach(file => formData.append("images", file)); // original "images"

  try {
    const res = await fetch(`${BACKEND_URL}/upload-cloudinary`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error("Upload failed: " + errorText);
    }

    const data = await res.json();
    return data; 
  } catch (err) {
    console.error("❌ Cloudinary upload error:", err);
    throw err;
  }
}

export async function deleteFromCloudinary(publicId) {
  try {
    const res = await fetch(`${BACKEND_URL}/delete-cloudinary/${publicId}`, { method: "DELETE" });
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
