// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBE6d_l63THfPn-Qdu0vBa_tXR-scwG75I",
  authDomain: "inventory-40a11.firebaseapp.com",
  projectId: "inventory-40a11",
  storageBucket: "inventory-40a11.firebasestorage.app",
  messagingSenderId: "280564080996",
  appId: "1:280564080996:web:38052d35b7fb00fcc31a71",
  measurementId: "G-H0591HMPP8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app); // This part is important!

export { db };