
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AppHeader } from '@/components/layout/Header';
import { Loader2, LogIn, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';


export default function RootPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/home');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <AppHeader />
        <main className="flex flex-col items-center justify-center flex-grow w-full">
            <div className="p-6 rounded-lg shadow-xl bg-card text-card-foreground flex flex-col items-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                Loading TripSplit...
            </div>
        </main>
      </div>
    );
  }

  if (!user) {
    // User not logged in, show sign-in prompt
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary/30 px-4">
        <AppHeader />
        <main className="flex flex-col items-center justify-center flex-grow w-full">
          <div className="w-full max-w-md p-8 space-y-6 rounded-xl shadow-2xl bg-card text-card-foreground">
            <div className="flex flex-col items-center space-y-2">
              <Coins className="h-16 w-16 text-primary" />
              <h2 className="text-3xl font-bold tracking-tight">Welcome to TripSplit!</h2>
            </div>
            <p className="text-center text-muted-foreground">
              Sign in with your Google account to start planning your trips and splitting expenses with ease.
            </p>
            <Button onClick={signInWithGoogle} size="lg" className="w-full text-base py-3">
                <LogIn className="mr-2 h-5 w-5" /> Sign In with Google
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // User is logged in but redirect hasn't happened yet (should be brief)
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <AppHeader />
        <main className="flex flex-col items-center justify-center flex-grow w-full">
            <div className="p-6 rounded-lg shadow-xl bg-card text-card-foreground flex flex-col items-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                Redirecting to your dashboard...
            </div>
        </main>
      </div>
  );
}
