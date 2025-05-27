
"use client";

import type React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { auth, googleProvider, signInWithPopup as firebaseSignInWithPopup, signOut as firebaseSignOut, type User, db, signInWithRedirect as firebaseSignInWithRedirect } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        console.log("AuthContext: User signed in - ", currentUser.uid, currentUser.email);
        // Create or update user profile in Firestore
        try {
          const userRef = doc(db, "users", currentUser.uid);
          await setDoc(userRef, {
            uid: currentUser.uid,
            email: currentUser.email ? currentUser.email.toLowerCase() : null, // Store email as lowercase
            displayName: currentUser.displayName || '',
            lastLogin: serverTimestamp()
          }, { merge: true }); // Merge true to avoid overwriting other fields if any
          console.log("AuthContext: User profile updated in Firestore for UID:", currentUser.uid);
        } catch (error) {
          console.error("AuthContext: Error updating user profile in Firestore:", error);
          // Optionally notify user or log more detailed error
        }
      } else {
        console.log("AuthContext: User signed out.");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    console.log("AuthContext: Attempting Google Sign-In...");
    try {
      const result = await firebaseSignInWithPopup(auth, googleProvider);
      // User state and Firestore profile update will be handled by onAuthStateChanged listener
      console.log("AuthContext: Google Sign-In successful. User data (from popup):", result.user?.uid, result.user?.email);
      toast({ title: "Signed In", description: "Successfully signed in with Google." });
    } catch (error: any) {
      console.error("AuthContext: Google Sign-In Failed. Raw error object:", error);
      console.error("AuthContext: Error Code:", error.code);
      console.error("AuthContext: Error Message:", error.message);
      
      let description = "Could not sign in with Google.";
      if (error.code === 'auth/unauthorized-domain') {
        const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'your current app domain';
        description = `This domain (${currentOrigin}) is not authorized for Google Sign-In. Please go to your Firebase project settings (Authentication > Sign-in method > Authorized domains) and add this exact domain. It may take a few minutes for changes to propagate.`;
      } else if (error.code === 'auth/popup-closed-by-user') {
        description = "Sign-in cancelled. The pop-up was closed before sign-in completed.";
      } else if (error.message) {
        description = error.message;
      }
      
      toast({ 
        title: "Sign In Failed", 
        description: description,
        variant: "destructive",
        duration: 15000, 
      });
      setLoading(false); 
    }
  };

  const signOut = async () => {
    setLoading(true);
    console.log("AuthContext: Attempting Sign-Out...");
    try {
      await firebaseSignOut(auth);
      toast({ title: "Signed Out", description: "Successfully signed out." });
    } catch (error: any) {
      console.error("AuthContext: Sign-Out Failed. Raw error object:", error);
      console.error("AuthContext: Error Code:", error.code);
      console.error("AuthContext: Error Message:", error.message);
      toast({ 
        title: "Sign Out Failed", 
        description: error.message || "Could not sign out.", 
        variant: "destructive" 
      });
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
