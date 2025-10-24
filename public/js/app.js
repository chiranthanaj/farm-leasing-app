import { uploadToCloudinary, deleteFromCloudinary } from "./cloudinary.js";

// --- Global Constants & Utilities ---

// Mandatory global for Canvas environment pathing
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// Firestore collection path for public data (accessible by all users)
const LANDS_COLLECTION_PATH = `artifacts/${appId}/public/data/lands`;

/**
 * Replaces window.alert and window.confirm with a custom transient message box.
 * @param {string} message - The message content.
 * @param {'success'|'error'|'info'} type - The type of message.
 */
function displayMessage(message, type = 'info') {
    let box = document.getElementById('platform-message-box');
    if (!box) {
        box = document.createElement('div');
        box.id = 'platform-message-box';
        box.className = 'fixed top-4 right-4 z-50 p-4 rounded-xl shadow-2xl text-white font-semibold transition-opacity duration-300 opacity-0';
        document.body.appendChild(box);
    }

    let bgColor = 'bg-gray-700';
    if (type === 'success') bgColor = 'bg-green-600';
    if (type === 'error') bgColor = 'bg-red-600';

    box.className = `fixed top-4 right-4 z-50 p-4 rounded-xl shadow-2xl text-white font-semibold transition-opacity duration-300 ${bgColor} opacity-100`;
    box.textContent = message;

    // Auto-hide after 4 seconds
    clearTimeout(box.timer);
    box.timer = setTimeout(() => {
        box.classList.remove('opacity-100');
        box.classList.add('opacity-0');
    }, 4000);
}

function showScreen(id) {
    document.querySelectorAll("section").forEach(sec => sec.classList.add("hidden"));
    const screen = document.getElementById(id);
    if (screen) screen.classList.remove("hidden");
}

// --- Main Application Logic ---
document.addEventListener("DOMContentLoaded", () => {
    
    // Initial state setup
    showScreen("welcome-screen");
    let isLogin = true;

    // --- Authentication State Listener (Critical) ---
    auth.onAuthStateChanged(user => {
        if (user) {
            // User is signed in, check if they have selected a role previously or go to role selection
            // For now, always route to role selection after successful auth
            showScreen("role-selection-screen");
        } else {
            // User is signed out, show welcome screen
            showScreen("welcome-screen");
        }
    });

    // --- Welcome buttons ---
    document.getElementById("btn-login").addEventListener("click", () => {
        showScreen("auth-screen");
        document.getElementById("auth-title").textContent = "Login";
        isLogin = true;
    });

    document.getElementById("btn-register").addEventListener("click", () => {
        showScreen("auth-screen");
        document.getElementById("auth-title").textContent = "Register";
        isLogin = false;
    });

    document.getElementById("auth-back-btn").addEventListener("click", () => {
        showScreen("welcome-screen");
    });

    // --- Toggle login/register ---
    document.getElementById("auth-toggle-btn").addEventListener("click", () => {
        isLogin = !isLogin;
        document.getElementById("auth-title").textContent = isLogin ? "Login" : "Register";
        document.getElementById("auth-toggle-text").textContent = isLogin
            ? "Don’t have an account?"
            : "Already have an account?";
        document.getElementById("auth-toggle-btn").textContent = isLogin
            ? "Register here"
            : "Login here";
    });

    // --- Firebase Auth Handler ---
    document.getElementById("auth-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        if (!email || !password) {
             return displayMessage("Email and password are required.", 'error');
        }

        try {
            if (isLogin) {
                await auth.signInWithEmailAndPassword(email, password);
                displayMessage("Login successful!", 'success');
            } else {
                await auth.createUserWithEmailAndPassword(email, password);
                displayMessage("Registration successful! Please select your role.", 'success');
            }
            // onAuthStateChanged handles screen navigation to role-selection-screen
        } catch (err) {
            console.error("Auth error:", err);
            displayMessage(`Authentication failed: ${err.message}`, 'error');
        }
    });

    // --- Role selection ---
    document.getElementById("role-seller").addEventListener("click", async () => {
        showScreen("seller-screen");
        loadSellerUploads();
    });
    document.getElementById("role-buyer").addEventListener("click", () => {
        showScreen("buyer-screen");
    });
    
    // Log out when going back from role selection
    document.getElementById("role-back-btn").addEventListener("click", () => {
        auth.signOut();
        showScreen("welcome-screen");
    });

    // --- Dedicated Logout buttons ---
    document.getElementById("seller-logout-btn").addEventListener("click", () => {
        auth.signOut();
        displayMessage("Logged out successfully.", 'info');
    });
    document.getElementById("buyer-logout-btn").addEventListener("click", () => {
        auth.signOut();
        displayMessage("Logged out successfully.", 'info');
    });
    document.getElementById("buyer-back-btn").addEventListener("click", () => {
        showScreen("buyer-screen");
    });

    // --- Seller Upload ---
    document.getElementById("land-upload-form").addEventListener("submit", async (e) => {
        e.preventDefault();

        const ownerId = auth.currentUser ? auth.currentUser.uid : null;
        if (!ownerId) {
             return displayMessage("You must be logged in to upload.", 'error');
        }

        const location = document.getElementById("land-location").value;
        const size = document.getElementById("land-size").value;
        const price = document.getElementById("land-price").value;
        const soilType = document.getElementById("soil-type").value;
        const usageSuitability = document.getElementById("usage-suitability").value;
        const pastUsage = document.getElementById("past-usage").value;
        const contactInfo = document.getElementById("contact-info").value;

        const landImages = document.getElementById("land-images").files;
        const landDocs = document.getElementById("land-documents").files;

        if (landImages.length === 0) {
            return displayMessage("Please upload at least one image.", 'error');
        }

        try {
            // Use Promise.all to concurrently upload all files
            const imageUploadPromises = Array.from(landImages).map(file => uploadToCloudinary(file));
            const docUploadPromises = Array.from(landDocs).map(file => uploadToCloudinary(file));

            const allUploadPromises = [...imageUploadPromises, ...docUploadPromises];
            const uploadResults = await Promise.all(allUploadPromises);
            
            // Separate results back into images and documents
            const imageUrls = uploadResults.slice(0, landImages.length).map(result => result.secure_url);
            const imagePublicIds = uploadResults.slice(0, landImages.length).map(result => result.public_id);
            
            const docUrls = uploadResults.slice(landImages.length).map(result => result.secure_url);
            const docPublicIds = uploadResults.slice(landImages.length).map(result => result.public_id);

            // Save metadata to Firestore in the public path, tagged with ownerId
            await db.collection(LANDS_COLLECTION_PATH).add({
                ownerId, // CRITICAL for security and filtering
                location,
                size,
                price: Number(price),
                soilType,
                usageSuitability,
                pastUsage,
                contactInfo,
                imageUrls,
                docUrls,
                imagePublicIds,
                docPublicIds,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            displayMessage("Land uploaded successfully!", 'success');
            e.target.reset();
            loadSellerUploads();
        } catch (err) {
            console.error("❌ Upload failed:", err);
            displayMessage("Upload failed: Check server logs or Cloudinary credentials.", 'error');
        }
    });

    // --- Load seller's previous uploads ---
    async function loadSellerUploads() {
        const ownerId = auth.currentUser ? auth.currentUser.uid : null;
        const uploadsDiv = document.getElementById("seller-previous-uploads");
        uploadsDiv.innerHTML = "";

        if (!ownerId) {
            uploadsDiv.innerHTML = "<p class='text-red-500'>Error: Not authenticated to view uploads.</p>";
            return;
        }

        try {
            // 🎯 FILTER by current user's UID
            const querySnapshot = await db.collection(LANDS_COLLECTION_PATH)
                .where("ownerId", "==", ownerId) 
                .get();

            let uploads = [];
            querySnapshot.forEach((doc) => {
                uploads.push({ ...doc.data(), id: doc.id });
            });

            // 🎯 Client-side sort (replaces Firestore orderBy)
            uploads.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

            if (uploads.length === 0) {
                 uploadsDiv.innerHTML = "<p class='text-gray-600'>You have no active listings.</p>";
                 return;
            }

            uploads.forEach((land) => {
                uploadsDiv.innerHTML += `
                    <div class="p-4 bg-gray-50 border rounded-xl shadow-md text-left transition-all hover:shadow-lg">
                        <div class="grid grid-cols-2 gap-2 mb-2">
                            ${land.imageUrls.map(url => `<img src="${url}" class="w-full h-24 object-cover rounded" alt="Land Image"/>`).join("")}
                        </div>
                        <h3 class="font-bold text-lg text-green-700">${land.location} - ${land.size} acres</h3>
                        <p class="text-gray-700">Price: ₹${land.price} | Soil: ${land.soilType}</p>
                        <p class="text-sm text-gray-500">Suitable for: ${land.usageSuitability}</p>
                        <button class="bg-red-600 text-white px-3 py-1 rounded-lg mt-3 text-sm hover:bg-red-700 delete-btn" data-id="${land.id}">
                            <i class="fas fa-trash"></i> DELETE
                        </button>
                    </div>
                `;
            });

            // --- DELETE FEATURE using public_id ---
            document.querySelectorAll(".delete-btn").forEach(btn => {
                btn.addEventListener("click", async () => {
                    const id = btn.dataset.id;
                    btn.disabled = true; // Prevent double clicking
                    btn.textContent = "Deleting...";

                    try {
                        const docRef = db.collection(LANDS_COLLECTION_PATH).doc(id);
                        const docSnap = await docRef.get();
                        if (!docSnap.exists) throw new Error("Document not found");

                        const land = docSnap.data();

                        // Concurrently delete files from Cloudinary
                        const publicIds = [...(land.imagePublicIds || []), ...(land.docPublicIds || [])];
                        
                        const deletePromises = publicIds.map(publicId =>
                            deleteFromCloudinary(publicId).catch(err => {
                                console.error(`Failed to delete asset ID ${publicId}:`, err);
                                // Continue even if one deletion fails, but log it.
                                return null;
                            })
                        );
                        
                        await Promise.all(deletePromises);

                        // Delete the document from Firestore
                        await docRef.delete();

                        // Update UI immediately
                        btn.closest(".p-4").remove();
                        displayMessage("✅ Listing deleted successfully!", 'success');
                    } catch (err) {
                        console.error("❌ Delete failed:", err);
                        displayMessage("Failed to delete upload: " + err.message, 'error');
                        btn.disabled = false;
                        btn.textContent = "DELETE";
                    }
                });
            });
        } catch (err) {
            console.error("Failed to load seller uploads:", err);
            displayMessage("Failed to load listings. Check your Firebase rules.", 'error');
        }
    }

    // --- Buyer search ---
    document.getElementById("search-form").addEventListener("submit", async (e) => {
        e.preventDefault();

        const location = document.getElementById("search-location").value.toLowerCase().trim();
        const priceMin = parseInt(document.getElementById("search-price-min").value) || 0;
        const priceMax = parseInt(document.getElementById("search-price-max").value) || Infinity;
        const soilType = document.getElementById("search-soil-type").value.toLowerCase().trim();
        const usageSuitability = document.getElementById("search-usage-suitability").value.toLowerCase().trim();

        // 🎯 Search query targets the public collection path
        const querySnapshot = await db.collection(LANDS_COLLECTION_PATH).get();
        const resultsDiv = document.getElementById("search-results");
        resultsDiv.innerHTML = "";
        
        const filteredResults = [];

        querySnapshot.forEach((doc) => {
            const land = doc.data();

            // Client-side filtering logic
            const matchesLocation = !location || (land.location && land.location.toLowerCase().includes(location));
            const matchesSoil = !soilType || (land.soilType && land.soilType.toLowerCase().includes(soilType));
            const matchesUsage = !usageSuitability || (land.usageSuitability && land.usageSuitability.toLowerCase().includes(usageSuitability));
            const matchesPrice = land.price >= priceMin && land.price <= priceMax;

            if (matchesLocation && matchesSoil && matchesUsage && matchesPrice) {
                filteredResults.push(land);
            }
        });

        filteredResults.forEach((land) => {
             let imagesHTML = land.imageUrls && land.imageUrls.length > 0 ?
                land.imageUrls.map(url => `<img src="${url}" class="w-full h-40 object-cover rounded mb-2" alt="Land Image"/>`).join("") :
                '<div class="text-gray-400 h-40 flex items-center justify-center bg-gray-100 rounded">No Images Available</div>';

            let docsHTML = land.docUrls && land.docUrls.length > 0 ?
                `<div class="mt-2"><h4 class="font-semibold text-green-700">Documents:</h4><ul class="list-disc ml-6">
                 ${land.docUrls.map(url => `<li><a href="${url}" target="_blank" class="text-blue-600 hover:text-blue-800 underline">View Document</a></li>`).join("")}
                 </ul></div>` : '';

            resultsDiv.innerHTML += `
                <div class="p-6 bg-gray-50 border border-green-200 rounded-xl shadow-lg text-left">
                    ${imagesHTML}
                    <h3 class="font-bold text-xl text-green-800">${land.location} - ${land.size} acres</h3>
                    <p class="text-lg font-medium text-gray-700">Monthly Price: <span class="text-green-600">₹${land.price}</span></p>
                    <p class="mt-1">Soil Type: <span class="font-semibold">${land.soilType}</span></p>
                    <p>Suitable for: ${land.usageSuitability}</p>
                    <p>Contact: <span class="font-mono text-sm bg-yellow-100 p-1 rounded">${land.contactInfo}</span></p>
                    ${docsHTML}
                </div>
            `;
        });

        if (filteredResults.length === 0) {
            resultsDiv.innerHTML = `<p class="text-xl text-red-500 font-semibold mt-4">No lands found for your criteria.</p>`;
        } else {
             displayMessage(`${filteredResults.length} listings found.`, 'info');
        }

        showScreen("buyer-results-screen");
    });
});
