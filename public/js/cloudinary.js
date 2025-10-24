// IMPORTANT: For this to work, you MUST configure an 'Unsigned Upload Preset' 
// in your Cloudinary account settings and replace the placeholders below.

// Placeholder: Replace with your actual Cloudinary Cloud Name
const CLOUD_NAME = "dp5br2uug"; 
// Placeholder: Replace with your actual Unsigned Upload Preset name
const UPLOAD_PRESET = "unsigned_preset"; 

/**
 * Uploads a file directly to Cloudinary using an unsigned upload preset.
 * This avoids relying on a local backend server for the upload process.
 * * @param {File} file - The file object from the input field.
 * @returns {Promise<Object>} The Cloudinary response object (e.g., secure_url, public_id).
 */
export async function uploadToCloudinary(file) {
    console.log(`📤 Uploading file ${file.name} directly to Cloudinary...`);
    
    if (CLOUD_NAME === "YOUR_CLOUD_NAME" || UPLOAD_PRESET === "YOUR_UNSIGNED_UPLOAD_PRESET") {
        throw new Error("Cloudinary configuration missing. Please update CLOUD_NAME and UPLOAD_PRESET in js/cloudinary.js.");
    }
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);

    // The direct Cloudinary upload endpoint
    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`;

    try {
        const response = await fetch(uploadUrl, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            // Try to parse JSON error message if possible
            let errorDetail = errorText;
            try {
                const errorJson = JSON.parse(errorText);
                errorDetail = errorJson.error.message;
            } catch {}
            
            throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorDetail}`);
        }

        const result = await response.json();
        console.log("✅ Upload successful:", result);
        return result;
    } catch (err) {
        console.error("❌ Direct Upload error:", err);
        throw new Error(`Cloudinary upload failed: ${err.message}`);
    }
}

/**
 * Deletes a file from Cloudinary. 
 * * NOTE: For security, file deletion must be handled by a backend server 
 * using a signed request (which requires API keys).
 * This function still attempts to use a local backend endpoint for deletion 
 * (as deletion cannot be done safely client-side without security exposure).
 * * @param {string} publicId - The public ID of the asset to delete.
 * @returns {Promise<Object>} The server's response object.
 */
export async function deleteFromCloudinary(publicId) {
    console.log(`🗑️ Requesting deletion for asset: ${publicId}`);

    // This assumes a local server endpoint (/delete-cloudinary) is available to handle the secure deletion.
    // If you do not have a server, this deletion step will likely fail, but the upload will succeed.
    const response = await fetch('/delete-cloudinary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicId })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Deletion failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log("✅ Deletion requested successfully:", result);
    return result;
}
