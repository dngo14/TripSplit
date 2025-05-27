
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, type User, signInWithRedirect } from 'firebase/auth';
import { getFirestore, Timestamp, collection, addDoc, updateDoc, deleteDoc, doc, query, where, onSnapshot, arrayUnion, arrayRemove, writeBatch, getDocs, limit, runTransaction, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Critical check: Ensure essential config values are present *before* initializing.
// This log will appear in your server terminal and browser console.
if (!firebaseConfig.apiKey) {
  console.error("CRITICAL DIAGNOSTIC: firebaseConfig.apiKey is undefined. This means NEXT_PUBLIC_FIREBASE_API_KEY was not loaded from .env.local or is empty.");
}
if (!firebaseConfig.projectId) {
  console.error("CRITICAL DIAGNOSTIC: firebaseConfig.projectId is undefined. This means NEXT_PUBLIC_FIREBASE_PROJECT_ID was not loaded from .env.local or is empty.");
}

let app: FirebaseApp;
if (!getApps().length) {
  try {
    if (firebaseConfig.apiKey && firebaseConfig.projectId) {
      app = initializeApp(firebaseConfig);
      console.log("Firebase app instance initialized successfully.");
      if (firebaseConfig.apiKey) {
        console.log(`Firebase config using API Key starting with: ${firebaseConfig.apiKey.substring(0, 5)}...`);
      }
    } else {
      console.error("Firebase initialization skipped due to missing critical configuration (API Key or Project ID in firebaseConfig object). Check .env.local and ensure server was restarted.");
      // @ts-ignore app might not be initialized
      app = undefined; 
    }
  } catch (e: any) {
    console.error("Firebase initializeApp(firebaseConfig) error:", e.message);
    console.error("This usually means the API key or other Firebase config values, though present, are malformed or invalid according to Firebase SDK internal checks.");
    throw new Error(`Firebase initialization failed: ${e.message}. Double-check your Firebase config values in .env.local and in the Firebase Console.`);
  }
} else {
  app = getApps()[0];
  console.log("Firebase app already initialized. Using existing app.");
}

let auth;
let db;

try {
  // @ts-ignore If app is undefined due to config issues, this will throw.
  auth = getAuth(app);
  // @ts-ignore
  db = getFirestore(app);
  console.log("Firebase Auth and Firestore services obtained successfully.");
} catch (e: any) {
  console.error("Error calling getAuth(app) or getFirestore(app):", e.message);
  console.error("This usually means the API key or other Firebase config values are incorrect/restricted, or the Firebase services (Auth, Firestore) are not properly enabled in your Firebase project.");
  if (firebaseConfig.apiKey) {
    console.log(`Attempted to use API Key starting with: ${firebaseConfig.apiKey.substring(0, 5)}...`);
  } else {
    console.error("CRITICAL: Firebase API Key in firebaseConfig object evaluated as missing or undefined during service initialization. Check how firebaseConfig is populated from environment variables.");
  }
   if (!auth || !db) {
    throw new Error(`Firebase Auth or Firestore could not be initialized. Configured Project ID: ${firebaseConfig.projectId}. Check console for details.`);
  }
}

const googleProvider = new GoogleAuthProvider();

export { 
  app, 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signInWithRedirect,
  signOut, 
  Timestamp, 
  type User,
  collection, addDoc, updateDoc, deleteDoc, doc, query, where, onSnapshot, arrayUnion, arrayRemove, writeBatch, getDocs, limit, runTransaction, serverTimestamp
};
