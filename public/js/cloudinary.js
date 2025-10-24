const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dp5br2uug/auto/upload"; // Not used for upload, but kept for context
const CLOUDINARY_UPLOAD_PRESET = "unsigned_preset"; // Not used for upload, but kept for context

// backend URL (where server.js is running)
const BACKEND_URL = "http://localhost:5000"; 

/**
 * Uploads a file by sending it to the Node.js backend for signed Cloudinary upload.
 * This function is now sending data to BACKEND_URL/upload-cloudinary.
 */
export async function uploadToCloudinary(file) {
  const formData = new FormData();
  // IMPORTANT: The field name must be 'file' to match 'upload.single("file")' in server.js
  formData.append("file", file); 

  try {
    // 🎯 Hitting your local backend server's signed upload route
    const res = await fetch(`${BACKEND_URL}/upload-cloudinary`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
        // Read the error message from the backend response
        const errData = await res.json();
        throw new Error("Upload failed: " + JSON.stringify(errData));
    }

    const data = await res.json();
    // Your backend is responsible for returning secure_url and public_id
    return {
      secure_url: data.secure_url,
      public_id: data.public_id,
    };
  } catch (err) {
    console.error("❌ Upload error:", err);
    throw err;
  }
}

/**
 * Deletes a file from Cloudinary by calling backend route.
 * publicId: the Cloudinary public_id
 */
export async function deleteFromCloudinary(publicId) {
  try {
    // Hitting your local backend server's delete route
    const res = await fetch(`${BACKEND_URL}/delete-cloudinary/${publicId}`, {
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