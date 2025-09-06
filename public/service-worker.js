// service-worker.js
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open("farm-app-cache").then((cache) => {
      return cache.addAll([
        "/",
        "/index.html",
        "/style.css",
        "/manifest.json",
        "/assets/logo.png",
        "/js/app.js",
        "/js/firebaseConfig.js",
        "/js/cloudinary.js"
      ]);
    })
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});
