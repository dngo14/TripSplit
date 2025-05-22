
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

// Helper to prepare data for Firestore:
// - Converts JS Dates to Firestore Timestamps.
// - Converts 'undefined' field values to 'null'.
// - Passes through Firestore FieldValue sentinels (like arrayUnion, Timestamp.now()) as is.
// - Recursively processes plain objects and arrays.
const prepareDataForFirestore = (data: any): any => {
  if (data instanceof Timestamp || (typeof data === 'object' && data !== null && data.constructor && data.constructor.name === 'FieldValue')) {
    // Pass through Firestore Timestamps and FieldValues (like arrayUnion, arrayRemove, serverTimestamp)
    return data;
  }
  if (data instanceof Date) return Timestamp.fromDate(data);
  if (data === undefined) return null;

  if (Array.isArray(data)) {
    return data.map(prepareDataForFirestore);
  }

  // Check if 'data' is a plain object that should be recursed into.
  // Object.prototype.isPrototypeOf(data) is another way, but this is common for simple objects
  if (typeof data === 'object' && data !== null && Object.getPrototypeOf(data) === Object.prototype) {
    const res: { [key: string]: any } = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        res[key] = prepareDataForFirestore(data[key]);
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
        const rawData = docSnapshot.data();
        
        // Ensure essential arrays and fields have default values if missing
        const tripDataWithGuaranteedArrays = {
          tripName: rawData.tripName || 'Untitled Trip',
          currency: rawData.currency || CURRENCIES[0],
          creatorUID: rawData.creatorUID || '',
          members: Array.isArray(rawData.members) ? rawData.members.filter(m => m != null) : [],
          expenses: Array.isArray(rawData.expenses) ? rawData.expenses.filter(e => e != null) : [],
          itinerary: Array.isArray(rawData.itinerary) ? rawData.itinerary.filter(i => i != null) : [],
          chatMessages: Array.isArray(rawData.chatMessages) ? rawData.chatMessages.filter(c => c != null) : [],
          memberUIDs: Array.isArray(rawData.memberUIDs) ? rawData.memberUIDs.filter(uid => uid != null) : [],
          ...rawData, // Spread the rest of rawData to keep other fields
        };
        
        const tripDataWithDates = convertTimestampsToDates(tripDataWithGuaranteedArrays) as Omit<TripData, 'id'>;
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
           if (newActiveTrip && Array.isArray(newActiveTrip.members)) { 
             const userAsMember = newActiveTrip.members.find(m => m.id === user.uid);
             if(userAsMember) {
                setCurrentUserId(userAsMember.id);
             } else if (newActiveTrip.members.length > 0 && newActiveTrip.members.some(m => m.id !== user.uid)) {
                 // If logged-in user is not in the members list directly by UID,
                 // but other members exist, pick the first one for now.
                 // This might need refinement if user.uid should always be found or created.
                setCurrentUserId(newActiveTrip.members[0].id);
             } else if (newActiveTrip.members.length > 0 && newActiveTrip.creatorUID === user.uid) {
                // Fallback if logged-in user is creator but not explicitly in members list by UID.
                 // This scenario should ideally be handled by ensuring creator is always in members list.
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
        // Fallback to first member if logged-in user isn't directly in list
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
        user.email?.toLowerCase() // Store email as lowercase
    );

    const tripDataForFirestore = prepareDataForFirestore(initialTripData);

    try {
      const docRef = await addDoc(collection(db, "trips"), tripDataForFirestore);
      toast({ title: "Trip Created", description: `"${initialTripData.tripName}" has been created. You've been added as the first member.`});
      setNewTripName('');
      setNewTripCurrency(CURRENCIES[0]);
      setIsCreateTripDialogOpen(false);
      // setCurrentUserId(user.uid); // Creator is automatically set as current user for actions
    } catch (error) {
      console.error("Error creating new trip in Firestore:", error);
      toast({ title: "Error Creating Trip", description: "Could not save the new trip to the database.", variant: "destructive"});
    }
  };

  const updateActiveTripInFirestore = useCallback(async (updatedTripData: Partial<Omit<TripData, 'id' | 'creatorUID'>>) => {
    if (!activeTrip || !activeTrip.id || !user) return;

    if (!activeTrip.memberUIDs.includes(user.uid)) {
        toast({ title: "Update Forbidden", description: "You are not a member of this trip and cannot make changes.", variant: "destructive" });
        return;
    }

    const tripRef = doc(db, "trips", activeTrip.id);
    try {
      const dataToUpdateWithTimestamp = {
        ...updatedTripData,
        lastUpdatedAt: Timestamp.now() 
      };
      const finalDataToUpdate = prepareDataForFirestore(dataToUpdateWithTimestamp);
      await updateDoc(tripRef, finalDataToUpdate);
    } catch (error) {
      console.error("Error updating trip in Firestore:", error, "Original update data:", updatedTripData, "Data sent to Firestore:", prepareDataForFirestore({ ...updatedTripData, lastUpdatedAt: Timestamp.now() }));
      toast({ title: "Error Updating Trip", description: `Could not save changes to the database. ${error instanceof Error ? error.message : ''}`, variant: "destructive" });
    }
  }, [activeTrip, user, toast]);


 const handleAddMember = async (name: string, emailInput?: string) => {
    if (!activeTrip || !user) return;

    if (user.uid !== activeTrip.creatorUID) {
      toast({ title: "Permission Denied", description: "Only the trip creator can add new members.", variant: "destructive" });
      return;
    }

    const email = emailInput ? emailInput.trim().toLowerCase() : undefined;

    if (activeTrip.members.find(m => m.name.toLowerCase() === name.toLowerCase())) {
      toast({ title: "Member Name Exists", description: `A member named "${name}" is already in this trip's display list.`, variant: "destructive" });
      return;
    }
    
    if (email) {
        if (activeTrip.members.find(m => m.email?.toLowerCase() === email)) {
            toast({ title: "Member Email Exists", description: `A member with email "${email}" is already in this trip's display list.`, variant: "destructive" });
            return;
        }

        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", email), limit(1));
        
        try {
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const existingUserDoc = querySnapshot.docs[0];
                const existingUserData = existingUserDoc.data() as { uid: string, name?: string, displayName?: string, email: string };
                const existingUserUID = existingUserData.uid;

                if (activeTrip.memberUIDs.includes(existingUserUID)) {
                    toast({ title: "Member Already Has Access", description: `"${existingUserData.displayName || existingUserData.name || name}" (email: ${email}) already has access to this trip. Their display details will be updated if necessary.`, duration: 7000 });
                    // Optionally update their display name/email in members array if it changed
                    const memberInDisplayList = activeTrip.members.find(m => m.id === existingUserUID);
                    if (memberInDisplayList && (memberInDisplayList.name !== (existingUserData.displayName || existingUserData.name || name) || memberInDisplayList.email !== email)) {
                        const updatedDisplayMember: Member = { ...memberInDisplayList, name: existingUserData.displayName || existingUserData.name || name, email };
                        const otherMembers = activeTrip.members.filter(m => m.id !== existingUserUID);
                        const preparedMembers = [...otherMembers.map(prepareDataForFirestore), prepareDataForFirestore(updatedDisplayMember)];
                        await updateActiveTripInFirestore({ members: preparedMembers });
                    }
                    return;
                }

                // Registered user found, grant access by adding their UID
                const memberToAdd: Member = { id: existingUserUID, name: existingUserData.displayName || existingUserData.name || name, email };
                const preparedMemberToAdd = prepareDataForFirestore(memberToAdd);
                await updateActiveTripInFirestore({ 
                    memberUIDs: arrayUnion(existingUserUID) as any, 
                    members: arrayUnion(preparedMemberToAdd) as any 
                });
                toast({ title: "Member Invited & Access Granted", description: `"${memberToAdd.name}" (email: ${email}) has been invited. They can now see and edit this trip when they log in.`, duration: 8000 });

            } else {
                // No registered user found with this email
                const newDisplayMemberRaw: Member = { id: crypto.randomUUID(), name, email };
                const preparedNewDisplayMember = prepareDataForFirestore(newDisplayMemberRaw);
                await updateActiveTripInFirestore({ members: arrayUnion(preparedNewDisplayMember) as any });
                toast({ 
                    title: "Member Added to Roster (Registration Needed for Full Access)", 
                    description: `"${name}" (email: ${email}) added to trip roster. No registered user found with this email. For them to edit, they must sign up for TripSplit with this email. Then, try adding them again by email to grant access.`, 
                    duration: 15000 
                });
            }
        } catch (error) {
            console.error("Error finding user by email or updating trip:", error);
            toast({ title: "Error Adding Member", description: "Could not process member addition. Please try again.", variant: "destructive" });
        }
    } else {
        // Adding member without email (for display/assignment only)
        const newDisplayMemberRaw: Member = { id: crypto.randomUUID(), name, email: undefined }; 
        const preparedNewDisplayMember = prepareDataForFirestore(newDisplayMemberRaw);
        await updateActiveTripInFirestore({ members: arrayUnion(preparedNewDisplayMember) as any });
        toast({ 
            title: "Member Added to Display Roster", 
            description: `"${name}" has been added to this trip's display list (e.g., for assigning expenses). Without an email, they cannot be automatically granted edit access.`, 
            duration: 10000 
        });
    }
};


  const handleRemoveMember = async (idToRemove: string) => {
    if (!activeTrip || !user) return;

    if (user.uid !== activeTrip.creatorUID) {
      toast({ title: "Permission Denied", description: "Only the trip creator can remove members.", variant: "destructive" });
      return;
    }

    const memberToRemove = activeTrip.members.find(m => m.id === idToRemove);
    if (!memberToRemove) return;

    if (memberToRemove.id === user.uid && activeTrip.creatorUID === user.uid) {
        if (activeTrip.memberUIDs.length === 1 && activeTrip.memberUIDs[0] === user.uid) {
             toast({ title: "Action Blocked", description: "As creator and sole editor, you cannot remove your own access. To leave, delete the trip or add another editor first.", variant: "destructive", duration: 10000});
             return;
        }
         if (activeTrip.members.length === 1) {
             toast({ title: "Cannot Remove Self", description: "You are the only member. To remove yourself, delete the trip or invite another member first.", variant: "destructive", duration: 7000});
             return;
        }
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
    
    const preparedMemberToRemove = prepareDataForFirestore(memberToRemove);
    const updatePayload: any = { members: arrayRemove(preparedMemberToRemove) };

    if (activeTrip.memberUIDs.includes(idToRemove)) {
       if (idToRemove === activeTrip.creatorUID && activeTrip.memberUIDs.length === 1) {
            toast({ title: "Action Blocked", description: "Cannot remove the trip creator's edit access if they are the only one with access.", variant: "destructive", duration: 8000});
            return;
       }
       updatePayload.memberUIDs = arrayRemove(idToRemove);
    }

    if (currentUserId === idToRemove) {
      const remainingMembers = activeTrip.members.filter(member => member.id !== idToRemove);
      if (remainingMembers.length > 0) {
        setCurrentUserId(remainingMembers.find(m => m.id === user.uid)?.id || remainingMembers[0].id);
      } else {
        setCurrentUserId('');
      }
    }

    await updateActiveTripInFirestore(updatePayload);
    toast({ title: "Member Removed", description: `${memberToRemove.name} removed from this trip. If they had edit access via UID, that access is now revoked.` , duration: 8000});
  };

  const handleAddExpense = async (expenseData: Omit<Expense, 'id' | 'comments' | 'createdAt'>) => {
    if (!activeTrip) return;
    const newExpenseRaw: Expense = {
      ...expenseData,
      id: crypto.randomUUID(),
      comments: [],
      createdAt: new Date(), 
      date: expenseData.date as Date, 
    };
    const preparedNewExpense = prepareDataForFirestore(newExpenseRaw);
    await updateActiveTripInFirestore({ expenses: arrayUnion(preparedNewExpense) as any });
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
            toast({ title: "Error Deleting Trip", description: `Could not delete trip. ${error instanceof Error ? error.message : ''}`, variant: "destructive"});
        }
    } else if (activeTrip) {
        if (itemTypeToDelete === 'expense') {
            const expenseToDelete = activeTrip.expenses.find(exp => exp.id === itemToDeleteId);
            if (!expenseToDelete) return;
            const preparedExpenseToDelete = prepareDataForFirestore(expenseToDelete);
            await updateActiveTripInFirestore({ expenses: arrayRemove(preparedExpenseToDelete) as any });
            toast({ title: "Expense Deleted", description: `"${expenseToDelete.description}" has been removed.` });
        } else if (itemTypeToDelete === 'itinerary') {
            const itemToDelete = activeTrip.itinerary.find(item => item.id === itemToDeleteId);
            if(!itemToDelete) return;
            const preparedItemToDelete = prepareDataForFirestore(itemToDelete);
            await updateActiveTripInFirestore({ itinerary: arrayRemove(preparedItemToDelete) as any });
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
    setExpenseToEdit(convertTimestampsToDates(expense) as Expense); 
    setIsEditExpenseDialogOpen(true);
  };

  const handleUpdateExpense = async (updatedExpenseData: Expense) => {
    if (!activeTrip || !expenseToEdit) return;
    
    const originalExpenseFromState = activeTrip.expenses.find(exp => exp.id === expenseToEdit.id);
    if (!originalExpenseFromState) {
        toast({title: "Error", description: "Could not find original expense to update.", variant: "destructive"});
        return;
    }

    const batch = writeBatch(db);
    const tripRef = doc(db, "trips", activeTrip.id);
    
    const preparedOriginalExpense = prepareDataForFirestore(originalExpenseFromState);
    const preparedUpdatedExpense = prepareDataForFirestore(updatedExpenseData);

    batch.update(tripRef, { expenses: arrayRemove(preparedOriginalExpense) });
    batch.update(tripRef, { expenses: arrayUnion(preparedUpdatedExpense) });
    batch.update(tripRef, { lastUpdatedAt: Timestamp.now() });
    
    try {
        await batch.commit();
        toast({ title: "Expense Updated", description: `"${updatedExpenseData.description}" has been updated.` });
    } catch (error) {
        console.error("Error updating expense with batch:", error);
        const currentExpenses = activeTrip.expenses.filter(exp => exp.id !== expenseToEdit.id);
        const updatedExpensesForFirestore = [...currentExpenses.map(prepareDataForFirestore), preparedUpdatedExpense];
        await updateActiveTripInFirestore({ expenses: updatedExpensesForFirestore });
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
    const newCommentRaw: ExpenseComment = {
      id: crypto.randomUUID(),
      expenseId,
      authorId,
      authorName: author.name,
      text,
      createdAt: new Date(), 
    };
    
    const expenseIndex = activeTrip.expenses.findIndex(exp => exp.id === expenseId);
    if (expenseIndex === -1) return;

    const updatedExpenses = JSON.parse(JSON.stringify(activeTrip.expenses)); 
    updatedExpenses[expenseIndex].comments = [...(updatedExpenses[expenseIndex].comments || []), newCommentRaw];
    
    const preparedExpenses = updatedExpenses.map(prepareDataForFirestore);
    await updateActiveTripInFirestore({ expenses: preparedExpenses });
  };

  const handleSendMessage = async (text: string) => {
    if (!activeTrip || !currentUserId) {
        toast({title: "Select User", description: "Please select your user profile to send messages.", variant: "destructive"});
        return;
    }
    const sender = activeTrip.members.find(m => m.id === currentUserId);
    if (!sender) return; 
    const newMessageRaw: ChatMessage = {
      id: crypto.randomUUID(),
      senderId: currentUserId,
      senderName: sender.name,
      text,
      createdAt: new Date(), 
    };
    const preparedNewMessage = prepareDataForFirestore(newMessageRaw);
    await updateActiveTripInFirestore({ chatMessages: arrayUnion(preparedNewMessage) as any });
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
    const newItemRaw: ItineraryItem = {
      ...itemData,
      id: crypto.randomUUID(),
      createdAt: new Date(), 
      visitDate: itemData.visitDate as Date, 
      comments: [],
    };
    
    const preparedNewItem = prepareDataForFirestore(newItemRaw);
    const currentItineraryPrepared = activeTrip.itinerary.map(prepareDataForFirestore);
    const updatedItinerary = [...currentItineraryPrepared, preparedNewItem].sort((a,b) =>
      (a.visitDate as Timestamp).toDate().getTime() - (b.visitDate as Timestamp).toDate().getTime()
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
    
    const originalItemFromState = activeTrip.itinerary.find(item => item.id === itineraryItemToEdit.id);
    if (!originalItemFromState) {
        toast({title: "Error", description: "Could not find original itinerary item to update.", variant: "destructive"});
        return;
    }

    const batch = writeBatch(db);
    const tripRef = doc(db, "trips", activeTrip.id);

    const preparedOriginalItem = prepareDataForFirestore(originalItemFromState);
    const preparedUpdatedItem = prepareDataForFirestore(updatedItemData);

    batch.update(tripRef, { itinerary: arrayRemove(preparedOriginalItem) });
    batch.update(tripRef, { itinerary: arrayUnion(preparedUpdatedItem) });
    batch.update(tripRef, { lastUpdatedAt: Timestamp.now() });

    try {
        await batch.commit();
         toast({ title: "Itinerary Item Updated", description: `"${updatedItemData.placeName}" has been updated.` });
    } catch (error) {
        console.error("Error updating itinerary item with batch:", error);
        const currentItinerary = activeTrip.itinerary.filter(item => item.id !== itineraryItemToEdit.id);
        const updatedItineraryForFirestore = [...currentItinerary.map(prepareDataForFirestore), preparedUpdatedItem]
          .sort((a,b) => (a.visitDate as Timestamp).toDate().getTime() - (b.visitDate as Timestamp).toDate().getTime());
        await updateActiveTripInFirestore({ itinerary: updatedItineraryForFirestore });
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
    const newCommentRaw: ItineraryComment = {
      id: crypto.randomUUID(),
      authorId,
      authorName: author.name,
      text,
      createdAt: new Date(), 
    };
    
    const itemIndex = activeTrip.itinerary.findIndex(item => item.id === itineraryItemId);
    if (itemIndex === -1) return;

    const updatedItinerary = JSON.parse(JSON.stringify(activeTrip.itinerary)); 
    updatedItinerary[itemIndex].comments = [...(updatedItinerary[itemIndex].comments || []), newCommentRaw];
    
    const preparedItinerary = updatedItinerary.map(prepareDataForFirestore);
    await updateActiveTripInFirestore({ itinerary: preparedItinerary });
  };

  const handleTripInfoChange = async (field: keyof TripData, value: any) => {
    if (!activeTrip) return;
    await updateActiveTripInFirestore({ [field]: value });
  };

  const settlements = useMemo(() => {
    if (!isClient || !activeTrip) return [];
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
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-5 mb-6">
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
              <MemberManager 
                members={activeTrip.members} 
                onAddMember={handleAddMember} 
                onRemoveMember={handleRemoveMember}
                isCreator={user.uid === activeTrip.creatorUID}
              />
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


    