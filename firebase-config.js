// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyApg5Qopik6H44qMCTp7Id4sou4r5xzdT0",
    authDomain: "finance-app-33f0d.firebaseapp.com",
    projectId: "finance-app-33f0d",
    storageBucket: "finance-app-33f0d.appspot.com",
    messagingSenderId: "693771017354",
    appId: "1:693771017354:web:0f782acddc17363b2ce173"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
