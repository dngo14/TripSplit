
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { db, Timestamp } from '@/lib/firebase'; // Import db and Timestamp
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, onSnapshot, arrayUnion, arrayRemove, writeBatch } from 'firebase/firestore';
import { AppHeader } from '@/components/layout/Header';
import { MemberManager } from '@/components/trip/MemberManager';
import { ExpenseForm } from '@/components/trip/ExpenseForm';
import { ExpenseList } from '@/components/trip/ExpenseList';
import { SettlementSummary } from '@/components/trip/SettlementSummary';
import { ChatRoom } from '@/components/trip/ChatRoom';
import { TripSettings } from '@/components/trip/TripSettings';
import { EditExpenseDialog } from '@/components/trip/EditExpenseDialog';
import { ItineraryList } from '@/components/trip/ItineraryList';
import { ItineraryFormDialog } from '@/components/trip/ItineraryFormDialog';
import { EditItineraryItemDialog } from '@/components/trip/EditItineraryItemDialog';
import { TripInfo } from '@/components/trip/TripInfo';

import type { AppState, TripData, Member, Expense, Comment as ExpenseComment, ChatMessage, ItineraryItem, ItineraryComment } from '@/lib/types';
import { INITIAL_APP_STATE, createInitialTripData, CURRENCIES } from '@/lib/constants';
import { calculateSettlements } from '@/lib/settlement';
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCircle, Briefcase, PlusCircle, Edit3, DollarSign as CurrencyIcon, Settings, Users, Activity, Trash2, MessageSquare, MapPin, CalendarPlus, InfoIcon, LogIn, Coins, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// Helper to convert Firestore Timestamps to JS Dates in nested structures
const convertTimestampsToDates = (data: any): any => {
  if (data instanceof Timestamp) {
    return data.toDate();
  }
  if (Array.isArray(data)) {
    return data.map(convertTimestampsToDates);
  }
  if (typeof data === 'object' && data !== null) {
    const res: { [key: string]: any } = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        res[key] = convertTimestampsToDates(data[key]);
      }
    }
    return res;
  }
  return data;
};

// Helper to convert JS Dates to Firestore Timestamps and undefined to null
const prepareDataForFirestore = (data: any): any => {
  if (data instanceof Date) {
    return Timestamp.fromDate(data);
  }
  if (data === undefined) {
    return null; // Convert top-level undefined to null
  }
  if (Array.isArray(data)) {
    return data.map(prepareDataForFirestore); // Recursively process array elements
  }
  if (typeof data === 'object' && data !== null) {
    const res: { [key: string]: any } = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const value = data[key];
        if (value === undefined) {
          res[key] = null; // Convert undefined properties to null
        } else {
          res[key] = prepareDataForFirestore(value); // Recursively process property values
        }
      }
    }
    return res;
  }
  return data; // Primitives, null, etc.
};


export default function TripPage() {
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const [appState, setAppState] = useState<AppState>(INITIAL_APP_STATE);
  const [currentUserId, setCurrentUserId] = useState<string>(''); 
  const [isClient, setIsClient] = useState(false);
  const [isCreateTripDialogOpen, setIsCreateTripDialogOpen] = useState(false);
  const [newTripName, setNewTripName] = useState('');
  const [newTripCurrency, setNewTripCurrency] = useState(CURRENCIES[0]);
  
  const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);
  const [isDeleteConfirmationDialogOpen, setIsDeleteConfirmationDialogOpen] = useState(false);
  const [itemTypeToDelete, setItemTypeToDelete] = useState<'expense' | 'itinerary' | 'trip' | null>(null);

  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const [isEditExpenseDialogOpen, setIsEditExpenseDialogOpen] = useState(false);

  const [isAddItineraryItemDialogOpen, setIsAddItineraryItemDialogOpen] = useState(false);
  const [itineraryItemToEdit, setItineraryItemToEdit] = useState<ItineraryItem | null>(null);
  const [isEditItineraryItemDialogOpen, setIsEditItineraryItemDialogOpen] = useState(false);
  const [isLoadingTrips, setIsLoadingTrips] = useState(true);

  const { toast } = useToast();
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  const activeTrip = useMemo(() => {
    if (!isClient || !user) return undefined; 
    return appState.trips.find(trip => trip.id === appState.activeTripId);
  }, [appState.trips, appState.activeTripId, isClient, user]);

  // Load trips from Firestore
  useEffect(() => {
    if (!user || !isClient) {
      setAppState(INITIAL_APP_STATE); 
      setCurrentUserId('');
      setIsLoadingTrips(false);
      return;
    }

    setIsLoadingTrips(true);
    const tripsCollectionRef = collection(db, "trips");
    const q = query(tripsCollectionRef, where("memberUIDs", "array-contains", user.uid));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const userTrips: TripData[] = [];
      querySnapshot.forEach((docSnapshot) => {
        const tripDataWithDates = convertTimestampsToDates(docSnapshot.data()) as Omit<TripData, 'id'>;
        userTrips.push({ id: docSnapshot.id, ...tripDataWithDates });
      });
      
      userTrips.sort((a,b) => (b.lastUpdatedAt?.toDate?.().getTime() || 0) - (a.lastUpdatedAt?.toDate?.().getTime() || 0));


      setAppState(prev => {
        let newActiveTripId = prev.activeTripId;
        if (!newActiveTripId && userTrips.length > 0) {
          newActiveTripId = userTrips[0].id;
        } else if (newActiveTripId && !userTrips.find(t => t.id === newActiveTripId)) {
          newActiveTripId = userTrips.length > 0 ? userTrips[0].id : null;
        }
        
        if (newActiveTripId) {
          const newActiveTrip = userTrips.find(t => t.id === newActiveTripId);
          if (newActiveTrip && newActiveTrip.members.length > 0) {
             const creatorAsMember = newActiveTrip.members.find(m => m.id === user.uid);
             if(creatorAsMember) {
                setCurrentUserId(creatorAsMember.id);
             } else if (newActiveTrip.members.length > 0) {
                setCurrentUserId(newActiveTrip.members[0].id);
             } else {
                setCurrentUserId('');
             }
          } else {
            setCurrentUserId('');
          }
        } else {
          setCurrentUserId('');
        }
        return { trips: userTrips, activeTripId: newActiveTripId };
      });
      setIsLoadingTrips(false);
    }, (error) => {
      console.error("Error fetching trips from Firestore:", error);
      toast({ title: "Error Loading Trips", description: "Could not fetch your trips from the database.", variant: "destructive" });
      setIsLoadingTrips(false);
      setAppState(INITIAL_APP_STATE); 
    });

    return () => unsubscribe();
  }, [user, isClient, toast]);


  const handleSelectTrip = (tripId: string) => {
    const selectedTrip = appState.trips.find(t => t.id === tripId);
    if (selectedTrip) {
      setAppState(prev => ({ ...prev, activeTripId: tripId }));
      const userAsMember = selectedTrip.members.find(m => m.id === user?.uid);
      if (userAsMember) {
        setCurrentUserId(userAsMember.id);
      } else if (selectedTrip.members.length > 0) {
        setCurrentUserId(selectedTrip.members[0].id); 
      } else {
        setCurrentUserId('');
      }
    }
  };

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
        user.displayName || user.email || "Trip Creator", 
        user.email || undefined
    );
    
    const tripDataForFirestore = prepareDataForFirestore(initialTripData);

    try {
      const docRef = await addDoc(collection(db, "trips"), tripDataForFirestore);
      toast({ title: "Trip Created", description: `"${initialTripData.tripName}" has been created with you as the first member.`});
      setNewTripName('');
      setNewTripCurrency(CURRENCIES[0]);
      setIsCreateTripDialogOpen(false);
      // Optimistically set as active trip or let onSnapshot handle it
      // handleSelectTrip(docRef.id); // or setAppState(prev => ({ ...prev, activeTripId: docRef.id }));
      // setCurrentUserId(user.uid);
    } catch (error) {
      console.error("Error creating new trip in Firestore:", error);
      toast({ title: "Error Creating Trip", description: "Could not save the new trip to the database.", variant: "destructive"});
    }
  };
  
  const updateActiveTripInFirestore = useCallback(async (updatedTripData: Partial<TripData>) => {
    if (!activeTrip || !activeTrip.id) return;
    
    const tripRef = doc(db, "trips", activeTrip.id);
    try {
      const dataForFirestore = prepareDataForFirestore({
        ...updatedTripData,
        lastUpdatedAt: Timestamp.now()
      });
      await updateDoc(tripRef, dataForFirestore);
    } catch (error) {
      console.error("Error updating trip in Firestore:", error, "Original update data:", updatedTripData);
      toast({ title: "Error Updating Trip", description: "Could not save changes to the database.", variant: "destructive" });
    }
  }, [activeTrip, toast]);


  const handleAddMember = async (name: string, email?: string) => {
    if (!activeTrip) return;
    if (activeTrip.members.find(m => m.name.toLowerCase() === name.toLowerCase())) {
      toast({ title: "Member name exists", description: `A member named "${name}" already exists in this trip.`, variant: "destructive" });
      return;
    }
    if (email && activeTrip.members.find(m => m.email?.toLowerCase() === email.toLowerCase())) {
        toast({ title: "Member email exists", description: `A member with email "${email}" already exists in this trip.`, variant: "destructive" });
        return;
    }

    const newMember: Member = { id: crypto.randomUUID(), name, email: email || undefined };
    const updatedMembers = [...activeTrip.members, newMember];
    await updateActiveTripInFirestore({ members: updatedMembers });
    toast({ title: "Member Added", description: `${name} has been added to "${activeTrip.tripName}".`});
  };

  const handleRemoveMember = async (id: string) => {
    if (!activeTrip || !user) return;
    
    const memberToRemove = activeTrip.members.find(m => m.id === id);
    if (memberToRemove && memberToRemove.id === user.uid && activeTrip.members.length === 1) {
        toast({ title: "Cannot remove self", description: "You are the only member and creator. To remove yourself, delete the trip.", variant: "destructive"});
        return;
    }
     if (memberToRemove && memberToRemove.id === user.uid && activeTrip.creatorUID === user.uid) {
        toast({ title: "Cannot remove trip creator", description: "The trip creator cannot be removed from the members list this way.", variant: "destructive"});
        return;
    }

    const isPayer = activeTrip.expenses.some(exp => exp.paidById === id);
    const isInvolvedInSplit = activeTrip.expenses.some(exp => 
      (exp.splitDetails || []).some(detail => detail.memberId === id) || 
      (exp.splitType === 'equally' && (!exp.splitDetails || exp.splitDetails.length === 0) && activeTrip.members.some(m => m.id === id))
    );

    if (isPayer || isInvolvedInSplit) {
      toast({ title: "Cannot remove member", description: "This member is involved in expenses (paid or part of a split) and cannot be removed.", variant: "destructive"});
      return;
    }

    const updatedMembers = activeTrip.members.filter(member => member.id !== id);
    if (currentUserId === id) {
      setCurrentUserId(updatedMembers.length > 0 ? updatedMembers[0].id : '');
    }
    await updateActiveTripInFirestore({ members: updatedMembers });
    toast({ title: "Member Removed", description: `Member has been removed from "${activeTrip.tripName}".`});
  };

  const handleAddExpense = async (expenseData: Omit<Expense, 'id' | 'comments' | 'createdAt'>) => {
    if (!activeTrip) return;
    const newExpense: Expense = {
      ...expenseData,
      id: crypto.randomUUID(),
      comments: [],
      createdAt: new Date(), // Will be converted to Timestamp by prepareDataForFirestore
      date: expenseData.date as Date, // Will be converted by prepareDataForFirestore
    };
    const updatedExpenses = [...activeTrip.expenses, newExpense];
    await updateActiveTripInFirestore({ expenses: updatedExpenses }); // prepareDataForFirestore handles dates
    toast({ title: "Expense Added", description: `${expenseData.description} for ${expenseData.amount} ${activeTrip.currency} added to "${activeTrip.tripName}".`});
  };
  
  const handleRequestDeleteItem = (id: string, type: 'expense' | 'itinerary' | 'trip') => {
    setItemToDeleteId(id);
    setItemTypeToDelete(type);
    setIsDeleteConfirmationDialogOpen(true);
  };
  
  const handleConfirmDelete = async () => {
    if (!itemToDeleteId || !user) return;

    if (itemTypeToDelete === 'trip') {
        const tripToDelete = appState.trips.find(t => t.id === itemToDeleteId);
        if (!tripToDelete) return;
        if (tripToDelete.creatorUID !== user.uid) {
            toast({ title: "Deletion Forbidden", description: "Only the trip creator can delete this trip.", variant: "destructive"});
            setIsDeleteConfirmationDialogOpen(false);
            return;
        }
        try {
            await deleteDoc(doc(db, "trips", itemToDeleteId));
            toast({ title: "Trip Deleted", description: `"${tripToDelete.tripName}" has been removed.` });
        } catch (error) {
            console.error("Error deleting trip from Firestore:", error);
            toast({ title: "Error Deleting Trip", description: "Could not delete trip from the database.", variant: "destructive"});
        }
    } else if (activeTrip) {
        if (itemTypeToDelete === 'expense') {
            const expenseDescription = activeTrip.expenses.find(exp => exp.id === itemToDeleteId)?.description || "Expense";
            const updatedExpenses = activeTrip.expenses.filter(exp => exp.id !== itemToDeleteId);
            await updateActiveTripInFirestore({ expenses: updatedExpenses }); // prepareDataForFirestore handles dates
            toast({ title: "Expense Deleted", description: `"${expenseDescription}" has been removed.` });
        } else if (itemTypeToDelete === 'itinerary') {
            const itemDescription = activeTrip.itinerary.find(item => item.id === itemToDeleteId)?.placeName || "Itinerary item";
            const updatedItinerary = activeTrip.itinerary.filter(item => item.id !== itemToDeleteId);
            await updateActiveTripInFirestore({ itinerary: updatedItinerary }); // prepareDataForFirestore handles dates
            toast({ title: "Itinerary Item Deleted", description: `"${itemDescription}" has been removed.` });
        }
    }
    setIsDeleteConfirmationDialogOpen(false);
    setItemToDeleteId(null);
    setItemTypeToDelete(null);
  };

  const handleCancelDelete = () => {
    setIsDeleteConfirmationDialogOpen(false);
    setItemToDeleteId(null);
    setItemTypeToDelete(null);
  };
  
  const handleOpenEditExpenseDialog = (expense: Expense) => {
    setExpenseToEdit(convertTimestampsToDates(expense) as Expense);
    setIsEditExpenseDialogOpen(true);
  };

  const handleUpdateExpense = async (updatedExpenseData: Expense) => {
    if (!activeTrip) return;
    const updatedExpenses = activeTrip.expenses.map(exp => 
        exp.id === updatedExpenseData.id ? updatedExpenseData : exp
    );
    await updateActiveTripInFirestore({ expenses: updatedExpenses }); // prepareDataForFirestore handles dates
    toast({ title: "Expense Updated", description: `"${updatedExpenseData.description}" has been updated.` });
    setIsEditExpenseDialogOpen(false);
    setExpenseToEdit(null);
  };

  const handleAddExpenseComment = async (expenseId: string, authorId: string, text: string) => {
    if (!activeTrip) return;
    const author = activeTrip.members.find(m => m.id === authorId);
    if (!author) {
      toast({title: "Select User", description: "Please select your user profile to comment.", variant: "destructive"});
      return;
    }
    const newComment: ExpenseComment = {
      id: crypto.randomUUID(),
      expenseId,
      authorId,
      authorName: author.name, 
      text,
      createdAt: new Date(), // Will be converted by prepareDataForFirestore
    };
    const updatedExpenses = activeTrip.expenses.map(exp =>
      exp.id === expenseId ? { ...exp, comments: [...exp.comments, newComment] } : exp
    );
    await updateActiveTripInFirestore({ expenses: updatedExpenses }); // prepareDataForFirestore handles dates
  };

  const handleSendMessage = async (text: string) => {
    if (!activeTrip || !currentUserId) { 
        toast({title: "Select User", description: "Please select your user profile to send messages.", variant: "destructive"});
        return;
    }
    const sender = activeTrip.members.find(m => m.id === currentUserId);
    if (!sender) return;
    const newMessage: ChatMessage = {
      id: crypto.randomUUID(),
      senderId: currentUserId,
      senderName: sender.name, 
      text,
      createdAt: new Date(), // Will be converted
    };
    const updatedChatMessages = [...activeTrip.chatMessages, newMessage];
    await updateActiveTripInFirestore({ chatMessages: updatedChatMessages }); // prepareDataForFirestore handles dates
  };

  const handleTripNameChange = async (name: string) => {
    if (!activeTrip) return;
    await updateActiveTripInFirestore({ tripName: name });
  };

  const handleCurrencyChange = async (currency: string) => {
    if (!activeTrip) return;
    await updateActiveTripInFirestore({ currency: currency });
  };
  
  const handleAddItineraryItem = async (itemData: Omit<ItineraryItem, 'id' | 'createdAt' | 'comments'>) => {
    if (!activeTrip) return;
    const newItem: ItineraryItem = {
      ...itemData,
      id: crypto.randomUUID(),
      createdAt: new Date(), // Will be converted
      visitDate: itemData.visitDate as Date, // Will be converted
      comments: [], 
    };
    const updatedItinerary = [...activeTrip.itinerary, newItem].sort((a,b) => 
      (a.visitDate instanceof Date ? a.visitDate.getTime() : (a.visitDate as Timestamp).toMillis()) - 
      (b.visitDate instanceof Date ? b.visitDate.getTime() : (b.visitDate as Timestamp).toMillis())
    );
    await updateActiveTripInFirestore({ itinerary: updatedItinerary }); // prepareDataForFirestore handles dates
    toast({ title: "Itinerary Item Added", description: `"${itemData.placeName}" added to itinerary.` });
    setIsAddItineraryItemDialogOpen(false);
  };

  const handleOpenEditItineraryItemDialog = (item: ItineraryItem) => {
    setItineraryItemToEdit(convertTimestampsToDates(item) as ItineraryItem);
    setIsEditItineraryItemDialogOpen(true);
  };

  const handleUpdateItineraryItem = async (updatedItemData: ItineraryItem) => {
    if (!activeTrip) return;
    const updatedItinerary = activeTrip.itinerary.map(item => 
      item.id === updatedItemData.id ? updatedItemData : item
    ).sort((a,b) => 
      (a.visitDate instanceof Date ? a.visitDate.getTime() : (a.visitDate as Timestamp).toMillis()) - 
      (b.visitDate instanceof Date ? b.visitDate.getTime() : (b.visitDate as Timestamp).toMillis())
    );
    await updateActiveTripInFirestore({ itinerary: updatedItinerary }); // prepareDataForFirestore handles dates
    toast({ title: "Itinerary Item Updated", description: `"${updatedItemData.placeName}" has been updated.` });
    setIsEditItineraryItemDialogOpen(false);
    setItineraryItemToEdit(null);
  };
    
  const handleAddItineraryComment = async (itineraryItemId: string, authorId: string, text: string) => {
    if (!activeTrip) return;
    const author = activeTrip.members.find(m => m.id === authorId);
     if (!author) {
      toast({title: "Select User", description: "Please select your user profile to comment.", variant: "destructive"});
      return;
    }
    const newComment: ItineraryComment = {
      id: crypto.randomUUID(),
      authorId,
      authorName: author.name, 
      text,
      createdAt: new Date(), // Will be converted
    };
    const updatedItinerary = activeTrip.itinerary.map(item =>
      item.id === itineraryItemId ? { ...item, comments: [...(item.comments || []), newComment] } : item
    );
    await updateActiveTripInFirestore({ itinerary: updatedItinerary }); // prepareDataForFirestore handles dates
  };

  const handleTripInfoChange = async (field: keyof TripData, value: any) => {
    if (!activeTrip) return;
    await updateActiveTripInFirestore({ [field]: value }); // value could be Date or null, handled by prepareDataForFirestore
  };

  const settlements = useMemo(() => {
    if (!isClient || !activeTrip) return [];
    const expensesWithJSDates = convertTimestampsToDates(activeTrip.expenses) as Expense[];
    return calculateSettlements(expensesWithJSDates, activeTrip.members);
  }, [activeTrip, isClient]);


  if (!isClient || authLoading) {
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
        <AppHeader />
        <main className="flex flex-col items-center justify-center flex-grow w-full">
          <div className="w-full max-w-md p-8 space-y-6 rounded-xl shadow-2xl bg-card text-card-foreground">
            <div className="flex flex-col items-center space-y-2">
              <Coins className="h-12 w-12 text-primary" />
              <h2 className="text-3xl font-bold tracking-tight">Welcome to TripSplit!</h2>
            </div>
            <p className="text-center text-muted-foreground">
              Sign in with your Google account to start planning your trips and splitting expenses with ease.
            </p>
            <Button onClick={signInWithGoogle} size="lg" className="w-full">
                <LogIn className="mr-2 h-5 w-5" /> Sign In with Google
            </Button>
          </div>
        </main>
      </div>
    );
  }
  
  if (isLoadingTrips) {
     return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <AppHeader tripName={activeTrip?.tripName} />
        <main className="flex flex-col items-center justify-center flex-grow w-full">
            <div className="p-6 rounded-lg shadow-xl bg-card text-card-foreground flex flex-col items-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                Loading your trips...
            </div>
        </main>
      </div>
    );
  }

  const getDialogDescription = () => {
    if (itemTypeToDelete === 'trip') {
        const tripName = appState.trips.find(t => t.id === itemToDeleteId)?.tripName;
        return `Are you sure you want to delete the trip "${tripName || 'this trip'}"? This action cannot be undone and all associated data will be lost.`;
    }
    if (itemTypeToDelete === 'expense') return 'Are you sure you want to delete this expense? This action cannot be undone.';
    if (itemTypeToDelete === 'itinerary') return 'Are you sure you want to delete this itinerary item? This action cannot be undone.';
    return 'Are you sure? This action cannot be undone.';
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader tripName={activeTrip?.tripName} />
      <main className="flex-grow container mx-auto p-4 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 p-4 bg-card rounded-lg shadow">
            <div className="flex-grow max-w-xs">
                <Label htmlFor="tripSelector" className="flex items-center mb-1 text-sm font-medium"><Briefcase className="mr-2 h-4 w-4"/> Active Trip</Label>
                <Select 
                    value={appState.activeTripId || ''} 
                    onValueChange={(tripId) => handleSelectTrip(tripId)}
                    disabled={appState.trips.length === 0}
                >
                    <SelectTrigger id="tripSelector">
                        <SelectValue placeholder="Select a trip" />
                    </SelectTrigger>
                    <SelectContent>
                        {appState.trips.map(trip => (
                            <SelectItem key={trip.id} value={trip.id}>{trip.tripName}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <Dialog open={isCreateTripDialogOpen} onOpenChange={setIsCreateTripDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-auto">
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
                            />
                        </div>
                        <div>
                           <Label htmlFor="newTripCurrency" className="flex items-center mb-1"><CurrencyIcon className="mr-2 h-4 w-4" />Currency</Label>
                           <Select value={newTripCurrency} onValueChange={setNewTripCurrency}>
                                <SelectTrigger id="newTripCurrency">
                                    <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                                <SelectContent>
                                {CURRENCIES.map((curr) => (
                                    <SelectItem key={curr} value={curr}>
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

        {!activeTrip && appState.trips.length > 0 && (
             <div className="text-center p-10 bg-card rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-2">Select a trip</h2>
                <p className="text-muted-foreground">Please select a trip from the dropdown above to view its details.</p>
            </div>
        )}

        {!activeTrip && appState.trips.length === 0 && !isLoadingTrips && (
            <div className="text-center p-10 bg-card rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-2">Welcome to TripSplit!</h2>
                <p className="text-muted-foreground mb-4">It looks like you don't have any trips yet for user: {user.email}.</p>
                <Button onClick={() => setIsCreateTripDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-5 w-5" /> Create Your First Trip
                </Button>
            </div>
        )}

        {activeTrip && (
          <Tabs defaultValue="activity" className="w-full">
            <TabsList className="grid w-full grid-cols-1 sm:grid-cols-5 mb-6">
              <TabsTrigger value="manage" className="flex items-center gap-2"><Settings className="h-4 w-4"/> Manage</TabsTrigger>
              <TabsTrigger value="info" className="flex items-center gap-2"><InfoIcon className="h-4 w-4"/> Trip Info</TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center gap-2"><Activity className="h-4 w-4"/> Activity</TabsTrigger>
              <TabsTrigger value="itinerary" className="flex items-center gap-2"><MapPin className="h-4 w-4"/> Itinerary</TabsTrigger>
              <TabsTrigger value="chat" className="flex items-center gap-2"><MessageSquare className="h-4 w-4"/> Chat</TabsTrigger>
            </TabsList>

            <TabsContent value="manage" className="space-y-6">
              <TripSettings
                tripName={activeTrip.tripName}
                onTripNameChange={handleTripNameChange}
                currency={activeTrip.currency}
                onCurrencyChange={handleCurrencyChange}
                onDeleteTrip={() => handleRequestDeleteItem(activeTrip.id, 'trip')}
              />
              <MemberManager members={activeTrip.members} onAddMember={handleAddMember} onRemoveMember={handleRemoveMember}/>
            </TabsContent>

            <TabsContent value="info">
                <TripInfo
                    tripData={activeTrip}
                    onTripInfoChange={handleTripInfoChange}
                />
            </TabsContent>

            <TabsContent value="activity">
              {activeTrip.members.length > 0 && (
                <div className="my-4 max-w-xs">
                  <Label htmlFor="currentUserActivity" className="flex items-center mb-1"><UserCircle className="mr-2 h-4 w-4" />You are (for actions):</Label>
                  <Select value={currentUserId} onValueChange={setCurrentUserId} disabled={activeTrip.members.length === 0}>
                    <SelectTrigger id="currentUserActivity">
                      <SelectValue placeholder="Select your member profile" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeTrip.members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                   <p className="text-xs text-muted-foreground mt-1">Logged in as: {user.displayName || user.email}</p>
                </div>
              )}
               {activeTrip.members.length === 0 && (
                  <p className="my-4 text-sm text-muted-foreground">Add members in the 'Manage' tab to participate.</p>
               )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6 flex flex-col">
                  <ExpenseForm members={activeTrip.members} onAddExpense={handleAddExpense} tripCurrency={activeTrip.currency} />
                  <SettlementSummary settlements={settlements} tripCurrency={activeTrip.currency} />
                </div>
                <div className="lg:col-span-2 min-h-[600px]"> 
                   <ExpenseList 
                      expenses={convertTimestampsToDates(activeTrip.expenses) as Expense[]}
                      members={activeTrip.members} 
                      tripCurrency={activeTrip.currency}
                      currentUserId={currentUserId} 
                      onAddComment={handleAddExpenseComment}
                      onDeleteExpense={(expenseId) => handleRequestDeleteItem(expenseId, 'expense')}
                      onEditExpense={handleOpenEditExpenseDialog}
                    />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="itinerary" className="space-y-6">
              {activeTrip.members.length > 0 && (
                <div className="my-4 max-w-xs">
                  <Label htmlFor="currentUserItinerary" className="flex items-center mb-1"><UserCircle className="mr-2 h-4 w-4" />You are (for comments):</Label>
                   <Select value={currentUserId} onValueChange={setCurrentUserId} disabled={activeTrip.members.length === 0}>
                    <SelectTrigger id="currentUserItinerary">
                      <SelectValue placeholder="Select your member profile" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeTrip.members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Logged in as: {user.displayName || user.email}</p>
                </div>
              )}
              {activeTrip.members.length === 0 && (
                  <p className="my-4 text-sm text-muted-foreground">Add members and select your user profile to add comments to itinerary items.</p>
               )}
              <div className="flex justify-end mb-4">
                <Button onClick={() => setIsAddItineraryItemDialogOpen(true)} disabled={!currentUserId && activeTrip.members.length > 0}>
                  <CalendarPlus className="mr-2 h-5 w-5" /> Add Itinerary Item
                </Button>
              </div>
              <ItineraryList
                itineraryItems={convertTimestampsToDates(activeTrip.itinerary) as ItineraryItem[]}
                members={activeTrip.members}
                currentUserId={currentUserId} 
                onEditItem={handleOpenEditItineraryItemDialog}
                onDeleteItem={(itemId) => handleRequestDeleteItem(itemId, 'itinerary')}
                onAddComment={handleAddItineraryComment}
              />
            </TabsContent>

            <TabsContent value="chat">
              {activeTrip.members.length > 0 && (
                <div className="my-4 max-w-xs">
                  <Label htmlFor="currentUserChat" className="flex items-center mb-1"><UserCircle className="mr-2 h-4 w-4" />You are (for chat):</Label>
                   <Select value={currentUserId} onValueChange={setCurrentUserId} disabled={activeTrip.members.length === 0}>
                    <SelectTrigger id="currentUserChat">
                      <SelectValue placeholder="Select your member profile" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeTrip.members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Logged in as: {user.displayName || user.email}</p>
                </div>
              )}
              {activeTrip.members.length === 0 && !currentUserId &&(
                  <p className="my-4 text-sm text-muted-foreground">Add members and select your user profile to chat.</p>
               )}
              <div className="h-[600px]"> 
                <ChatRoom 
                  messages={convertTimestampsToDates(activeTrip.chatMessages) as ChatMessage[]}
                  members={activeTrip.members}
                  currentUserId={currentUserId} 
                  onSendMessage={handleSendMessage}
                />
              </div>
            </TabsContent>
          </Tabs>
        )}
      </main>
      <footer className="text-center p-4 text-muted-foreground text-sm border-t">
        TripSplit &copy; {new Date().getFullYear()}
      </footer>

      <AlertDialog open={isDeleteConfirmationDialogOpen} onOpenChange={setIsDeleteConfirmationDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center"><Trash2 className="mr-2 h-5 w-5 text-destructive"/>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              {getDialogDescription()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {expenseToEdit && activeTrip && (
        <EditExpenseDialog
          isOpen={isEditExpenseDialogOpen}
          onOpenChange={setIsEditExpenseDialogOpen}
          expenseToEdit={expenseToEdit}
          members={activeTrip.members}
          tripCurrency={activeTrip.currency}
          onUpdateExpense={handleUpdateExpense}
        />
      )}
      {activeTrip && (
        <ItineraryFormDialog
          isOpen={isAddItineraryItemDialogOpen}
          onOpenChange={setIsAddItineraryItemDialogOpen}
          onAddItineraryItem={handleAddItineraryItem}
        />
      )}
      {itineraryItemToEdit && activeTrip && (
         <EditItineraryItemDialog
          isOpen={isEditItineraryItemDialogOpen}
          onOpenChange={setIsEditItineraryItemDialogOpen}
          itemToEdit={itineraryItemToEdit}
          onUpdateItineraryItem={handleUpdateItineraryItem}
        />
      )}
    </div>
  );
}

    