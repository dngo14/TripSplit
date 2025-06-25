
"use client";

import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { db, Timestamp, collection, addDoc, query, where, onSnapshot, doc, serverTimestamp } from '@/lib/firebase';
import type { TripData, Member } from '@/lib/types';
import { CURRENCIES, createInitialTripData } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';
import { AppHeader } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { PlusCircle, Edit3, DollarSign as CurrencyIcon, Loader2, Briefcase, LogIn, Coins } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { TripCard } from './TripCard';
import { prepareDataForFirestore } from '@/lib/firestore-utils';
import { isValid } from 'date-fns'; // Added import for isValid

export default function HomePage() {
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const [trips, setTrips] = useState<TripData[]>([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState(true);
  const [isCreateTripDialogOpen, setIsCreateTripDialogOpen] = useState(false);
  const [newTripName, setNewTripName] = useState('');
  const [newTripCurrency, setNewTripCurrency] = useState(CURRENCIES[0]);
  const { toast } = useToast();
  const router = useRouter();

  // Helper function to convert Firestore Timestamps to JS Dates recursively
  const convertTimestampsToDatesHomePage = (data: any): any => {
    if (data instanceof Timestamp) {
      return data.toDate();
    }
    if (Array.isArray(data)) {
      return data.map(convertTimestampsToDatesHomePage);
    }
    if (data && typeof data === 'object' && !(data instanceof Date) && typeof data.toDate !== 'function' && Object.getPrototypeOf(data) === Object.prototype) {
      const res: { [key: string]: any } = {};
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          res[key] = convertTimestampsToDatesHomePage(data[key]);
        }
      }
      return res;
    }
    return data;
  };


  useEffect(() => {
    if (!user) {
      setTrips([]);
      setIsLoadingTrips(false);
      return;
    }

    setIsLoadingTrips(true);
    const tripsCollectionRef = collection(db, "trips");
    const q = query(tripsCollectionRef, where("memberUIDs", "array-contains", user.uid));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const userTrips: TripData[] = [];
      querySnapshot.forEach((docSnapshot) => {
        const rawData = docSnapshot.data();
        
        // Ensure crucial arrays and optional fields are initialized
        const tripDataWithGuaranteedArrays: Partial<TripData> & {id?:string} = {
          tripName: rawData.tripName || 'Untitled Trip',
          currency: rawData.currency || CURRENCIES[0],
          creatorUID: rawData.creatorUID || '',
          members: Array.isArray(rawData.members) ? rawData.members.filter(m => m != null) : [],
          expenses: Array.isArray(rawData.expenses) ? rawData.expenses.filter(e => e != null) : [],
          itinerary: Array.isArray(rawData.itinerary) ? rawData.itinerary.filter(i => i != null && typeof i === 'object') : [],
          chatMessages: Array.isArray(rawData.chatMessages) ? rawData.chatMessages.filter(c => c != null) : [],
          memberUIDs: Array.isArray(rawData.memberUIDs) ? rawData.memberUIDs.filter(uid => uid != null) : [],
          
          // Optional fields from TripData
          destinationCity: rawData.destinationCity || '',
          destinationCountry: rawData.destinationCountry || '',
          tripStartDate: rawData.tripStartDate === undefined ? null : rawData.tripStartDate,
          tripEndDate: rawData.tripEndDate === undefined ? null : rawData.tripEndDate,
          budget: rawData.budget === undefined ? null : rawData.budget,
          accommodationAddress: rawData.accommodationAddress || '',
          flightDetails: rawData.flightDetails || '',
          notes: rawData.notes || '',
          lastUpdatedAt: rawData.lastUpdatedAt, // Keep as is for now, will be converted
          ...rawData, // Spread remaining raw data
        };
        
        // Convert all timestamps to dates
        let tripDataWithDates = convertTimestampsToDatesHomePage(tripDataWithGuaranteedArrays) as Omit<TripData, 'id'>;
        
        // Re-ensure arrays are clean after date conversion, just in case
        tripDataWithDates.members = Array.isArray(tripDataWithDates.members) ? tripDataWithDates.members.filter(m => m != null) : [];
        tripDataWithDates.expenses = Array.isArray(tripDataWithDates.expenses) ? tripDataWithDates.expenses.filter(e => e != null) : [];
        tripDataWithDates.itinerary = Array.isArray(tripDataWithDates.itinerary) ? tripDataWithDates.itinerary.filter(i => i != null && typeof i === 'object') : [];
        tripDataWithDates.chatMessages = Array.isArray(tripDataWithDates.chatMessages) ? tripDataWithDates.chatMessages.filter(c => c != null) : [];
        tripDataWithDates.memberUIDs = Array.isArray(tripDataWithDates.memberUIDs) ? tripDataWithDates.memberUIDs.filter(uid => uid != null) : [];

        userTrips.push({ id: docSnapshot.id, ...tripDataWithDates });
      });
      
      userTrips.sort((a,b) => {
        const dateAVal = a.lastUpdatedAt;
        const dateBVal = b.lastUpdatedAt;
        // Ensure a and b are valid dates before getTime()
        const dateA = dateAVal instanceof Date && isValid(dateAVal) ? dateAVal.getTime() : 0;
        const dateB = dateBVal instanceof Date && isValid(dateBVal) ? dateBVal.getTime() : 0;
        return (dateB || 0) - (dateA || 0); 
      });

      setTrips(userTrips);
      setIsLoadingTrips(false);
    }, (error) => {
      console.error("Error fetching trips from Firestore:", error);
      toast({ title: "Error Loading Trips", description: "Could not fetch your trips.", variant: "destructive" });
      setIsLoadingTrips(false);
    });

    return () => unsubscribe();
  }, [user, toast]);

  const handleCreateNewTrip = async () => {
    if (!newTripName.trim()) {
      toast({ title: "Trip name required", description: "Please enter a name for your new trip.", variant: "destructive"});
      return;
    }
    if (!user) { 
        toast({ title: "Authentication Error", description: "You must be logged in to create a trip.", variant: "destructive"});
        return;
    }

    const initialTripData = createInitialTripData(
        newTripName.trim(),
        newTripCurrency,
        user.uid, 
        user.displayName || undefined,
        user.email || undefined 
    );

    const tripDataForFirestore = prepareDataForFirestore(initialTripData);

    try {
      const docRef = await addDoc(collection(db, "trips"), tripDataForFirestore);
      toast({ title: "Trip Created", description: `"${initialTripData.tripName}" created. You've been added as the first member.`});
      setNewTripName('');
      setNewTripCurrency(CURRENCIES[0]);
      setIsCreateTripDialogOpen(false);
      router.push(`/trip/${docRef.id}`); 
    } catch (error) {
      console.error("Error creating new trip in Firestore:", error);
      toast({ title: "Error Creating Trip", description: "Could not save the new trip.", variant: "destructive"});
    }
  };


  if (authLoading) {
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

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 text-foreground">
      <AppHeader /> 
      <main className="flex-grow container mx-auto px-4 md:px-8 lg:px-12 py-6 md:py-8 lg:py-12 space-y-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3 tracking-tight">
              <Briefcase className="h-8 w-8 md:h-9 md:w-9 text-primary" /> 
              Your Trips
            </h1>
            <p className="text-base text-foreground/70 max-w-2xl">
              Manage your travel expenses, split costs with friends, and keep track of your adventures.
            </p>
          </div>
          <Dialog open={isCreateTripDialogOpen} onOpenChange={setIsCreateTripDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                <PlusCircle className="mr-2 h-5 w-5" /> Create New Trip
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a New Trip</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="newTripName" className="flex items-center mb-1"><Edit3 className="mr-2 h-4 w-4" />Trip Name</Label>
                  <Input
                    id="newTripName"
                    value={newTripName}
                    onChange={(e) => setNewTripName(e.target.value)}
                    placeholder="e.g., Summer Vacation '24"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="newTripCurrency" className="flex items-center mb-1"><CurrencyIcon className="mr-2 h-4 w-4" />Currency</Label>
                  <Select value={newTripCurrency} onValueChange={setNewTripCurrency}>
                    <SelectTrigger id="newTripCurrency" className="text-sm">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                    {CURRENCIES.map((curr) => (
                      <SelectItem key={curr} value={curr} className="text-sm">
                        {curr}
                      </SelectItem>
                    ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateTripDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateNewTrip}>Create Trip</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoadingTrips && (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="ml-3 text-muted-foreground">Loading your trips...</p>
          </div>
        )}

        {!isLoadingTrips && trips.length === 0 && (
          <div className="text-center p-12 md:p-16 bg-gradient-to-br from-card to-card/50 rounded-2xl shadow-xl border border-border/50 backdrop-blur-sm">
            <div className="max-w-md mx-auto space-y-6">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <Briefcase className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-card-foreground">Ready for your next adventure?</h2>
                <p className="text-foreground/70 leading-relaxed">
                  Create your first trip to start organizing expenses, planning activities, and sharing memories with your travel companions.
                </p>
              </div>
              <Button 
                onClick={() => setIsCreateTripDialogOpen(true)}
                size="lg" 
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <PlusCircle className="mr-2 h-5 w-5" /> Create Your First Trip
              </Button>
            </div>
          </div>
        )}

        {!isLoadingTrips && trips.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 bg-primary rounded-full"></div>
                <span className="text-lg font-medium text-foreground/80">
                  {trips.length} trip{trips.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
              {trips.map((trip, index) => (
                <div 
                  key={trip.id} 
                  className="animate-in fade-in-0 slide-in-from-bottom-4 fill-mode-both"
                  style={{ animationDelay: `${index * 100}ms`, animationDuration: '600ms' }}
                >
                  <TripCard trip={trip} />
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      <footer className="border-t border-border/30 bg-card/30 backdrop-blur-sm">
        <div className="container mx-auto px-4 md:px-8 lg:px-12 py-6">
          <div className="text-center space-y-2">
            <p className="text-foreground/60 text-sm font-medium">
              TripSplit &copy; {new Date().getFullYear()}
            </p>
            <p className="text-foreground/40 text-xs">
              Split expenses, share memories, travel together.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
