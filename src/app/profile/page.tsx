"use client";

import type React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AppHeader } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  Settings, 
  HelpCircle, 
  Info, 
  Shield, 
  Star, 
  LogOut,
  Mail,
  ExternalLink
} from 'lucide-react';

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSignOutDialogOpen, setIsSignOutDialogOpen] = useState(false);

  if (!user) {
    router.replace('/');
    return null;
  }

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({ 
        title: "Signed Out", 
        description: "You have been successfully signed out." 
      });
      router.replace('/');
    } catch (error) {
      console.error('Sign out error:', error);
      toast({ 
        title: "Sign Out Error", 
        description: "Failed to sign out. Please try again.", 
        variant: "destructive" 
      });
    }
    setIsSignOutDialogOpen(false);
  };

  const handleAbout = () => {
    toast({
      title: "About TripSplit",
      description: "TripSplit helps you manage shared expenses and plan trips with friends. Split costs, track payments, and stay organized throughout your journey.",
    });
  };

  const handleSupport = () => {
    window.open('mailto:support@tripsplit.app?subject=TripSplit Support', '_blank');
  };

  const handlePrivacy = () => {
    window.open('https://tripsplit.app/privacy', '_blank');
  };

  const handleRateApp = () => {
    toast({
      title: "Rate TripSplit",
      description: "Thank you for your interest! Rating functionality would be integrated with your platform's store.",
    });
  };

  const menuItems = [
    {
      icon: Settings,
      title: 'Settings',
      subtitle: 'App preferences and notifications',
      action: () => toast({ 
        title: "Settings", 
        description: "Settings page coming soon!" 
      }),
    },
    {
      icon: HelpCircle,
      title: 'Help & Support',
      subtitle: 'Get help with the app',
      action: handleSupport,
    },
    {
      icon: Info,
      title: 'About',
      subtitle: 'Learn more about TripSplit',
      action: handleAbout,
    },
    {
      icon: Shield,
      title: 'Privacy Policy',
      subtitle: 'View our privacy policy',
      action: handlePrivacy,
    },
    {
      icon: Star,
      title: 'Rate the App',
      subtitle: 'Share your feedback',
      action: handleRateApp,
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <AppHeader />
      <main className="flex-grow container mx-auto px-4 md:px-8 lg:px-12 py-6 md:py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Profile Header */}
          <Card className="shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl mb-4">Profile</CardTitle>
            </CardHeader>
            <CardContent>
              {/* User Info Section */}
              <div className="flex items-center space-x-4 p-6 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg mb-6">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-foreground">
                    {user.displayName || 'Anonymous User'}
                  </h2>
                  <p className="text-muted-foreground flex items-center">
                    <Mail className="w-4 h-4 mr-2" />
                    {user.email || 'No email'}
                  </p>
                </div>
              </div>

              {/* Menu Items */}
              <div className="space-y-2">
                {menuItems.map((item, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    className="w-full justify-start h-auto p-4 hover:bg-secondary/50"
                    onClick={item.action}
                  >
                    <div className="flex items-center space-x-4 w-full">
                      <item.icon className="w-5 h-5 text-muted-foreground" />
                      <div className="flex-1 text-left">
                        <div className="font-medium">{item.title}</div>
                        <div className="text-sm text-muted-foreground">{item.subtitle}</div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </Button>
                ))}
              </div>

              {/* Sign Out Section */}
              <div className="mt-6 pt-6 border-t border-border">
                <AlertDialog open={isSignOutDialogOpen} onOpenChange={setIsSignOutDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      className="w-full"
                      onClick={() => setIsSignOutDialogOpen(true)}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Sign Out</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to sign out? You'll need to sign in again to access your trips.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleSignOut}>
                        Sign Out
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>

          {/* App Info */}
          <Card className="shadow-lg">
            <CardContent className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-2">TripSplit Web v1.0.0</p>
              <p className="text-xs text-muted-foreground">© 2024 TripSplit. All rights reserved.</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}