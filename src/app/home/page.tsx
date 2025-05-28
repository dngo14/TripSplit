
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
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background to-secondary/30 text-foreground">
      <AppHeader /> 
      <main className="flex-grow container mx-auto p-4 md:p-6 space-y-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold flex items-center">
            <Briefcase className="mr-3 h-7 w-7 text-primary" /> Your Trips
          </h1>
          <Dialog open={isCreateTripDialogOpen} onOpenChange={setIsCreateTripDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="text-sm border-primary/50 hover:bg-primary/10">
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
          <div className="text-center p-10 bg-card/80 backdrop-blur-sm rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-2 text-card-foreground">No trips yet!</h2>
            <p className="text-muted-foreground mb-4">Click "Create New Trip" to start planning.</p>
          </div>
        )}

        {!isLoadingTrips && trips.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {trips.map(trip => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        )}
      </main>
      <footer className="text-center p-4 text-muted-foreground text-sm border-t border-border/50">
        TripSplit &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
