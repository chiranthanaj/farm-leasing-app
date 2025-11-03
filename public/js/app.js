import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where, doc, getDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { uploadToCloudinary, deleteFromCloudinary } from "./cloudinary.js";

// Global/Local Firebase instances
let db;
let auth;
let userId;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// Firestore collection path for public data (accessible by all users)
const LANDS_COLLECTION_PATH = () => `artifacts/${appId}/public/data/lands`;

// --- UI Utility Functions ---

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
    document.querySelectorAll("section").forEach(sec => {
        sec.classList.add("hidden");
        sec.classList.remove("flex"); 
    });
    const screen = document.getElementById(id);
    if (screen) {
        screen.classList.remove("hidden");
        screen.classList.add("flex");
    }
}

// --- Firebase Logic Functions ---

/**
 * Handles the deletion of a land listing and associated Cloudinary assets.
 */
async function handleDeleteListing(id, btn) {
    if (!auth.currentUser) return;

    btn.disabled = true;
    btn.textContent = "Deleting...";

    try {
        const docRef = doc(db, LANDS_COLLECTION_PATH(), id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) throw new Error("Document not found");

        const land = docSnap.data();

        // Concurrently delete files from Cloudinary
        const publicIds = [...(land.imagePublicIds || []), ...(land.docPublicIds || [])];

        const deletePromises = publicIds.map(publicId =>
            deleteFromCloudinary(publicId).catch(err => {
                console.error(`Failed to delete asset ID ${publicId}:`, err);
                return null;
            })
        );

        await Promise.all(deletePromises);
        displayMessage("Assets deleted from storage.", 'info');

        // Delete the document from Firestore
        await deleteDoc(docRef);

        // Update UI immediately
        document.getElementById(`listing-${id}`)?.remove();
        displayMessage("✅ Listing deleted successfully!", 'success');

    } catch (err) {
        console.error("❌ Delete failed:", err);
        displayMessage("Failed to delete upload: " + err.message, 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-trash mr-1"></i> DELETE';
    }
}

/**
 * Loads and displays the current seller's uploaded lands.
 */
async function loadSellerUploads() {
    if (!auth.currentUser) {
        document.getElementById("seller-previous-uploads").innerHTML = "<p class='text-red-500'>Error: Not authenticated to view uploads.</p>";
        return;
    }
    const ownerId = auth.currentUser.uid;
    const uploadsDiv = document.getElementById("seller-previous-uploads");
    uploadsDiv.innerHTML = "<p class='text-gray-600'>Loading listings...</p>";

    try {
        const landCollectionRef = collection(db, LANDS_COLLECTION_PATH());
        // Query to filter by current user's UID
        const q = query(landCollectionRef, where("ownerId", "==", ownerId));

        const querySnapshot = await getDocs(q); 

        let uploads = [];
        querySnapshot.forEach((doc) => {
            uploads.push({ ...doc.data(), id: doc.id });
        });

        // Client-side sort by createdAt (latest first)
        uploads.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        uploadsDiv.innerHTML = ""; // Clear loading message

        if (uploads.length === 0) {
            uploadsDiv.innerHTML = "<p class='text-gray-600'>You have no active listings.</p>";
            return;
        }

        uploads.forEach((land) => {
            const listingHtml = `
                <div id="listing-${land.id}" class="p-4 bg-gray-50 border rounded-xl shadow-md text-left transition-all hover:shadow-lg">
                    <div class="grid grid-cols-2 gap-2 mb-2">
                        ${land.imageUrls.map(url => `<img src="${url}" class="w-full h-24 object-cover rounded" alt="Land Image"/>`).join("")}
                    </div>
                    <h3 class="font-bold text-lg text-green-700">${land.location} - ${land.size} acres</h3>
                    <p class="text-gray-700">Price: ₹${land.price} | Soil: ${land.soilType}</p>
                    <p class="text-sm text-gray-500">Suitable for: ${land.usageSuitability}</p>
                    <button class="bg-red-600 text-white px-4 py-2 rounded-lg mt-3 text-sm font-semibold hover:bg-red-700 delete-btn" data-id="${land.id}">
                        <i class="fas fa-trash mr-1"></i> DELETE
                    </button>
                </div>
            `;
            uploadsDiv.insertAdjacentHTML('beforeend', listingHtml);
        });

        // Attach DELETE FEATURE listeners
        document.querySelectorAll(".delete-btn").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id = btn.dataset.id;
                await handleDeleteListing(id, btn);
            });
        });

    } catch (err) {
        console.error("Failed to load seller uploads:", err);
        displayMessage("Failed to load listings. Check your Firebase rules.", 'error');
        uploadsDiv.innerHTML = "<p class='text-red-500'>Failed to load listings.</p>";
    }
}

/**
 * Handles the form submission for land upload.
 */
async function handleLandUpload(e) {
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
    
    // --- CRITICAL DEBUGGING LOGS (Use this to verify the problem is NOT in the code) ---
    console.log("--- DEBUG Firestore Write Attempt ---");
    console.log(`Current User ID (ownerId): ${ownerId}`);
    console.log(`Target Collection Path: ${LANDS_COLLECTION_PATH()}`);
    // -----------------------------------------------------------------------------------

    try {
        displayMessage("Uploading files...", 'info');
        
        // 1. Upload files to Cloudinary
        const imageUploadPromises = Array.from(landImages).map(file => uploadToCloudinary(file));
        const docUploadPromises = Array.from(landDocs).map(file => uploadToCloudinary(file));

        const uploadResults = await Promise.all([...imageUploadPromises, ...docUploadPromises]);

        // 2. Separate results and get Public IDs
        const imageUrls = uploadResults.slice(0, landImages.length).map(result => result.secure_url);
        const imagePublicIds = uploadResults.slice(0, landImages.length).map(result => result.public_id);
        
        const docUrls = uploadResults.slice(landImages.length).map(result => result.secure_url);
        const docPublicIds = uploadResults.slice(landImages.length).map(result => result.public_id);

        // 3. Prepare data for Firestore
        const landData = {
            ownerId, // CRITICAL: Must match request.auth.uid in rules
            location,
            size: parseFloat(size),
            price: Number(price),
            soilType,
            usageSuitability,
            pastUsage,
            contactInfo,
            imageUrls,
            docUrls,
            imagePublicIds,
            docPublicIds,
            createdAt: serverTimestamp() // Modular V9 syntax
        };

        // 4. Save metadata to Firestore (Modular V9 syntax: addDoc)
        const landCollectionRef = collection(db, LANDS_COLLECTION_PATH());
        await addDoc(landCollectionRef, landData);

        displayMessage("✅ Land uploaded successfully!", 'success');
        e.target.reset();
        await loadSellerUploads(); // Refresh the list
        
    } catch (err) {
        console.error("❌ Upload failed:", err);
        displayMessage(`Upload failed: ${err.message}`, 'error');
    }
}

// --- Buyer search (Refactored to use V9 syntax) ---
async function searchLand(e) {
    e.preventDefault();

    if (!auth.currentUser) {
        displayMessage("Please log in to search.", 'error');
        return;
    }

    const location = document.getElementById("search-location").value.toLowerCase().trim();
    const priceMin = parseInt(document.getElementById("search-price-min").value) || 0;
    const priceMax = parseInt(document.getElementById("search-price-max").value) || Infinity;
    const soilType = document.getElementById("search-soil-type").value.toLowerCase().trim();
    const usageSuitability = document.getElementById("search-usage-suitability").value.toLowerCase().trim();

    displayMessage("Searching for land listings...", 'info');
    const resultsDiv = document.getElementById("search-results");
    resultsDiv.innerHTML = "<p class='text-gray-600 mt-4'>Processing results...</p>";
    showScreen("buyer-results-screen");

    try {
        const landCollectionRef = collection(db, LANDS_COLLECTION_PATH());
        const querySnapshot = await getDocs(landCollectionRef);
        
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

        resultsDiv.innerHTML = ""; // Clear processing message

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
            displayMessage(`${filteredResults.length} listings found.`, 'success');
        }
        
    } catch (err) {
        console.error("❌ Search failed:", err);
        displayMessage(`Search failed: ${err.message}`, 'error');
    }
}


// --- Main Application Logic ---
document.addEventListener("DOMContentLoaded", () => {
    
    // 1. Initial Firebase Setup (Modular V9)
    const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    
    const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
    let isLogin = true;

    // Initial Authentication using the provided token (or anonymous sign-in)
    (async () => {
        try {
            if (initialAuthToken) {
                await signInWithCustomToken(auth, initialAuthToken);
            } else {
                await signInAnonymously(auth);
            }
        } catch (error) {
            console.error("Initial sign-in failed:", error);
        }
    })();


    // 2. Authentication State Listener (Handles screen flow after sign-in/out)
    onAuthStateChanged(auth, (user) => {
        userId = user ? user.uid : 'anonymous-user';
        
        if (user) {
            console.log(`User logged in. UID: ${userId}`);
            showScreen("role-selection-screen");
        } else {
            console.log("User logged out/anonymous.");
            showScreen("welcome-screen");
        }
    });

    // --- Event Listeners (Using user's provided logic) ---
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

    document.getElementById("auth-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        if (!email || !password) {
             return displayMessage("Email and password are required.", 'error');
        }

        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
                displayMessage("Login successful!", 'success');
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
                displayMessage("Registration successful! Please select your role.", 'success');
            }
        } catch (err) {
            console.error("Auth error:", err);
            displayMessage(`Authentication failed: ${err.message}`, 'error');
        }
    });

    document.getElementById("role-seller").addEventListener("click", () => {
        showScreen("seller-screen");
        loadSellerUploads();
    });
    document.getElementById("role-buyer").addEventListener("click", () => {
        showScreen("buyer-screen");
    });
    
    document.getElementById("role-back-btn").addEventListener("click", () => {
        signOut(auth);
        showScreen("welcome-screen");
    });

    document.getElementById("seller-logout-btn").addEventListener("click", () => {
        signOut(auth);
        displayMessage("Logged out successfully.", 'info');
    });
    document.getElementById("buyer-logout-btn").addEventListener("click", () => {
        signOut(auth);
        displayMessage("Logged out successfully.", 'info');
    });
    document.getElementById("buyer-back-btn").addEventListener("click", () => {
        showScreen("buyer-screen");
    });

    document.getElementById("land-upload-form").addEventListener("submit", handleLandUpload);
    document.getElementById("search-form").addEventListener("submit", searchLand);
});
