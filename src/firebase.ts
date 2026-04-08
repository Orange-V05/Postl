import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCwH_6QiixXTx7ykYFFo7OaBdFeXh4yrew",
  authDomain: "postl-0.firebaseapp.com",
  projectId: "postl-0",
  storageBucket: "postl-0.firebasestorage.app",
  messagingSenderId: "967745172933",
  appId: "1:967745172933:web:171eb0ffef3b7f912847ac",
  measurementId: "G-H4ZZ3DS0YJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const db = getFirestore(app);
