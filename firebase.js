// firebase.js — Firebase initialization & Firestore export
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore }  from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey:            "AIzaSyCoZmKmHMOLsUyPCZRvWj650B30cipn5cU",
  authDomain:        "ecommerce-wishlist.firebaseapp.com",
  projectId:         "ecommerce-wishlist",
  storageBucket:     "ecommerce-wishlist.firebasestorage.app",
  messagingSenderId: "601704112439",
  appId:             "1:601704112439:web:5c93ab58f7c58729c9bab2",
  measurementId:     "G-HQYCZQDC74"
};

const app = initializeApp(firebaseConfig);

/** Firestore database reference — import this wherever you need to read/write. */
export const db = getFirestore(app);
