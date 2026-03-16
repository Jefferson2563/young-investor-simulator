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

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
