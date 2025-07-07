
"use client";

import Link from 'next/link';
import { Coins, LogIn, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { ThemeToggle } from '@/components/ui/theme-toggle';
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
        user ? "justify-between" : "justify-center" 
      )}>
        <Link href="/home" passHref>
          <div className="flex items-center space-x-2 cursor-pointer">
            <Coins className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight text-foreground">TripSplit</h1>
          </div>
        </Link>
        
        <div className="flex items-center gap-4">
          <ThemeToggle />
          {user && (
            <>
              {tripName && <span className="text-lg hidden sm:inline text-foreground/80 font-medium">{tripName}</span>}
              {/* Removed "Homescreen" text display */}
              
              {loading && <Skeleton className="h-8 w-24 rounded-md" />}
              {!loading && (
                <div className="flex items-center gap-3">
                  <span className="text-sm hidden md:inline text-foreground/70 font-medium">{user.displayName || user.email}</span>
                  <Link href="/profile">
                    <Button variant="ghost" size="sm" className="hover:bg-primary/10">
                      <User className="mr-1 h-4 w-4" /> Profile
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm" onClick={signOut} className="border-primary/50 hover:bg-primary/10">
                    <LogOut className="mr-1 h-4 w-4" /> Logout
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
