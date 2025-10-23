import { uploadToCloudinary, deleteFromCloudinary } from "./cloudinary.js";

document.addEventListener("DOMContentLoaded", () => {

  function showScreen(id) {
    document.querySelectorAll("section").forEach(sec => sec.classList.add("hidden"));
    const screen = document.getElementById(id);
    if (screen) screen.classList.remove("hidden");
  }

  showScreen("welcome-screen");
  let isLogin = true;

  // ---------- Auth & Role Selection ----------
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

  document.getElementById("auth-back-btn").addEventListener("click", () => showScreen("welcome-screen"));

  document.getElementById("auth-toggle-btn").addEventListener("click", () => {
    isLogin = !isLogin;
    document.getElementById("auth-title").textContent = isLogin ? "Login" : "Register";
    document.getElementById("auth-toggle-text").textContent = isLogin ? "Don't have an account?" : "Already have an account?";
    document.getElementById("auth-toggle-btn").textContent = isLogin ? "Register here" : "Login here";
  });

  document.getElementById("auth-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    try {
      if (isLogin) await auth.signInWithEmailAndPassword(email, password);
      else await auth.createUserWithEmailAndPassword(email, password);
      showScreen("role-selection-screen");
    } catch (err) { alert(err.message); }
  });

  document.getElementById("role-seller").addEventListener("click", () => { showScreen("seller-screen"); loadSellerUploads(); });
  document.getElementById("role-buyer").addEventListener("click", () => showScreen("buyer-screen"));
  document.getElementById("role-back-btn").addEventListener("click", () => { auth.signOut(); showScreen("welcome-screen"); });

  document.getElementById("seller-logout-btn").addEventListener("click", () => { auth.signOut(); showScreen("welcome-screen"); });
  document.getElementById("buyer-logout-btn").addEventListener("click", () => { auth.signOut(); showScreen("welcome-screen"); });
  document.getElementById("buyer-back-btn").addEventListener("click", () => showScreen("buyer-screen"));

  // ---------- Seller Upload ----------
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
      const imageResults = await Promise.all(Array.from(landImages).map(f => uploadToCloudinary(f)));
      const docResults = await Promise.all(Array.from(landDocs).map(f => uploadToCloudinary(f)));

      await db.collection("lands").add({
        location,
        size,
        price: Number(price),
        soilType,
        usageSuitability,
        pastUsage,
        contactInfo,
        imageUrls: imageResults.map(r => r.secure_url),
        imagePublicIds: imageResults.map(r => r.public_id),
        imageResourceTypes: imageResults.map(r => r.resource_type || "image"),
        docUrls: docResults.map(r => r.secure_url),
        docPublicIds: docResults.map(r => r.public_id),
        docResourceTypes: docResults.map(r => r.resource_type || "raw"),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      alert("Land uploaded successfully!");
      e.target.reset();
      loadSellerUploads();
    } catch (err) { console.error(err); alert("Upload failed: " + err.message); }
  });

  // ---------- Load Seller Uploads & Delete ----------
  async function loadSellerUploads() {
    const uploadsDiv = document.getElementById("seller-previous-uploads");
    uploadsDiv.innerHTML = "";
    const querySnapshot = await db.collection("lands").orderBy("createdAt", "desc").get();

    querySnapshot.forEach(doc => {
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

    // Delete handler
    document.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        if (!confirm("Are you sure you want to delete this upload?")) return;

        try {
          const docRef = db.collection("lands").doc(id);
          const docSnap = await docRef.get();
          if (!docSnap.exists) throw new Error("Document not found");

          const land = docSnap.data();

          const imageDeletePromises = (land.imagePublicIds || []).map((pid, i) =>
            deleteFromCloudinary(pid, land.imageResourceTypes[i] || "image").catch(e => null)
          );
          const docDeletePromises = (land.docPublicIds || []).map((pid, i) =>
            deleteFromCloudinary(pid, land.docResourceTypes[i] || "raw").catch(e => null)
          );

          await Promise.all([...imageDeletePromises, ...docDeletePromises]);
          await docRef.delete();
          btn.closest("div").remove();
          alert("✅ Land deleted successfully!");
        } catch (err) { console.error(err); alert("Failed to delete: " + err.message); }
      });
    });
  }

  // ---------- Buyer Search ----------
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

    querySnapshot.forEach(doc => {
      const land = doc.data();
      if (
        (!location || (land.location && land.location.toLowerCase().includes(location))) &&
        (!soilType || (land.soilType && land.soilType.toLowerCase().includes(soilType))) &&
        (!usageSuitability || (land.usageSuitability && land.usageSuitability.toLowerCase().includes(usageSuitability))) &&
        land.price >= priceMin && land.price <= priceMax
      ) {
        const imagesHTML = land.imageUrls?.map(u => `<img src="${u}" class="w-full h-40 object-cover rounded mb-2"/>`).join("") || "";
        const docsHTML = land.docUrls?.length
          ? `<div class="mt-2"><h4 class="font-semibold">Documents:</h4><ul class="list-disc ml-6">${land.docUrls.map(u => `<li><a href="${u}" target="_blank" class="text-blue-600 underline">View Document</a></li>`).join("")}</ul></div>`
          : "";

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

    if (!resultsDiv.innerHTML) resultsDiv.innerHTML = `<p class="text-gray-600">No lands found.</p>`;
    showScreen("buyer-results-screen");
  });

});
