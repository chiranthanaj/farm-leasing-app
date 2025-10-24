// --- Firebase Configuration ---
// This file sets up the connection to your Firebase project and initializes services.

const firebaseConfig = {
  apiKey: "AIzaSyA1girtWjcJqXcykKj_20MdL8JQnlIccqE",
  authDomain: "farm-leasing-app.firebaseapp.com",
  projectId: "farm-leasing-app",
  storageBucket: "farm-leasing-app.appspot.com",
  messagingSenderId: "662238855221",
  appId: "1:662238855221:web:f0aabdfa7655dcf322f17c"
};

// Initialize Firebase App
firebase.initializeApp(firebaseConfig);

// Initialize services (make them globally available for app.js)
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
