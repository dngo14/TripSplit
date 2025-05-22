
"use client";

import { useState, useEffect, useMemo } from 'react';
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
import { UserCircle, Briefcase, PlusCircle, Edit3, DollarSign as CurrencyIcon, Settings, Users, Activity, Trash2, MessageSquare, MapPin, CalendarPlus, InfoIcon, LogIn, Coins } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const LOCAL_STORAGE_KEY_PREFIX = 'tripSplitAppState_v2_user_'; 

export default function TripPage() {
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const [appState, setAppState] = useState<AppState>(INITIAL_APP_STATE);
  const [currentUserId, setCurrentUserId] = useState<string>(''); // This still refers to the selected member *within* a trip
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

  const { toast } = useToast();
  
  const getLocalStorageKey = () => {
    if (!user) return null;
    return `${LOCAL_STORAGE_KEY_PREFIX}${user.uid}`;
  }

  const activeTrip = useMemo(() => {
    if (!isClient || !user) return undefined; 
    return appState.trips.find(trip => trip.id === appState.activeTripId);
  }, [appState.trips, appState.activeTripId, isClient, user]);

  // Load data from local storage when user or client status changes
  useEffect(() => {
    setIsClient(true);
    if (!user || !isClient) { // Don't load if no user or not client-side yet
        setAppState(INITIAL_APP_STATE); // Reset if user logs out
        setCurrentUserId('');
        return;
    }
    
    const localStorageKey = getLocalStorageKey();
    if (!localStorageKey) return;

    const savedData = localStorage.getItem(localStorageKey);
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData) as AppState;
        
        parsedData.trips = parsedData.trips.map(trip => ({
          ...trip,
          expenses: trip.expenses.map(exp => ({
            ...exp,
            createdAt: new Date(exp.createdAt),
            date: new Date(exp.date),
            comments: exp.comments.map(c => ({...c, createdAt: new Date(c.createdAt)})),
            splitType: exp.splitType || 'equally', 
            splitDetails: exp.splitDetails || [],
            receiptImageUri: exp.receiptImageUri || undefined,
          })),
          chatMessages: trip.chatMessages.map(msg => ({...msg, createdAt: new Date(msg.createdAt)})),
          itinerary: trip.itinerary?.map(item => ({ 
            ...item,
            visitDate: new Date(item.visitDate), 
            createdAt: new Date(item.createdAt),
            comments: item.comments?.map(c => ({...c, createdAt: new Date(c.createdAt)})) || [],
          })) || [],
          tripStartDate: trip.tripStartDate ? new Date(trip.tripStartDate) : undefined,
          tripEndDate: trip.tripEndDate ? new Date(trip.tripEndDate) : undefined,
          accommodationAddress: trip.accommodationAddress || '',
          flightDetails: trip.flightDetails || '',
          notes: trip.notes || '',
        }));

        setAppState(parsedData);
        if (parsedData.trips.length > 0 && !parsedData.activeTripId) {
          handleSelectTrip(parsedData.trips[0].id, parsedData.trips[0].members);
        } else if (parsedData.activeTripId) {
          const initiallyActiveTrip = parsedData.trips.find(t => t.id === parsedData.activeTripId);
          if (initiallyActiveTrip && initiallyActiveTrip.members.length > 0) {
             setCurrentUserId(initiallyActiveTrip.members[0].id);
          } else if (initiallyActiveTrip && initiallyActiveTrip.members.length === 0) {
            setCurrentUserId('');
          } else if (!initiallyActiveTrip && parsedData.trips.length > 0) { 
            handleSelectTrip(parsedData.trips[0].id, parsedData.trips[0].members);
          } else {
            setCurrentUserId('');
          }
        }
      } catch (error) {
        console.error("Failed to parse saved app state:", error);
        toast({ title: "Error loading data", description: "Could not load saved trip data. Starting fresh.", variant: "destructive"});
        localStorage.removeItem(localStorageKey); 
        setAppState(INITIAL_APP_STATE); 
        setCurrentUserId('');
      }
    } else {
       // No saved data for this user, use initial state
       setAppState(INITIAL_APP_STATE);
       setCurrentUserId('');
       if (!activeTrip || activeTrip?.members.length === 0) {
        setCurrentUserId('');
      }
    }
  }, [toast, user, isClient]); 

  // Save data to local storage when appState changes
  useEffect(() => {
    if (isClient && user) {
      const localStorageKey = getLocalStorageKey();
      if(localStorageKey) {
        localStorage.setItem(localStorageKey, JSON.stringify(appState));
      }
    }
  }, [appState, isClient, user]);

  useEffect(() => {
    if (!user) { // If user logs out, reset the state
      setAppState(INITIAL_APP_STATE);
      setCurrentUserId('');
      return;
    }
    if (isClient && appState.trips.length > 0 && !appState.activeTripId) {
      const firstTrip = appState.trips[0];
      handleSelectTrip(firstTrip.id, firstTrip.members);
    } else if (isClient && appState.trips.length === 0) {
      setAppState(prev => ({ ...prev, activeTripId: null }));
      setCurrentUserId('');
    }
  }, [appState.trips, appState.activeTripId, isClient, user]);


  const updateActiveTrip = (updater: (trip: TripData) => TripData | null) => {
    setAppState(prev => {
      if (!prev.activeTripId) return prev;
      const updatedTrips = prev.trips.map(trip => {
        if (trip.id === prev.activeTripId) {
          const result = updater(trip);
          return result; 
        }
        return trip;
      }).filter(Boolean) as TripData[]; 

      return {
        ...prev,
        trips: updatedTrips,
      };
    });
  };
  
  const handleSelectTrip = (tripId: string, membersOfSelectedTrip?: Member[]) => {
    setAppState(prev => ({ ...prev, activeTripId: tripId }));
    if (membersOfSelectedTrip && membersOfSelectedTrip.length > 0) {
      setCurrentUserId(membersOfSelectedTrip[0].id);
    } else {
      const selected = appState.trips.find(t => t.id === tripId);
      if (selected && selected.members.length > 0) {
        setCurrentUserId(selected.members[0].id);
      } else {
        setCurrentUserId('');
      }
    }
  };

  const handleCreateNewTrip = () => {
    if (!newTripName.trim()) {
      toast({ title: "Trip name required", description: "Please enter a name for your new trip.", variant: "destructive"});
      return;
    }
    if (!user) {
        toast({ title: "Authentication Error", description: "You must be logged in to create a trip.", variant: "destructive"});
        return;
    }

    const initialTrip = createInitialTripData(newTripName.trim(), newTripCurrency);
    
    const firstMember: Member = {
      id: user.uid, // Use Firebase UID as member ID
      name: user.displayName || user.email || "Trip Creator", 
    };

    const newTripWithCreator: TripData = {
        ...initialTrip,
        members: [firstMember], 
    };
    
    setAppState(prev => ({
      trips: [...prev.trips, newTripWithCreator],
      activeTripId: newTripWithCreator.id,
    }));
    
    setCurrentUserId(firstMember.id); // Set the creator as the current user for actions

    setNewTripName('');
    setNewTripCurrency(CURRENCIES[0]);
    setIsCreateTripDialogOpen(false);
    toast({ title: "Trip Created", description: `"${newTripWithCreator.tripName}" has been created with you as the first member.`});
  };

  const handleAddMember = (name: string) => {
    if (!activeTrip) return;
    if (activeTrip.members.find(m => m.name.toLowerCase() === name.toLowerCase())) {
      toast({ title: "Member exists", description: `A member named "${name}" already exists in this trip.`, variant: "destructive" });
      return;
    }
    // Ensure new member ID (randomUUID) doesn't clash with the creator's Firebase UID if they try to add themselves again by a different name
    // Though, typically users wouldn't add themselves again. If they do, a random UUID is fine.
    // The creator is special and uses user.uid. Other members get random UUIDs.
    const newMember: Member = { id: crypto.randomUUID(), name };
    updateActiveTrip(trip => {
      const updatedMembers = [...trip.members, newMember];
      // No need to change currentUserId here, as the creator is already set, or another user is selected.
      // If this is the *very first* member being added (besides the auto-added creator), 
      // then currentUserId would have been the creator's.
      return { ...trip, members: updatedMembers };
    });
    toast({ title: "Member Added", description: `${name} has been added to "${activeTrip.tripName}".`});
  };

  const handleRemoveMember = (id: string) => {
    if (!activeTrip) return;
    updateActiveTrip(trip => {
      const isPayer = trip.expenses.some(exp => exp.paidById === id);
      const isInvolvedInSplit = trip.expenses.some(exp => 
        exp.splitDetails.some(detail => detail.memberId === id) || 
        (exp.splitType === 'equally' && exp.splitDetails.length === 0 && trip.members.some(m => m.id === id))
      );

      if (isPayer || isInvolvedInSplit) {
        toast({ title: "Cannot remove member", description: "This member is involved in expenses (paid or part of a split) and cannot be removed.", variant: "destructive"});
        return trip;
      }

      const updatedMembers = trip.members.filter(member => member.id !== id);
      if (currentUserId === id) {
        setCurrentUserId(updatedMembers.length > 0 ? updatedMembers[0].id : '');
      }
      toast({ title: "Member Removed", description: `Member has been removed from "${trip.tripName}".`});
      return { ...trip, members: updatedMembers };
    });
  };

  const handleAddExpense = async (expenseData: Omit<Expense, 'id' | 'comments' | 'createdAt'>) => {
    if (!activeTrip) return;
    const newExpense: Expense = {
      ...expenseData,
      id: crypto.randomUUID(),
      comments: [],
      createdAt: new Date(),
    };
    updateActiveTrip(trip => ({ ...trip, expenses: [...trip.expenses, newExpense] }));
    toast({ title: "Expense Added", description: `${expenseData.description} for ${expenseData.amount} ${activeTrip.currency} added to "${activeTrip.tripName}".`});
  };

  const handleRequestDeleteItem = (id: string, type: 'expense' | 'itinerary' | 'trip') => {
    setItemToDeleteId(id);
    setItemTypeToDelete(type);
    setIsDeleteConfirmationDialogOpen(true);
  };
  
  const handleConfirmDelete = () => {
    if (!itemToDeleteId) return;

    if (itemTypeToDelete === 'trip') {
        const tripName = appState.trips.find(t => t.id === itemToDeleteId)?.tripName || "Trip";
        setAppState(prev => {
            const remainingTrips = prev.trips.filter(trip => trip.id !== itemToDeleteId);
            let newActiveTripId = prev.activeTripId;
            if (prev.activeTripId === itemToDeleteId) {
                newActiveTripId = remainingTrips.length > 0 ? remainingTrips[0].id : null;
                if (newActiveTripId) {
                    const newActiveTrip = remainingTrips.find(t => t.id === newActiveTripId);
                    setCurrentUserId(newActiveTrip && newActiveTrip.members.length > 0 ? newActiveTrip.members[0].id : '');
                } else {
                    setCurrentUserId('');
                }
            }
            return {
                ...prev,
                trips: remainingTrips,
                activeTripId: newActiveTripId,
            };
        });
        toast({ title: "Trip Deleted", description: `"${tripName}" has been removed.` });

    } else if (activeTrip) {
        if (itemTypeToDelete === 'expense') {
            const expenseDescription = activeTrip.expenses.find(exp => exp.id === itemToDeleteId)?.description || "Expense";
            updateActiveTrip(trip => ({
                ...trip,
                expenses: trip.expenses.filter(exp => exp.id !== itemToDeleteId),
            }));
            toast({ title: "Expense Deleted", description: `"${expenseDescription}" has been removed.` });
        } else if (itemTypeToDelete === 'itinerary') {
            const itemDescription = activeTrip.itinerary.find(item => item.id === itemToDeleteId)?.placeName || "Itinerary item";
            updateActiveTrip(trip => ({
                ...trip,
                itinerary: trip.itinerary.filter(item => item.id !== itemToDeleteId),
            }));
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
    setExpenseToEdit(expense);
    setIsEditExpenseDialogOpen(true);
  };

  const handleUpdateExpense = (updatedExpense: Expense) => {
    if (!activeTrip) return;
    updateActiveTrip(trip => ({
      ...trip,
      expenses: trip.expenses.map(exp => exp.id === updatedExpense.id ? updatedExpense : exp)
    }));
    toast({ title: "Expense Updated", description: `"${updatedExpense.description}" has been updated.` });
    setIsEditExpenseDialogOpen(false);
    setExpenseToEdit(null);
  };


  const handleAddExpenseComment = (expenseId: string, authorId: string, text: string) => {
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
      createdAt: new Date(),
    };
    updateActiveTrip(trip => ({
      ...trip,
      expenses: trip.expenses.map(exp =>
        exp.id === expenseId ? { ...exp, comments: [...exp.comments, newComment] } : exp
      ),
    }));
  };

  const handleSendMessage = (text: string) => {
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
      createdAt: new Date(),
    };
    updateActiveTrip(trip => ({ ...trip, chatMessages: [...trip.chatMessages, newMessage] }));
  };

  const handleTripNameChange = (name: string) => {
    if (!activeTrip) return;
    updateActiveTrip(trip => ({ ...trip, tripName: name }));
  };

  const handleCurrencyChange = (currency: string) => {
    if (!activeTrip) return;
    updateActiveTrip(trip => ({ ...trip, currency: currency }));
  };

  const handleAddItineraryItem = (itemData: Omit<ItineraryItem, 'id' | 'createdAt' | 'comments'>) => {
    if (!activeTrip) return;
    const newItem: ItineraryItem = {
      ...itemData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      comments: [], 
    };
    updateActiveTrip(trip => ({ ...trip, itinerary: [...trip.itinerary, newItem].sort((a,b) => new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime()) }));
    toast({ title: "Itinerary Item Added", description: `"${itemData.placeName}" added to itinerary.` });
    setIsAddItineraryItemDialogOpen(false);
  };

  const handleOpenEditItineraryItemDialog = (item: ItineraryItem) => {
    setItineraryItemToEdit(item);
    setIsEditItineraryItemDialogOpen(true);
  };

  const handleUpdateItineraryItem = (updatedItem: ItineraryItem) => {
    if (!activeTrip) return;
    updateActiveTrip(trip => ({
      ...trip,
      itinerary: trip.itinerary.map(item => item.id === updatedItem.id ? updatedItem : item).sort((a,b) => new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime())
    }));
    toast({ title: "Itinerary Item Updated", description: `"${updatedItem.placeName}" has been updated.` });
    setIsEditItineraryItemDialogOpen(false);
    setItineraryItemToEdit(null);
  };
    
  const handleAddItineraryComment = (itineraryItemId: string, authorId: string, text: string) => {
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
      createdAt: new Date(),
    };
    updateActiveTrip(trip => ({
      ...trip,
      itinerary: trip.itinerary.map(item =>
        item.id === itineraryItemId ? { ...item, comments: [...(item.comments || []), newComment] } : item
      ),
    }));
  };

  const handleTripInfoChange = (field: keyof TripData, value: any) => {
    if (!activeTrip) return;
    updateActiveTrip(trip => ({ ...trip, [field]: value }));
  };


  const settlements = useMemo(() => {
    if (!isClient || !activeTrip) return [];
    return calculateSettlements(activeTrip.expenses, activeTrip.members);
  }, [activeTrip, isClient]);


  if (!isClient || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="p-6 rounded-lg shadow-xl bg-card text-card-foreground">
          Loading TripSplit...
        </div>
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

        {!activeTrip && appState.trips.length === 0 && (
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
                      expenses={activeTrip.expenses} 
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
                itineraryItems={activeTrip.itinerary}
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
                  messages={activeTrip.chatMessages}
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
