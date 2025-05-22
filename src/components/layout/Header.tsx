
"use client";

import { Coins, LogIn, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface HeaderProps {
  tripName?: string; 
}

export function AppHeader({ tripName }: HeaderProps) {
  const { user, loading, signInWithGoogle, signOut } = useAuth();

  return (
    <header className="bg-card text-card-foreground p-4 shadow-md sticky top-0 z-50">
      <div className={cn(
        "container mx-auto flex items-center",
        user ? "justify-between" : "justify-center" // Center content if no user (sign-in page)
      )}>
        <div className="flex items-center space-x-2">
          <Coins className="h-8 w-8 text-primary" /> {/* Ensure icon has contrast */}
          <h1 className="text-2xl font-bold">TripSplit</h1>
        </div>

        {/* This section is only shown if a user is logged in */}
        {user && (
          <div className="flex items-center space-x-4">
            {tripName && <span className="text-lg hidden sm:inline">{tripName}</span>}
            {!tripName && <span className="text-lg italic text-card-foreground/80 hidden sm:inline">No active trip</span>}
            
            {loading && <Skeleton className="h-8 w-24 rounded-md" />}
            {!loading && ( // Auth buttons for logged-in user
              <div className="flex items-center space-x-2">
                <span className="text-sm hidden md:inline">{user.displayName || user.email}</span>
                <Button variant="outline" size="sm" onClick={signOut}>
                  <LogOut className="mr-1 h-4 w-4" /> Logout
                </Button>
              </div>
            )}
          </div>
        )}
        {/* No Sign In button in the header if !user, as the sign-in page itself has the CTA */}
      </div>
    </header>
  );
}
