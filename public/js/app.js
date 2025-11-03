import { uploadToCloudinary } from './cloudinary.js';
import { collection, addDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Global variables will be available on the window object after index.html setup
let db;
let auth;
let userId;
let appId;

// Collection paths
const LANDS_COLLECTION_PATH = (appId) => `artifacts/${appId}/public/data/lands`;
const USER_ROLE_PATH = (appId, uid) => `artifacts/${appId}/users/${uid}/profile`;

// --- UI Utility Functions ---

function showScreen(screenId) {
    const screens = ['welcome-screen', 'auth-screen', 'role-selection-screen', 'seller-screen', 'buyer-screen', 'buyer-results-screen'];
    screens.forEach(id => {
        const screen = document.getElementById(id);
        if (screen) {
            screen.classList.add('hidden');
        }
    });
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.remove('hidden');
        targetScreen.classList.add('flex'); // Ensure it's visible if needed
    }
}


// --- Firebase Logic Functions (Now uses global/window variables) ---

/**
 * Handles the land upload form submission.
 */
async function handleLandUpload(e) {
    e.preventDefault();

    if (!window.isAuthReady || !window.userId) {
        window.displayMessage("Authentication not complete. Please wait or log in.", true);
        return;
    }

    // Use initialized globals
    const landCollectionRef = collection(db, LANDS_COLLECTION_PATH(appId)); 
    
    // 1. Gather form data (Example: only location and size used for brevity)
    const location = document.getElementById('land-location').value;
    const size = parseFloat(document.getElementById('land-size').value);
    
    if (!location || isNaN(size)) {
        window.displayMessage("Please fill in location and size.", true);
        return;
    }

    const landImagesInput = document.getElementById('land-images');
    const images = landImagesInput.files;
    let imageUrls = [];

    // 2. Upload images to Cloudinary (Requires js/cloudinary.js to be correctly configured)
    if (images.length > 0) {
        window.displayMessage("Uploading files...", false);
        try {
            for (const image of images) {
                const result = await uploadToCloudinary(image);
                imageUrls.push({ url: result.secure_url, publicId: result.public_id });
            }
        } catch (error) {
            window.displayMessage(`❌ Upload failed: ${error.message}`, true);
            console.error("Upload error:", error);
            return;
        }
    }


    // 3. Save land data to Firestore
    const landData = {
        ownerId: userId,
        location: location,
        size: size,
        price: document.getElementById('land-price').value,
        soilType: document.getElementById('soil-type').value,
        usageSuitability: document.getElementById('usage-suitability').value,
        pastUsage: document.getElementById('past-usage').value,
        contactInfo: document.getElementById('contact-info').value,
        imageUrls: imageUrls,
        createdAt: firebase.firestore.FieldValue.serverTimestamp() // Uses V8 compatibility layer
    };
    
    try {
        await addDoc(landCollectionRef, landData);
        window.displayMessage("✅ Land listing uploaded successfully!", false);
        document.getElementById('land-upload-form').reset();
    } catch (error) {
        // THIS IS THE CRITICAL LOG: If you still see a permission error here,
        // it means your Firestore Security Rules are incorrect for this path/user.
        window.displayMessage(`❌ Upload failed: ${error.message}`, true);
        console.error("Firestore write error:", error);
    }
}

/**
 * Fetches and displays the current seller's uploaded lands.
 */
async function fetchSellerUploads() {
    if (!window.isAuthReady || !window.userId) return;

    const uploadsDiv = document.getElementById('seller-previous-uploads');
    uploadsDiv.innerHTML = '<p class="text-gray-500">Loading your listings...</p>';

    const landCollectionRef = collection(db, LANDS_COLLECTION_PATH(appId));
    
    // Query for lands where ownerId matches the current user's ID
    const q = query(landCollectionRef, where("ownerId", "==", userId));

    try {
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            uploadsDiv.innerHTML = '<p class="text-gray-500">You have no land listings yet.</p>';
            return;
        }
        
        uploadsDiv.innerHTML = '';
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const listingElement = document.createElement('div');
            listingElement.className = 'p-4 border rounded-lg shadow-sm bg-gray-50 text-left';
            listingElement.innerHTML = `
                <h3 class="font-bold text-lg text-green-700">${data.location}</h3>
                <p>Size: ${data.size} acres | Price: ₹${data.price}</p>
                <p class="text-sm text-gray-600">Soil: ${data.soilType}</p>
                ${data.imageUrls.length > 0 ? `<img src="${data.imageUrls[0].url}" class="w-20 h-20 object-cover mt-2 rounded"/>` : ''}
            `;
            uploadsDiv.appendChild(listingElement);
        });

    } catch (error) {
        console.error("Error fetching seller uploads:", error);
        uploadsDiv.innerHTML = `<p class="text-red-500">Error loading listings: ${error.message}</p>`;
    }
}

// --- Main Initialization and Event Listener Setup ---

function setupEventListeners() {
    // 1. Screen Navigation
    document.getElementById('btn-login').addEventListener('click', () => showScreen('auth-screen'));
    document.getElementById('btn-register').addEventListener('click', () => {
        showScreen('auth-screen');
        document.getElementById('auth-title').textContent = 'Register';
    });
    document.getElementById('auth-back-btn').addEventListener('click', () => showScreen('welcome-screen'));
    document.getElementById('auth-toggle-btn').addEventListener('click', () => {
        const title = document.getElementById('auth-title').textContent;
        if (title === 'Login') {
            document.getElementById('auth-title').textContent = 'Register';
            document.getElementById('auth-toggle-text').innerHTML = 'Already have an account? <button type="button" id="auth-toggle-btn" class="text-green-700 font-semibold underline">Login here</button>';
        } else {
            document.getElementById('auth-title').textContent = 'Login';
            document.getElementById('auth-toggle-text').innerHTML = 'Don’t have an account? <button type="button" id="auth-toggle-btn" class="text-green-700 font-semibold underline">Register here</button>';
        }
        // Re-attach toggle listener (required since we overwrite innerHTML)
        setupEventListeners(); 
    });
    
    // 2. Auth Form Handling (Simplified for module setup)
    document.getElementById('auth-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const isRegister = document.getElementById('auth-title').textContent === 'Register';

        try {
            if (isRegister) {
                await window.authFunctions.createUserWithEmailAndPassword(auth, email, password);
                window.displayMessage("Registration successful! Proceed to select your role.", false);
            } else {
                await window.authFunctions.signInWithEmailAndPassword(auth, email, password);
                window.displayMessage("Login successful! Proceed to select your role.", false);
            }
            showScreen('role-selection-screen');

        } catch (error) {
            window.displayMessage(`Authentication Failed: ${error.message}`, true);
        }
    });

    // 3. Role Selection
    document.getElementById('role-seller').addEventListener('click', () => {
        showScreen('seller-screen');
        fetchSellerUploads(); // Fetch data when seller screen is shown
    });
    document.getElementById('role-buyer').addEventListener('click', () => showScreen('buyer-screen'));
    document.getElementById('role-back-btn').addEventListener('click', () => showScreen('welcome-screen'));

    // 4. Seller Upload Form (Critical: Calls the Firebase logic)
    document.getElementById('land-upload-form').addEventListener('submit', handleLandUpload);

    // 5. Logout
    document.getElementById('seller-logout-btn').addEventListener('click', async () => {
        await window.authFunctions.signOut(auth);
        window.displayMessage("Logged out successfully.", false);
        showScreen('welcome-screen');
    });
    document.getElementById('buyer-logout-btn').addEventListener('click', async () => {
        await window.authFunctions.signOut(auth);
        window.displayMessage("Logged out successfully.", false);
        showScreen('welcome-screen');
    });
}

// --- INITIALIZATION GATEWAY ---
// Wait for the custom event fired by index.html when authentication is confirmed.
window.addEventListener('firebaseAuthReady', () => {
    // 1. Copy globally exposed objects to local scope for clarity
    db = window.db;
    auth = window.auth;
    userId = window.userId;
    appId = window.__app_id;

    // 2. Set Firebase log level (helpful for debugging permission issues)
    // NOTE: This assumes firebase/firestore is available
    if (db.app.options.projectId === 'farm-leasing-app') { // Check if initialization succeeded
        console.log(`Firestore initialized for app: ${appId}`);
    } else {
        console.error("Firestore not initialized correctly.");
    }
    
    // 3. Run the main application setup
    setupEventListeners();
    
    // If the user is logged in, skip the welcome screen and go to role selection
    if (userId && userId !== 'anonymous-user') {
        showScreen('role-selection-screen');
    } else {
        showScreen('welcome-screen');
    }
});

// IMPORTANT: Add searchLand logic, etc., here if you want it to run after auth.
// Example placeholder for searchLand:
async function searchLand(e) {
    e.preventDefault();
    if (!userId) {
        window.displayMessage("Please log in to search.", true);
        return;
    }
    window.displayMessage("Searching for land listings...", false);

    const location = document.getElementById('search-location').value;
    // ... gather other search parameters

    const landCollectionRef = collection(db, LANDS_COLLECTION_PATH(appId));
    let q = query(landCollectionRef);

    // Add filters based on input (simplified)
    if (location) {
        // Note: Firestore does not support partial string matching without indexing
        // Using exact match for location here for demonstration
        q = query(q, where("location", "==", location));
    }
    
    // Add other query logic here

    try {
        const snapshot = await getDocs(q);
        const resultsDiv = document.getElementById('search-results');
        resultsDiv.innerHTML = '';
        
        if (snapshot.empty) {
            resultsDiv.innerHTML = '<p class="text-gray-500">No matching results found.</p>';
        } else {
            snapshot.forEach(doc => {
                const data = doc.data();
                const resultItem = document.createElement('div');
                resultItem.className = 'p-4 border rounded-lg shadow-sm bg-white text-left';
                resultItem.innerHTML = `
                    <h3 class="font-bold text-xl text-blue-700">${data.location}</h3>
                    <p>Size: ${data.size} acres | Price: ₹${data.price} / month</p>
                    <p>Contact: ${data.contactInfo}</p>
                    <p class="text-sm text-gray-500">Suitable for: ${data.usageSuitability}</p>
                `;
                resultsDiv.appendChild(resultItem);
            });
        }
        showScreen('buyer-results-screen');
    } catch (error) {
        window.displayMessage(`❌ Search failed: ${error.message}`, true);
        console.error("Search error:", error);
    }
}
document.getElementById('search-form').addEventListener('submit', searchLand);

// Back button functionality for buyer results
document.getElementById('buyer-back-btn').addEventListener('click', () => showScreen('buyer-screen'));
