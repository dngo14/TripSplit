
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, type User } from 'firebase/auth';

// IMPORTANT: Firebase Configuration
// These values are read from your .env.local file located in the root of your project.
// Ensure that .env.local exists and that all variables are correctly prefixed with NEXT_PUBLIC_.
// Example .env.local content:
// NEXT_PUBLIC_FIREBASE_API_KEY=your_actual_api_key
// NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
// NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
// NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
// NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
// NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Explicitly check if the API key environment variable was loaded by Next.js.
// If this message appears in your console, it means NEXT_PUBLIC_FIREBASE_API_KEY is undefined.
// This usually indicates an issue with your .env.local file (missing, wrong location, wrong prefix, or server not restarted).
if (!firebaseConfig.apiKey) {
  console.error(
    'CRITICAL: Firebase API Key (NEXT_PUBLIC_FIREBASE_API_KEY) is missing or undefined when initializing Firebase. ' +
    'Please ensure it is correctly set in your .env.local file (in the project root), ' +
    'all Firebase environment variables are prefixed with NEXT_PUBLIC_, ' +
    'and you have RESTARTED your development server after creating/modifying the .env.local file.'
  );
} else {
  // This log helps confirm if *a* value for apiKey is being passed.
  // If you see this log but still get "auth/invalid-api-key", the API key *value* itself is likely incorrect or restricted.
  console.log('Firebase config attempting to use API Key starting with: ' + firebaseConfig.apiKey.substring(0, 5) + '...');
  // You can also log other config values here for debugging if needed:
  // console.log('Firebase config authDomain: ' + firebaseConfig.authDomain);
  // console.log('Firebase config projectId: ' + firebaseConfig.projectId);
}

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  // If firebaseConfig.apiKey is undefined here, initializeApp will likely throw an error.
  // If firebaseConfig.apiKey has a value but Firebase still throws "auth/invalid-api-key",
  // it means the key *value* itself is incorrect or restricted in your Firebase/Google Cloud project.
  try {
    app = initializeApp(firebaseConfig);
  } catch (e: any) {
    console.error("Firebase initialization error:", e.message);
    // Re-throw the error if you want the app to stop, or handle it gracefully
    // For now, we'll let it proceed so getAuth can also attempt and potentially fail with a more specific message
    // if initializeApp itself doesn't throw a clear "invalid-api-key" type error.
    // If initializeApp throws, the `auth` constant below might not be reached.
    // A common pattern is to throw here or set a flag to prevent further Firebase calls.
    throw new Error(`Firebase initialization failed: ${e.message}. Check your Firebase config and .env.local file.`);
  }
} else {
  app = getApps()[0];
}

// This line (getAuth) is where Firebase often throws "auth/invalid-api-key"
// if the apiKey provided in firebaseConfig is rejected by Firebase services.
// If the console.log above shows an API key prefix, but this line still errors,
// then the API key *VALUE* in your .env.local is almost certainly wrong or the key is restricted in your Firebase project.
let auth;
try {
  auth = getAuth(app);
} catch (e: any) {
  console.error("Error calling getAuth(app):", e.message);
  console.error("This usually means the API key or other Firebase config values are incorrect/restricted, even if initializeApp() did not throw an error immediately.");
  throw e; // Re-throw the error to make it visible
}

const googleProvider = new GoogleAuthProvider();

export { app, auth, googleProvider, signInWithPopup, signOut, type User };
