/* ============================================
   FIREBASE CONFIGURATION

   To set up:
   1. Go to https://console.firebase.google.com
   2. Create a new project (name: "young-investor-simulator")
   3. Add a Web app (click </> icon)
   4. Copy your config values below
   5. Enable Authentication > Sign-in method > Email/Password AND Google
   6. Enable Cloud Firestore > Create database > Start in test mode
   ============================================ */


// Web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBn4T2jDsbYlr4ZgMmMkmXZAO8b400hJaw",
  authDomain: "younginvestor.app",
  projectId: "young-investor-simulator",
  storageBucket: "young-investor-simulator.firebasestorage.app",
  messagingSenderId: "194230791250",
  appId: "1:194230791250:web:9a178198af1011c411038b"
};


// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
