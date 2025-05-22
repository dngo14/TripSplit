
"use client";

import type React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { auth, googleProvider, signInWithPopup as firebaseSignInWithPopup, signOut as firebaseSignOut, type User } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
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
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        console.log("AuthContext: User signed in - ", currentUser.uid, currentUser.email);
      } else {
        console.log("AuthContext: User signed out.");
      }
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    console.log("AuthContext: Attempting Google Sign-In...");
    try {
      const result = await firebaseSignInWithPopup(auth, googleProvider);
      // User state will be updated by onAuthStateChanged listener
      console.log("AuthContext: Google Sign-In successful. User data (from popup):", result.user?.uid, result.user?.email);
      toast({ title: "Signed In", description: "Successfully signed in with Google." });
    } catch (error: any) {
      console.error("AuthContext: Google Sign-In Failed. Raw error object:", error);
      console.error("AuthContext: Error Code:", error.code);
      console.error("AuthContext: Error Message:", error.message);
      
      let description = "Could not sign in with Google.";
      if (error.code === 'auth/unauthorized-domain') {
        description = "This domain is not authorized for Google Sign-In. Please check your Firebase project's authorized domains list and ensure 'localhost' (and your deployment domain) are added. It may take a few minutes for changes to propagate.";
      } else if (error.code === 'auth/popup-closed-by-user') {
        description = "Sign-in cancelled. The pop-up was closed before sign-in completed.";
      } else if (error.message) {
        description = error.message;
      }
      
      toast({ 
        title: "Sign In Failed", 
        description: description,
        variant: "destructive",
        duration: 9000, // Longer duration for error messages
      });
      setLoading(false); // Reset loading on error
    }
    // setLoading(false) is handled by onAuthStateChanged or the catch block
  };

  const signOut = async () => {
    setLoading(true);
    console.log("AuthContext: Attempting Sign-Out...");
    try {
      await firebaseSignOut(auth);
      // User state will be updated by onAuthStateChanged
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
      setLoading(false); // Reset loading on error
    }
    // setLoading(false) is handled by onAuthStateChanged or the catch block
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

