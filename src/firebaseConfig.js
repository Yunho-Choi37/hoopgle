import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: "AIzaSyBHQC6sTTqTOuQTC1rLRSbwZy8XKobP0Kk",
    authDomain: "hoopgle-hoopdex.firebaseapp.com",
    projectId: "hoopgle-hoopdex",
    storageBucket: "hoopgle-hoopdex.firebasestorage.app",
    messagingSenderId: "838833662960",
    appId: "1:838833662960:web:066f756c78fe42bf20cb35",
    measurementId: "G-QGTVGR6EFF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Auth and Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
