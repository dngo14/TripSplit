
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { db, Timestamp, User as FirebaseUser } from '@/lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, onSnapshot, arrayUnion, arrayRemove, writeBatch, getDocs, limit, runTransaction } from 'firebase/firestore';

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
    return null;
  }
  if (Array.isArray(data)) {
    return data.map(prepareDataForFirestore);
  }
  if (typeof data === 'object' && data !== null) {
    const res: { [key: string]: any } = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const value = data[key];
        if (value === undefined) {
          res[key] = null;
        } else {
          res[key] = prepareDataForFirestore(value);
        }
      }
    }
    return res;
  }
  return data;
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

      userTrips.sort((a,b) => (b.lastUpdatedAt?.valueOf() || 0) - (a.lastUpdatedAt?.valueOf() || 0));

      setAppState(prev => {
        let newActiveTripId = prev.activeTripId;
        if (!newActiveTripId && userTrips.length > 0) {
          newActiveTripId = userTrips[0].id;
        } else if (newActiveTripId && !userTrips.find(t => t.id === newActiveTripId)) {
          newActiveTripId = userTrips.length > 0 ? userTrips[0].id : null;
        }

        if (newActiveTripId) {
          const newActiveTrip = userTrips.find(t => t.id === newActiveTripId);
          if (newActiveTrip) {
             const userAsMember = newActiveTrip.members.find(m => m.id === user.uid);
             if(userAsMember) {
                setCurrentUserId(userAsMember.id);
             } else if (newActiveTrip.members.length > 0 && newActiveTrip.members.some(m => m.id !== user.uid)) {
                // Fallback if logged-in user isn't in the display members list, but other members exist
                setCurrentUserId(newActiveTrip.members[0].id);
             } else if (newActiveTrip.members.length > 0 && newActiveTrip.creatorUID === user.uid) {
                // If creator is the only one and somehow not in members display list, add them conceptually
                setCurrentUserId(user.uid);
             }
              else {
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
    if (selectedTrip && user) {
      setAppState(prev => ({ ...prev, activeTripId: tripId }));
      const userAsMember = selectedTrip.members.find(m => m.id === user.uid);
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
      toast({ title: "Trip Created", description: `"${initialTripData.tripName}" has been created. You've been added as the first member.`});
      setNewTripName('');
      setNewTripCurrency(CURRENCIES[0]);
      setIsCreateTripDialogOpen(false);
      // onSnapshot will update the trips list. We can optimistically set it active if desired,
      // or wait for the listener to pick it up. For now, let onSnapshot handle active trip selection.
      // The `setCurrentUserId` will be handled by the main `useEffect` that watches trips.
    } catch (error) {
      console.error("Error creating new trip in Firestore:", error);
      toast({ title: "Error Creating Trip", description: "Could not save the new trip to the database.", variant: "destructive"});
    }
  };

  const updateActiveTripInFirestore = useCallback(async (updatedTripData: Partial<Omit<TripData, 'id' | 'lastUpdatedAt' | 'creatorUID'>>) => {
    if (!activeTrip || !activeTrip.id || !user) return;

    // Ensure only members of the trip can update it (client-side check, complement with Firestore rules)
    if (!activeTrip.memberUIDs.includes(user.uid)) {
        toast({ title: "Update Forbidden", description: "You are not a member of this trip and cannot make changes.", variant: "destructive" });
        return;
    }

    const tripRef = doc(db, "trips", activeTrip.id);
    try {
      const dataToUpdate = prepareDataForFirestore({
        ...updatedTripData,
        lastUpdatedAt: Timestamp.now()
      });
      await updateDoc(tripRef, dataToUpdate);
    } catch (error) {
      console.error("Error updating trip in Firestore:", error, "Original update data:", updatedTripData);
      toast({ title: "Error Updating Trip", description: `Could not save changes to the database. ${error instanceof Error ? error.message : ''}`, variant: "destructive" });
    }
  }, [activeTrip, user, toast]);


  const handleAddMember = async (name: string, email?: string) => {
    if (!activeTrip || !user) return;

    // Prevent adding if name already exists in display members
    if (activeTrip.members.find(m => m.name.toLowerCase() === name.toLowerCase())) {
      toast({ title: "Member Name Exists", description: `A member named "${name}" is already in this trip's display list.`, variant: "destructive" });
      return;
    }

    if (email) {
        // Prevent adding if email already exists in display members
        if (activeTrip.members.find(m => m.email?.toLowerCase() === email.toLowerCase())) {
            toast({ title: "Member Email Exists", description: `A member with email "${email}" is already in this trip's display list.`, variant: "destructive" });
            return;
        }

        // Try to find an existing registered user by email
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", email.toLowerCase()), limit(1));
        
        try {
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const existingUserDoc = querySnapshot.docs[0];
                const existingUserData = existingUserDoc.data() as { uid: string, name?: string, displayName?: string, email: string };
                const existingUserUID = existingUserData.uid;

                if (activeTrip.memberUIDs.includes(existingUserUID)) {
                    toast({ title: "Member Already Has Access", description: `"${existingUserData.displayName || existingUserData.name || name}" (email: ${email}) already has access to this trip.`, duration: 7000 });
                    // Optionally add to display members if not already there by UID
                     if (!activeTrip.members.find(m => m.id === existingUserUID)) {
                        const memberForDisplay: Member = { id: existingUserUID, name: existingUserData.displayName || existingUserData.name || name, email };
                        await updateActiveTripInFirestore({ members: arrayUnion(memberForDisplay) as any });
                    }
                    return;
                }

                // User found, add their UID to memberUIDs and add them to the display list
                const memberToAdd: Member = { id: existingUserUID, name: existingUserData.displayName || existingUserData.name || name, email };
                await updateActiveTripInFirestore({ 
                    memberUIDs: arrayUnion(existingUserUID) as any,
                    members: arrayUnion(memberToAdd) as any 
                });
                toast({ title: "Member Invited & Access Granted", description: `"${memberToAdd.name}" (email: ${email}) has been invited. They can now see and edit this trip when they log in.`, duration: 8000 });
                return;
            } else {
                // No registered user with this email found
                const newMember: Member = { id: crypto.randomUUID(), name, email };
                await updateActiveTripInFirestore({ members: arrayUnion(newMember) as any });
                toast({ 
                    title: "Member Added to Roster (Registration Needed for Full Access)", 
                    description: `"${name}" (email: ${email}) has been added to this trip's display list. However, no registered user was found with this email. For them to edit the trip, they need to sign up for TripSplit with this email. Once registered, try adding them again, or the trip creator can manually add their Firebase UID to grant access.`, 
                    duration: 15000 
                });
                return;
            }
        } catch (error) {
            console.error("Error finding user by email or updating trip:", error);
            toast({ title: "Error Adding Member", description: "Could not process member addition. Please try again.", variant: "destructive" });
            return;
        }
    } else {
        // Adding member without an email (display only)
        const newMember: Member = { id: crypto.randomUUID(), name, email: undefined }; // Ensure email is undefined
        await updateActiveTripInFirestore({ members: arrayUnion(newMember) as any });
        toast({ 
            title: "Member Added to Display Roster", 
            description: `"${name}" has been added to this trip's display list (e.g., for assigning expenses). Without an email, they cannot be automatically granted edit access.`, 
            duration: 10000 
        });
    }
};


  const handleRemoveMember = async (idToRemove: string) => {
    if (!activeTrip || !user) return;

    const memberToRemove = activeTrip.members.find(m => m.id === idToRemove);
    if (!memberToRemove) return;

    if (memberToRemove.id === user.uid && activeTrip.creatorUID === user.uid) {
        if (activeTrip.members.length === 1) {
             toast({ title: "Cannot Remove Self", description: "You are the only member and creator. To remove yourself, delete the trip.", variant: "destructive", duration: 7000});
             return;
        }
        if (activeTrip.memberUIDs.length === 1 && activeTrip.memberUIDs[0] === user.uid) {
             toast({ title: "Cannot Remove Only Editing Member", description: "You are the creator and only user with edit access. To remove yourself, delete the trip or add another editor first.", variant: "destructive", duration: 10000});
             return;
        }
         toast({ title: "Action Not Advised", description: "As trip creator, removing your own primary entry isn't typical. Consider transferring ownership (not yet implemented) or deleting the trip if you wish to leave and are the sole editor.", variant: "destructive", duration: 10000});
        // Allow removal if there are other UIDs with access or other display members.
    }


    const isPayer = activeTrip.expenses.some(exp => exp.paidById === idToRemove);
    const isInvolvedInSplit = activeTrip.expenses.some(exp =>
      (exp.splitDetails || []).some(detail => detail.memberId === idToRemove) ||
      (exp.splitType === 'equally' && (!exp.splitDetails || exp.splitDetails.length === 0) && activeTrip.members.some(m => m.id === idToRemove))
    );

    if (isPayer || isInvolvedInSplit) {
      toast({ title: "Cannot Remove Member", description: "This member is involved in expenses (paid or part of a split) and cannot be removed from the display list.", variant: "destructive", duration: 7000});
      return;
    }

    const updatedMembers = activeTrip.members.filter(member => member.id !== idToRemove);
    const updatePayload: any = { members: updatedMembers }; // Use any for updateDoc flexibility

    // If the member being removed from display also had their UID in memberUIDs, remove it there too.
    // This is particularly relevant if their display ID matched their Firebase UID.
    if (activeTrip.memberUIDs.includes(idToRemove)) {
       // Prevent creator from removing their own UID if they are the sole memberUID
       if (idToRemove === activeTrip.creatorUID && activeTrip.memberUIDs.length === 1) {
            toast({ title: "Action Blocked", description: "Cannot remove the trip creator's edit access if they are the only one with access.", variant: "destructive", duration: 8000});
            return;
       }
       updatePayload.memberUIDs = arrayRemove(idToRemove);
    }

    if (currentUserId === idToRemove) {
      setCurrentUserId(updatedMembers.length > 0 ? (updatedMembers.find(m => m.id === user.uid)?.id || updatedMembers[0].id) : '');
    }
    await updateActiveTripInFirestore(updatePayload);
    toast({ title: "Member Removed from List", description: `${memberToRemove.name} removed from this trip's member display list. If they had edit access via 'memberUIDs', that access has also been revoked if their display ID matched their UID.` , duration: 8000});
  };

  const handleAddExpense = async (expenseData: Omit<Expense, 'id' | 'comments' | 'createdAt'>) => {
    if (!activeTrip) return;
    const newExpense: Expense = {
      ...expenseData,
      id: crypto.randomUUID(),
      comments: [],
      createdAt: new Date(), // Will be converted by prepareDataForFirestore
      date: expenseData.date as Date, // Ensure it's Date, will be converted
    };
    // Use arrayUnion to add to the expenses array in Firestore
    await updateActiveTripInFirestore({ expenses: arrayUnion(newExpense) as any });
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
            // Active trip selection will be handled by the onSnapshot listener for trips
        } catch (error) {
            console.error("Error deleting trip from Firestore:", error);
            toast({ title: "Error Deleting Trip", description: `Could not delete trip. ${error instanceof Error ? error.message : ''}`, variant: "destructive"});
        }
    } else if (activeTrip) {
        if (itemTypeToDelete === 'expense') {
            const expenseToDelete = activeTrip.expenses.find(exp => exp.id === itemToDeleteId);
            if (!expenseToDelete) return;
            // Use arrayRemove to delete from the expenses array in Firestore
            await updateActiveTripInFirestore({ expenses: arrayRemove(expenseToDelete) as any });
            toast({ title: "Expense Deleted", description: `"${expenseToDelete.description}" has been removed.` });
        } else if (itemTypeToDelete === 'itinerary') {
            const itemToDelete = activeTrip.itinerary.find(item => item.id === itemToDeleteId);
            if(!itemToDelete) return;
            await updateActiveTripInFirestore({ itinerary: arrayRemove(itemToDelete) as any });
            toast({ title: "Itinerary Item Deleted", description: `"${itemToDelete.placeName}" has been removed.` });
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
    setExpenseToEdit(convertTimestampsToDates(expense) as Expense); // Ensure dates are JS Dates for the form
    setIsEditExpenseDialogOpen(true);
  };

  const handleUpdateExpense = async (updatedExpenseData: Expense) => {
    if (!activeTrip || !expenseToEdit) return;

    // Firestore update requires replacing the old element with the new one.
    // This is typically done by reading the array, modifying it, and writing it back.
    // A more atomic way if expenses were subcollections would be to update the specific expense doc.
    // For an array field, we filter out the old and add the new.

    const batch = writeBatch(db);
    const tripRef = doc(db, "trips", activeTrip.id);

    // Remove the old expense object
    batch.update(tripRef, { expenses: arrayRemove(expenseToEdit) });
    // Add the updated expense object
    batch.update(tripRef, { expenses: arrayUnion(updatedExpenseData) });
    
    try {
        await batch.commit();
        toast({ title: "Expense Updated", description: `"${updatedExpenseData.description}" has been updated.` });
    } catch (error) {
        console.error("Error updating expense with batch:", error);
        // Fallback to simpler (but less atomic) update if batch fails or not preferred
        const currentExpenses = activeTrip.expenses.filter(exp => exp.id !== expenseToEdit.id);
        const updatedExpenses = [...currentExpenses, updatedExpenseData];
        await updateActiveTripInFirestore({ expenses: updatedExpenses });
        toast({ title: "Expense Updated (fallback)", description: `"${updatedExpenseData.description}" has been updated.` });
    }

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
      createdAt: new Date(), // Will be converted
    };
    
    const expenseIndex = activeTrip.expenses.findIndex(exp => exp.id === expenseId);
    if (expenseIndex === -1) return;

    // Create a deep copy of the expenses array to modify
    const updatedExpenses = JSON.parse(JSON.stringify(activeTrip.expenses));
    updatedExpenses[expenseIndex].comments.push(newComment);
    
    await updateActiveTripInFirestore({ expenses: updatedExpenses });
  };

  const handleSendMessage = async (text: string) => {
    if (!activeTrip || !currentUserId) {
        toast({title: "Select User", description: "Please select your user profile to send messages.", variant: "destructive"});
        return;
    }
    const sender = activeTrip.members.find(m => m.id === currentUserId);
    if (!sender) return; // Should not happen if currentUserId is set from members
    const newMessage: ChatMessage = {
      id: crypto.randomUUID(),
      senderId: currentUserId,
      senderName: sender.name,
      text,
      createdAt: new Date(), // Will be converted
    };
    await updateActiveTripInFirestore({ chatMessages: arrayUnion(newMessage) as any });
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
    // Add and sort directly in the update payload for Firestore
    const updatedItinerary = [...activeTrip.itinerary, newItem].sort((a,b) =>
      (a.visitDate instanceof Timestamp ? a.visitDate.toMillis() : new Date(a.visitDate as Date).getTime()) -
      (b.visitDate instanceof Timestamp ? b.visitDate.toMillis() : new Date(b.visitDate as Date).getTime())
    );
    await updateActiveTripInFirestore({ itinerary: updatedItinerary });
    toast({ title: "Itinerary Item Added", description: `"${itemData.placeName}" added to itinerary.` });
    setIsAddItineraryItemDialogOpen(false);
  };

  const handleOpenEditItineraryItemDialog = (item: ItineraryItem) => {
    setItineraryItemToEdit(convertTimestampsToDates(item) as ItineraryItem);
    setIsEditItineraryItemDialogOpen(true);
  };

  const handleUpdateItineraryItem = async (updatedItemData: ItineraryItem) => {
    if (!activeTrip || !itineraryItemToEdit) return;
    
    // Similar to expenses, update in array
    const batch = writeBatch(db);
    const tripRef = doc(db, "trips", activeTrip.id);

    batch.update(tripRef, { itinerary: arrayRemove(itineraryItemToEdit) });
    batch.update(tripRef, { itinerary: arrayUnion(updatedItemData) });

    try {
        await batch.commit();
         toast({ title: "Itinerary Item Updated", description: `"${updatedItemData.placeName}" has been updated.` });
    } catch (error) {
        console.error("Error updating itinerary item with batch:", error);
        const currentItinerary = activeTrip.itinerary.filter(item => item.id !== itineraryItemToEdit.id);
        const updatedItinerary = [...currentItinerary, updatedItemData].sort((a,b) =>
            (a.visitDate instanceof Timestamp ? a.visitDate.toMillis() : new Date(a.visitDate as Date).getTime()) -
            (b.visitDate instanceof Timestamp ? b.visitDate.toMillis() : new Date(b.visitDate as Date).getTime())
        );
        await updateActiveTripInFirestore({ itinerary: updatedItinerary });
        toast({ title: "Itinerary Item Updated (fallback)", description: `"${updatedItemData.placeName}" has been updated.` });
    }
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
    
    const itemIndex = activeTrip.itinerary.findIndex(item => item.id === itineraryItemId);
    if (itemIndex === -1) return;

    const updatedItinerary = JSON.parse(JSON.stringify(activeTrip.itinerary));
    if (!updatedItinerary[itemIndex].comments) {
        updatedItinerary[itemIndex].comments = [];
    }
    updatedItinerary[itemIndex].comments.push(newComment);
    
    await updateActiveTripInFirestore({ itinerary: updatedItinerary });
  };

  const handleTripInfoChange = async (field: keyof TripData, value: any) => {
    if (!activeTrip) return;
    await updateActiveTripInFirestore({ [field]: value });
  };

  const settlements = useMemo(() => {
    if (!isClient || !activeTrip) return [];
    // Expenses are already converted to JS Dates by the onSnapshot listener's convertTimestampsToDates
    return calculateSettlements(activeTrip.expenses, activeTrip.members);
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
        const tripToDelete = appState.trips.find(t => t.id === itemToDeleteId);
        const tripName = tripToDelete?.tripName;
        if (tripToDelete && user && tripToDelete.creatorUID !== user.uid) {
            return `You are not the creator of the trip "${tripName || 'this trip'}". Only the creator can delete it.`;
        }
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

        {activeTrip && user && (
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
                isCreator={user.uid === activeTrip.creatorUID}
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
            <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                disabled={itemTypeToDelete === 'trip' && user?.uid !== appState.trips.find(t => t.id === itemToDeleteId)?.creatorUID}
            >
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

    