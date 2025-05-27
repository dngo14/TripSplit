
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
    <header className="bg-card text-card-foreground p-4 shadow-md sticky top-0 z-50 w-full border-b border-border/50">
      <div className={cn(
        "container mx-auto flex items-center",
        user ? "justify-between" : "justify-center" // Center content if no user (sign-in page)
      )}>
        <div className="flex items-center space-x-2"> {/* Adjusted space for tighter logo */}
          <Coins className="h-8 w-8 text-primary-foreground/90" /> {/* Icon color matches text, slightly smaller */}
          <h1 className="text-3xl font-bold tracking-tight text-primary-foreground/90">TripSplit</h1>
        </div>
        
        {user && (
          <div className="flex items-center space-x-4">
            {tripName && <span className="text-lg hidden sm:inline text-muted-foreground">{tripName}</span>}
            {!tripName && <span className="text-lg italic text-muted-foreground/80 hidden sm:inline">No active trip</span>}
            
            {loading && <Skeleton className="h-8 w-24 rounded-md" />}
            {!loading && (
              <div className="flex items-center space-x-2">
                <span className="text-sm hidden md:inline text-muted-foreground">{user.displayName || user.email}</span>
                <Button variant="outline" size="sm" onClick={signOut} className="border-primary/50 hover:bg-primary/10">
                  <LogOut className="mr-1 h-4 w-4" /> Logout
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
