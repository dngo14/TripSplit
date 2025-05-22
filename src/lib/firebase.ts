
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, type User } from 'firebase/auth';
import { getFirestore, Timestamp } from 'firebase/firestore'; // Added Firestore imports

// Your web app's Firebase configuration (HARCODED FOR DEBUGGING - from user input)
// IMPORTANT: For production, these should be in environment variables and NOT hardcoded.
// The user has confirmed they are managing this or are aware of the implications for this step.
const firebaseConfig = {
  apiKey: "AIzaSyCSGVJXoijtyGv1ecpXPy84bxdjCi1ocLc",
  authDomain: "tripsplit-19o80.firebaseapp.com",
  projectId: "tripsplit-19o80",
  storageBucket: "tripsplit-19o80.appspot.com", // Corrected from firebasestorage.app
  messagingSenderId: "1059293239010",
  appId: "1:1059293239010:web:2d61a2654e05063ecf30bb"
};

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  try {
    app = initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully with hardcoded config.");
  } catch (e: any) {
    console.error("Firebase initialization error with hardcoded config:", e.message);
    // If API key is missing or fundamentally wrong, initializeApp itself will throw.
    throw new Error(`Firebase initialization failed: ${e.message}. Check your Firebase config values.`);
  }
} else {
  app = getApps()[0];
  console.log("Firebase app already initialized (likely due to HMR). Using existing app.");
}

let auth;
let db; // Firestore instance

try {
  auth = getAuth(app);
  db = getFirestore(app); // Initialize Firestore
  console.log("Firebase Auth and Firestore services initialized.");
} catch (e: any) {
  console.error("Error calling getAuth(app) or getFirestore(app):", e.message);
  console.error("This usually means the API key or other Firebase config values are incorrect/restricted, even if initializeApp() did not throw an error immediately. Ensure your `.env.local` file is correct OR the hardcoded values are accurate and the Firebase project is properly set up with necessary services enabled and API key unrestricted for your domain.");
  // Log the API key being used if available in the config
  if (firebaseConfig.apiKey) {
    console.log(`Firebase config attempting to use API Key starting with: ${firebaseConfig.apiKey.substring(0, 5)}...`);
  } else {
    console.error("CRITICAL: Firebase API Key in firebaseConfig object is missing or undefined. Check how firebaseConfig is populated.");
  }
  throw e; // Re-throw the error to make it visible
}

const googleProvider = new GoogleAuthProvider();

export { app, auth, db, googleProvider, signInWithPopup, signOut, Timestamp, type User }; // Export db and Timestamp
