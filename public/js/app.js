// js/app.js
document.addEventListener("DOMContentLoaded", () => {
  function showScreen(id) {
    document.querySelectorAll("section").forEach(sec => sec.classList.add("hidden"));
    const screen = document.getElementById(id);
    if (screen) screen.classList.remove("hidden");
  }

  showScreen("welcome-screen");
  let isLogin = true;

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
      ? "Don't have an account?"
      : "Already have an account?";
    document.getElementById("auth-toggle-btn").textContent = isLogin
      ? "Register here"
      : "Login here";
  });

  // --- Firebase auth ---
  document.getElementById("auth-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      if (isLogin) {
        await auth.signInWithEmailAndPassword(email, password);
      } else {
        await auth.createUserWithEmailAndPassword(email, password);
      }
      showScreen("role-selection-screen");
    } catch (err) {
      alert(err.message);
    }
  });

  // --- Role selection ---
  document.getElementById("role-seller").addEventListener("click", async () => {
    showScreen("seller-screen");
    loadSellerUploads(); // load previous uploads
  });
  document.getElementById("role-buyer").addEventListener("click", () => showScreen("buyer-screen"));
  document.getElementById("role-back-btn").addEventListener("click", () => {
    auth.signOut();
    showScreen("welcome-screen");
  });

  // --- Logout ---
  document.getElementById("seller-logout-btn").addEventListener("click", () => {
    auth.signOut();
    showScreen("welcome-screen");
  });
  document.getElementById("buyer-logout-btn").addEventListener("click", () => {
    auth.signOut();
    showScreen("welcome-screen");
  });
  document.getElementById("buyer-back-btn").addEventListener("click", () => {
    showScreen("buyer-screen");
  });

  // --- Seller Upload ---
  document.getElementById("land-upload-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const location = document.getElementById("land-location").value;
    const size = document.getElementById("land-size").value;
    const price = document.getElementById("land-price").value;
    const soilType = document.getElementById("soil-type").value;
    const usageSuitability = document.getElementById("usage-suitability").value;
    const pastUsage = document.getElementById("past-usage").value;
    const contactInfo = document.getElementById("contact-info").value;

    const landImages = document.getElementById("land-images").files;
    const landDocs = document.getElementById("land-documents").files;

    try {
      let imageUrls = [];
      let imagePublicIds = [];
      for (let img of landImages) {
        const result = await uploadToCloudinary(img); // new cloudinary.js function
        imageUrls.push(result.secure_url);
        imagePublicIds.push(result.public_id);
      }

      let docUrls = [];
      let docPublicIds = [];
      for (let doc of landDocs) {
        const result = await uploadToCloudinary(doc); // same function works for documents
        docUrls.push(result.secure_url);
        docPublicIds.push(result.public_id);
      }

      await db.collection("lands").add({
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

      alert("Land uploaded successfully!");
      e.target.reset();

      loadSellerUploads(); // refresh previous uploads
    } catch (err) {
      console.error("❌ Upload failed:", err);
      alert("Upload failed: " + err.message);
    }
  });

  // --- Load seller's previous uploads ---
  async function loadSellerUploads() {
    const uploadsDiv = document.getElementById("seller-previous-uploads");
    uploadsDiv.innerHTML = "";

    const querySnapshot = await db.collection("lands")
      .orderBy("createdAt", "desc")
      .get();

    querySnapshot.forEach((doc) => {
      const land = doc.data();
      const docId = doc.id;

      uploadsDiv.innerHTML += `
        <div class="p-4 bg-white border rounded shadow-lg text-left">
          ${land.imageUrls.map(url => `<img src="${url}" class="w-full h-40 object-cover rounded mb-2" alt="Land Image"/>`).join("")}
          <h3 class="font-bold text-lg">${land.location} - ${land.size} acres</h3>
          <p>Price: ₹${land.price}</p>
          <p>Soil: ${land.soilType}</p>
          <p>Suitable for: ${land.usageSuitability}</p>
          <p>Past Usage: ${land.pastUsage}</p>
          <p>Contact: ${land.contactInfo}</p>
          <button class="bg-red-600 text-white px-3 py-1 rounded mt-2 delete-btn" data-id="${docId}">DELETE</button>
        </div>
      `; 
    });

    // --- DELETE FEATURE with "DELETED" popup ---
    document.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        if (!confirm("Are you sure you want to delete this upload?")) return;

        try {
          const docRef = db.collection("lands").doc(id);
          const docSnap = await docRef.get();
          if (!docSnap.exists) throw new Error("Document not found");

          const land = docSnap.data();

          // Delete images from Cloudinary
          if (land.imagePublicIds) {
            for (const publicId of land.imagePublicIds) {
              await deleteFromCloudinary(publicId);
            }
          }

          // Delete documents from Cloudinary
          if (land.docPublicIds) {
            for (const publicId of land.docPublicIds) {
              await deleteFromCloudinary(publicId);
            }
          }

          // Delete Firestore record
          await docRef.delete();

          // Remove from UI instantly
          btn.closest("div").remove();

          alert("DELETED");
        } catch (err) {
          console.error(err);
          alert("Failed to delete upload: " + err.message);
        }
      });
    });
  }

  // --- Buyer search ---
  document.getElementById("search-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const location = document.getElementById("search-location").value.toLowerCase();
    const priceMin = parseInt(document.getElementById("search-price-min").value) || 0;
    const priceMax = parseInt(document.getElementById("search-price-max").value) || Infinity;
    const soilType = document.getElementById("search-soil-type").value.toLowerCase();
    const usageSuitability = document.getElementById("search-usage-suitability").value.toLowerCase();

    const querySnapshot = await db.collection("lands").get();
    const resultsDiv = document.getElementById("search-results");
    resultsDiv.innerHTML = "";

    querySnapshot.forEach((doc) => {
      const land = doc.data();

      if (
        (!location || (land.location && land.location.toLowerCase().includes(location))) &&
        (!soilType || (land.soilType && land.soilType.toLowerCase().includes(soilType))) &&
        (!usageSuitability || (land.usageSuitability && land.usageSuitability.toLowerCase().includes(usageSuitability))) &&
        land.price >= priceMin &&
        land.price <= priceMax
      ) {
        let imagesHTML = "";
        if (land.imageUrls && land.imageUrls.length > 0) {
          imagesHTML = land.imageUrls
            .map(url => `<img src="${url}" class="w-full h-40 object-cover rounded mb-2" alt="Land Image"/>`)
            .join("");
        }

        let docsHTML = "";
        if (land.docUrls && land.docUrls.length > 0) {
          docsHTML = `
            <div class="mt-2">
              <h4 class="font-semibold">Documents:</h4>
              <ul class="list-disc ml-6">
                ${land.docUrls.map(url => `<li><a href="${url}" target="_blank" class="text-blue-600 underline">View Document</a></li>`).join("")}
              </ul>
            </div>
          `;
        }

        resultsDiv.innerHTML += `
          <div class="p-4 bg-white border rounded shadow-lg text-left">
            ${imagesHTML}
            <h3 class="font-bold text-lg">${land.location} - ${land.size} acres</h3>
            <p>Price: ₹${land.price}</p>
            <p>Soil: ${land.soilType}</p>
            <p>Suitable for: ${land.usageSuitability}</p>
            <p>Past Usage: ${land.pastUsage}</p>
            <p>Contact: ${land.contactInfo}</p>
            ${docsHTML}
          </div>
        `;
      }
    });

    if (resultsDiv.innerHTML === "") {
      resultsDiv.innerHTML = `<p class="text-gray-600">No lands found for your criteria.</p>`;
    }

    showScreen("buyer-results-screen");
  });
});
