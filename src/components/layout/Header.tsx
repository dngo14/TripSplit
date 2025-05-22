
"use client";

import { Coins, LogIn, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

interface HeaderProps {
  tripName?: string; // Optional now
}

export function AppHeader({ tripName }: HeaderProps) {
  const { user, loading, signInWithGoogle, signOut } = useAuth();

  return (
    <header className="bg-card text-card-foreground p-4 shadow-md sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Coins className="h-8 w-8" />
          <h1 className="text-2xl font-bold">TripSplit</h1>
        </div>
        <div className="flex items-center space-x-4">
          {tripName && <span className="text-lg hidden sm:inline">{tripName}</span>}
          {!tripName && !user && <span className="text-lg italic text-card-foreground/80 hidden sm:inline">No active trip</span>}
          
          {loading && <Skeleton className="h-8 w-24 rounded-md" />}
          {!loading && user && (
            <div className="flex items-center space-x-2">
              <span className="text-sm hidden md:inline">{user.displayName || user.email}</span>
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="mr-1 h-4 w-4" /> Logout
              </Button>
            </div>
          )}
          {!loading && !user && (
            <Button variant="outline" size="sm" onClick={signInWithGoogle}>
              <LogIn className="mr-1 h-4 w-4" /> Sign In with Google
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
