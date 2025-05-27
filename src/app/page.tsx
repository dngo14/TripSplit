
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { db, Timestamp, type User as FirebaseUser, FieldValue, arrayUnion, arrayRemove, writeBatch, getDocs, limit, runTransaction, serverTimestamp, deleteDoc, doc as firestoreDoc, collection, addDoc, updateDoc, query, where, onSnapshot } from '@/lib/firebase'; 

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
import { AiTripIdeation } from '@/components/trip/AiTripIdeation';
import { SettlementLogDialog } from '@/components/trip/SettlementLogDialog'; 

import type { AppState, TripData, Member, Expense, Comment as ExpenseComment, ChatMessage, ItineraryItem, ItineraryComment, SplitDetail, Settlement, PollData } from '@/lib/types';
import { INITIAL_APP_STATE, createInitialTripData, CURRENCIES } from '@/lib/constants';
import { calculateSettlements } from '@/lib/settlement';
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle as AlertTitleComponent } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { UserCircle, Briefcase, PlusCircle, Edit3, DollarSign as CurrencyIcon, Settings, Users, Activity, Trash2, MessageSquare, MapPin, CalendarPlus, InfoIcon, LogIn, Coins, Loader2, Wand2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const EXPENSES_PER_PAGE = 5;
const ITINERARY_ITEMS_PER_PAGE = 5;

const prepareDataForFirestore = (data: any): any => {
    if (data instanceof Timestamp || (data && typeof data === 'object' && data.constructor && data.constructor.name === 'FieldValue')) {
      return data; 
    }
    if (data instanceof Date) {
      return Timestamp.fromDate(data);
    }
    if (data === undefined) {
      return null; 
    }
    if (Array.isArray(data)) {
      return data.map(prepareDataForFirestore);
    }
    if (data && typeof data === 'object' && Object.prototype.toString.call(data) === '[object Object]' && Object.getPrototypeOf(data) === Object.prototype) {
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

const convertTimestampsToDates = (data: any): any => {
    if (data instanceof Timestamp) {
      return data.toDate();
    }
    if (Array.isArray(data)) {
      return data.map(convertTimestampsToDates);
    }
    if (data && typeof data === 'object' && !(data instanceof Date) && typeof data.toDate !== 'function') {
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
  const [isAddExpenseDialogOpen, setIsAddExpenseDialogOpen] = useState(false);

  const [isAddItineraryItemDialogOpen, setIsAddItineraryItemDialogOpen] = useState(false);
  const [itineraryItemToEdit, setItineraryItemToEdit] = useState<ItineraryItem | null>(null);
  const [isEditItineraryItemDialogOpen, setIsEditItineraryItemDialogOpen] = useState(false);
  const [isLoadingTrips, setIsLoadingTrips] = useState(true);
  const [isPaymentLogDialogOpen, setIsPaymentLogDialogOpen] = useState(false);

  const [currentExpensesPage, setCurrentExpensesPage] = useState(1);
  const [currentItineraryPage, setCurrentItineraryPage] = useState(1);
  const [selectedItineraryCategoryFilter, setSelectedItineraryCategoryFilter] = useState<string>("All");


  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const activeTrip = useMemo(() => {
    if (!isClient || !user) return undefined;
    return appState.trips.find(trip => trip.id === appState.activeTripId);
  }, [appState.trips, appState.activeTripId, isClient, user]);

  useEffect(() => {
    if (user && activeTrip) {
      setCurrentUserId(user.uid); 
    } else {
      setCurrentUserId('');
    }
  }, [user, activeTrip]);

  useEffect(() => {
    setCurrentExpensesPage(1);
    setCurrentItineraryPage(1);
    setSelectedItineraryCategoryFilter("All");
  }, [appState.activeTripId]);


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
      let userTrips: TripData[] = [];
      querySnapshot.forEach((docSnapshot) => {
        const rawData = docSnapshot.data();
        
        const tripDataWithGuaranteedArrays: Partial<TripData> & {id?:string} = {
          tripName: rawData.tripName || 'Untitled Trip',
          currency: rawData.currency || CURRENCIES[0],
          creatorUID: rawData.creatorUID || '', 
          members: Array.isArray(rawData.members) ? rawData.members.filter(m => m != null) : [],
          expenses: Array.isArray(rawData.expenses) ? rawData.expenses.filter(e => e != null) : [],
          itinerary: Array.isArray(rawData.itinerary) ? rawData.itinerary.filter(i => i != null && typeof i === 'object') : [],
          chatMessages: Array.isArray(rawData.chatMessages) ? rawData.chatMessages.filter(c => c != null) : [],
          memberUIDs: Array.isArray(rawData.memberUIDs) ? rawData.memberUIDs.filter(uid => uid != null) : [],
          destinationCity: rawData.destinationCity || '',
          destinationCountry: rawData.destinationCountry || '',
          budget: rawData.budget === undefined ? null : rawData.budget,
          ...rawData,
        };

        let tripDataWithDates = convertTimestampsToDates(tripDataWithGuaranteedArrays) as Omit<TripData, 'id'>;
        
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
        const dateA = dateAVal instanceof Date ? dateAVal.getTime() : (dateAVal as Timestamp)?.toDate?.().getTime() || 0;
        const dateB = dateBVal instanceof Date ? dateBVal.getTime() : (dateBVal as Timestamp)?.toDate?.().getTime() || 0;
        return (dateB || 0) - (dateA || 0); 
      });

      setAppState(prev => {
        let newActiveTripId = prev.activeTripId;
        if (!newActiveTripId && userTrips.length > 0) {
          newActiveTripId = userTrips[0].id;
        } else if (newActiveTripId && !userTrips.find(t => t.id === newActiveTripId)) {
          newActiveTripId = userTrips.length > 0 ? userTrips[0].id : null;
        }
        
        if (newActiveTripId && user) {
           setCurrentUserId(user.uid);
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
      setCurrentUserId(user.uid); 
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
        user.displayName, // Pass displayName
        user.email // Pass email
    );

    const tripDataForFirestore = prepareDataForFirestore(initialTripData);

    try {
      const docRef = await addDoc(collection(db, "trips"), tripDataForFirestore);
      toast({ title: "Trip Created", description: `"${initialTripData.tripName}" created. You've been added as the first member.`});
      setNewTripName('');
      setNewTripCurrency(CURRENCIES[0]);
      setIsCreateTripDialogOpen(false);
      // Optionally, set this new trip as active
      // handleSelectTrip(docRef.id); 
    } catch (error) {
      console.error("Error creating new trip in Firestore:", error);
      toast({ title: "Error Creating Trip", description: "Could not save the new trip to the database.", variant: "destructive"});
    }
  };

  const updateActiveTripInFirestore = useCallback(async (updatedTripData: Partial<Omit<TripData, 'id'>>) => {
    if (!activeTrip || !activeTrip.id || !user) return;

    if (!activeTrip.memberUIDs.includes(user.uid)) {
        toast({ title: "Update Forbidden", description: "You are not a member of this trip and cannot make changes.", variant: "destructive" });
        return;
    }

    const tripRef = firestoreDoc(db, "trips", activeTrip.id);
    let finalDataToUpdate = {};
    try {
      const dataToUpdateWithTimestamp = {
        ...updatedTripData,
        lastUpdatedAt: Timestamp.now()
      };
      finalDataToUpdate = prepareDataForFirestore(dataToUpdateWithTimestamp);
      await updateDoc(tripRef, finalDataToUpdate);
    } catch (error) {
      console.error("Error updating trip in Firestore. Original data:", updatedTripData, "Prepared data:", finalDataToUpdate, "Error:", error);
      toast({ title: "Error Updating Trip", description: `Could not save changes. ${error instanceof Error ? error.message : ''}`, variant: "destructive" });
    }
  }, [activeTrip, user, toast]);


 const handleAddMember = async (name: string, emailInput?: string) => {
    if (!activeTrip || !user) return;
    if (user.uid !== activeTrip.creatorUID) { 
      toast({ title: "Permission Denied", description: "Only the trip creator can add new members.", variant: "destructive" });
      return;
    }

    const normalizedName = name.trim();
    const email = emailInput ? emailInput.trim().toLowerCase() : undefined;

    if (activeTrip.members.some(m => m.name.toLowerCase() === normalizedName.toLowerCase() && (!email || m.email?.toLowerCase() === email) )) {
        toast({ title: "Member Already in Roster", description: `A member named "${normalizedName}" ${email ? `with email "${email}"` : ''} is already in this trip's display list.`, variant: "destructive" });
        return;
    }

    if (email) {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", email), limit(1)); 

        try {
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const existingUserDoc = querySnapshot.docs[0];
                const existingUserData = existingUserDoc.data() as { uid: string, name?: string, displayName?: string, email: string }; 
                const existingUserUID = existingUserData.uid;
                const memberDisplayName = existingUserData.displayName || existingUserData.name || normalizedName;

                if (activeTrip.memberUIDs.includes(existingUserUID)) {
                    toast({ title: "Member Already Has Access", description: `"${memberDisplayName}" (email: ${email}) already has access to this trip. Their display details will be updated if necessary.`, duration: 8000 });
                    const memberInDisplayList = activeTrip.members.find(m => m.id === existingUserUID);
                    if (memberInDisplayList && (memberInDisplayList.name !== memberDisplayName || memberInDisplayList.email !== email)) {
                        const updatedDisplayMember: Member = { ...memberInDisplayList, name: memberDisplayName, email };
                        const otherMembers = activeTrip.members.filter(m => m.id !== existingUserUID);
                        const preparedMembers = [...otherMembers.map(prepareDataForFirestore), prepareDataForFirestore(updatedDisplayMember)];
                        await updateActiveTripInFirestore({ members: preparedMembers });
                    }
                    return;
                }
                // User exists, grant them access and add to display list
                const memberToAdd: Member = { id: existingUserUID, name: memberDisplayName, email }; 
                const updatePayload:any = {
                    memberUIDs: arrayUnion(existingUserUID) as unknown as FieldValue, // Grant access
                    members: arrayUnion(prepareDataForFirestore(memberToAdd)) as unknown as FieldValue // Add to display list
                };
                await updateActiveTripInFirestore(updatePayload);
                toast({ title: "Member Invited & Access Granted", description: `"${memberToAdd.name}" (email: ${email}) has been invited. They can now see and edit this trip when they log in.`, duration: 8000 });

            } else {
                // No registered user with this email, add to display roster only
                const newDisplayMemberRaw: Member = { id: crypto.randomUUID(), name: normalizedName, email }; // Use a local UUID for display-only
                await updateActiveTripInFirestore({ members: arrayUnion(prepareDataForFirestore(newDisplayMemberRaw)) as unknown as FieldValue });
                toast({
                    title: "Member Added to Roster (Registration Needed for Full Access)",
                    description: `"${normalizedName}" (email: ${email}) added to trip roster. No registered user found with this email. For them to edit, they must sign up for TripSplit with this email. Then, try adding them again by email to grant access.`,
                    duration: 15000 
                });
            }
        } catch (error) {
            console.error("Error finding user by email or updating trip:", error);
            toast({ title: "Error Adding Member", description: "Could not process member addition. Please try again.", variant: "destructive" });
        }
    } else {
        // No email provided, add to display roster only
        const newDisplayMemberRaw: Member = { id: crypto.randomUUID(), name: normalizedName, email: undefined };
        await updateActiveTripInFirestore({ members: arrayUnion(prepareDataForFirestore(newDisplayMemberRaw)) as unknown as FieldValue });
        toast({
            title: "Member Added to Display Roster",
            description: `"${normalizedName}" has been added to this trip's display list (e.g., for assigning expenses). Without an email, they cannot be automatically granted edit access. Adding by email (after they register for TripSplit) can grant access.`,
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
    const updatePayload: any = { members: arrayRemove(preparedMemberToRemove) as unknown as FieldValue };

    // Also remove from memberUIDs if their UID was in there (i.e., they had access)
    if (activeTrip.memberUIDs.includes(idToRemove)) {
       if (idToRemove === activeTrip.creatorUID && activeTrip.memberUIDs.length === 1) { 
            // This case is mostly covered above, but good to double check
            toast({ title: "Action Blocked", description: "Cannot remove the trip creator's edit access if they are the only one with access.", variant: "destructive", duration: 8000});
            return;
       }
       updatePayload.memberUIDs = arrayRemove(idToRemove) as unknown as FieldValue;
    }

    await updateActiveTripInFirestore(updatePayload);
    toast({ title: "Member Removed", description: `${memberToRemove.name} removed from this trip. If they had edit access via UID, that access is now revoked.` , duration: 8000});
  };

  const handleAddExpense = async (expenseData: Omit<Expense, 'id' | 'comments' | 'createdAt'>) => {
    if (!activeTrip || !user) return;
    const newExpenseRaw: Expense = {
      ...expenseData,
      id: crypto.randomUUID(),
      comments: [],
      createdAt: new Date(), 
      date: expenseData.date as Date, // Ensure date is a Date object
    };
    const preparedNewExpense = prepareDataForFirestore(newExpenseRaw);
    await updateActiveTripInFirestore({ expenses: arrayUnion(preparedNewExpense) as any });
    toast({ title: "Expense Added", description: `${expenseData.description} for ${expenseData.amount} ${activeTrip.currency} added to "${activeTrip.tripName}".`});
    setIsAddExpenseDialogOpen(false); 
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
            await deleteDoc(firestoreDoc(db, "trips", itemToDeleteId));
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
    const tripRef = firestoreDoc(db, "trips", activeTrip.id);

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
        // Fallback to simpler update if batch fails (less atomic for arrays)
        const currentExpenses = activeTrip.expenses.filter(exp => exp.id !== expenseToEdit.id);
        const updatedExpensesForFirestore = [...currentExpenses.map(prepareDataForFirestore), preparedUpdatedExpense];
        await updateActiveTripInFirestore({ expenses: updatedExpensesForFirestore });
        toast({ title: "Expense Updated (fallback)", description: `"${updatedExpenseData.description}" has been updated.` });
    }

    setIsEditExpenseDialogOpen(false);
    setExpenseToEdit(null);
  };

  const handleAddExpenseComment = async (expenseId: string, text: string) => {
    if (!activeTrip || !user) {
      toast({title: "Authentication Error", description: "You must be logged in to comment.", variant: "destructive"});
      return;
    }
    let authorName = user.displayName || user.email?.split('@')[0] || "User";
    const memberProfile = activeTrip.members.find(m => m.id === user.uid);
    if (memberProfile) authorName = memberProfile.name;


    const newCommentRaw: ExpenseComment = {
      id: crypto.randomUUID(),
      expenseId, 
      authorId: user.uid,
      authorName: authorName,
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

  const handleAddChatMessage = async (messageContent: { text?: string; poll?: Omit<PollData, 'id' | 'voters'> }) => {
    if (!activeTrip || !user) {
        toast({title: "Authentication Error", description: "You must be logged in to send messages or create polls.", variant: "destructive"});
        return;
    }
    let senderName = user.displayName || user.email?.split('@')[0] || "User";
    const memberProfile = activeTrip.members.find(m => m.id === user.uid);
    if (memberProfile) senderName = memberProfile.name;
    
    const newMessageRaw: Partial<ChatMessage> = {
      id: crypto.randomUUID(),
      senderId: user.uid,
      senderName: senderName,
      createdAt: new Date(),
    };

    if (messageContent.text) {
      newMessageRaw.text = messageContent.text;
    } else if (messageContent.poll) {
      newMessageRaw.poll = {
        ...messageContent.poll,
        id: crypto.randomUUID(),
        voters: {}
      };
    } else {
      return; // Should not happen
    }

    const preparedNewMessage = prepareDataForFirestore(newMessageRaw as ChatMessage);
    await updateActiveTripInFirestore({ chatMessages: arrayUnion(preparedNewMessage) as any });
  };

  const handleVoteOnPoll = async (messageId: string, pollId: string, optionId: string) => {
    if (!activeTrip || !user) {
      toast({title: "Authentication Error", description: "You must be logged in to vote.", variant: "destructive"});
      return;
    }

    const messageIndex = activeTrip.chatMessages.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1 || !activeTrip.chatMessages[messageIndex].poll) return;

    const pollToUpdate = { ...activeTrip.chatMessages[messageIndex].poll! }; // Deep copy poll

    // Check if user already voted
    if (pollToUpdate.voters[user.uid]) {
      toast({title: "Already Voted", description: "You have already voted in this poll.", variant: "default"});
      return;
    }

    const optionIndex = pollToUpdate.options.findIndex(opt => opt.id === optionId);
    if (optionIndex === -1) return;

    pollToUpdate.options[optionIndex].votes += 1;
    pollToUpdate.voters[user.uid] = optionId;

    const updatedChatMessages = [...activeTrip.chatMessages];
    updatedChatMessages[messageIndex] = {
      ...updatedChatMessages[messageIndex],
      poll: pollToUpdate
    };
    
    const preparedChatMessages = updatedChatMessages.map(prepareDataForFirestore);
    await updateActiveTripInFirestore({ chatMessages: preparedChatMessages });
     toast({title: "Vote Cast!", description: `Your vote for "${pollToUpdate.options[optionIndex].text}" has been recorded.`, variant: "default"});
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
    if (!activeTrip || !user) return;
    const newItemRaw: ItineraryItem = {
      ...itemData,
      id: crypto.randomUUID(),
      createdAt: new Date(), 
      visitDate: itemData.visitDate as Date, 
      comments: [],
    };

    const preparedNewItem = prepareDataForFirestore(newItemRaw);
    await updateActiveTripInFirestore({ itinerary: arrayUnion(preparedNewItem) as any });
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
    const tripRef = firestoreDoc(db, "trips", activeTrip.id);

    const preparedOriginalItem = prepareDataForFirestore(originalItemFromState);
    const preparedUpdatedItem = prepareDataForFirestore(updatedItemData);

    batch.update(tripRef, { itinerary: arrayRemove(preparedOriginalItem) });
    batch.update(tripRef, { itinerary: arrayUnion(preparedUpdatedItem) as any });
    batch.update(tripRef, { lastUpdatedAt: Timestamp.now() });

    try {
        await batch.commit();
        toast({ title: "Itinerary Item Updated", description: `"${updatedItemData.placeName}" has been updated.` });
    } catch (error) {
        console.error("Error updating itinerary item with batch:", error);
        const currentItinerary = activeTrip.itinerary.filter(item => item.id !== itineraryItemToEdit.id);
        const updatedItineraryForFirestore = [...currentItinerary.map(prepareDataForFirestore), preparedUpdatedItem];
        await updateActiveTripInFirestore({ itinerary: updatedItineraryForFirestore });
        toast({ title: "Itinerary Item Updated (fallback)", description: `"${updatedItemData.placeName}" has been updated.` });
    }
    setIsEditItineraryItemDialogOpen(false);
    setItineraryItemToEdit(null);
  };

  const handleAddItineraryComment = async (itineraryItemId: string, text: string) => {
    if (!activeTrip || !user) {
        toast({title: "Authentication Error", description: "You must be logged in to comment.", variant: "destructive"});
        return;
    }
    let authorName = user.displayName || user.email?.split('@')[0] || "User";
    const memberProfile = activeTrip.members.find(m => m.id === user.uid);
    if (memberProfile) authorName = memberProfile.name;

    const newCommentRaw: ItineraryComment = {
      id: crypto.randomUUID(),
      authorId: user.uid,
      authorName: authorName,
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
    if (field === 'budget') {
        const numValue = parseFloat(value);
        await updateActiveTripInFirestore({ [field]: isNaN(numValue) ? null : numValue });
    } else if (field === 'members') { 
        await updateActiveTripInFirestore({ members: value.map(prepareDataForFirestore) });
    }
    else {
        await updateActiveTripInFirestore({ [field]: value }); 
    }
  };

 const handleRecordPayment = async (settlement: Settlement) => {
    if (!activeTrip || !user) return;

    const debtor = activeTrip.members.find(m => m.id === settlement.fromId);
    const creditor = activeTrip.members.find(m => m.id === settlement.toId);

    if (!debtor || !creditor) {
      toast({ title: "Error", description: "Could not find debtor or creditor for settlement.", variant: "destructive" });
      return;
    }

    const paymentExpense: Omit<Expense, 'id' | 'comments' | 'createdAt'> = {
      description: `Payment from ${debtor.name} to ${creditor.name}`,
      amount: settlement.amount,
      paidById: debtor.id,
      category: "Settlement Payment",
      date: new Date(), // Use current date for payment
      splitType: 'byAmount',
      splitDetails: [{ memberId: creditor.id, amount: settlement.amount }],
      receiptImageUri: undefined,
    };
    await handleAddExpense(paymentExpense); // Re-use existing add expense logic
    toast({ title: "Payment Recorded", description: `Payment of ${settlement.amount.toFixed(2)} ${activeTrip.currency} from ${debtor.name} to ${creditor.name} recorded as an expense.`});
  };

  const settlements = useMemo(() => {
    if (!isClient || !activeTrip) return [];
    return calculateSettlements(activeTrip.expenses, activeTrip.members);
  }, [activeTrip, isClient]);

  const handleOpenPaymentLog = useCallback(() => {
    console.log('handleOpenPaymentLog called in page.tsx, setting isPaymentLogDialogOpen to true');
    setIsPaymentLogDialogOpen(true);
  }, []);

  useEffect(() => {
    console.log('isPaymentLogDialogOpen changed to:', isPaymentLogDialogOpen)
  }, [isPaymentLogDialogOpen]);


  const sortedExpenses = useMemo(() => {
    if (!activeTrip) return [];
    return activeTrip.expenses
        .filter(exp => exp.category !== "Settlement Payment")
        .sort((a,b) => {
            const dateAVal = a.date;
            const dateBVal = b.date;
            const dateA = dateAVal instanceof Date ? dateAVal.getTime() : (dateAVal as any)?.toDate?.().getTime() || 0;
            const dateB = dateBVal instanceof Date ? dateBVal.getTime() : (dateBVal as any)?.toDate?.().getTime() || 0;
            return dateB - dateA; 
        });
  }, [activeTrip]);

  const paginatedExpenses = useMemo(() => {
      const startIndex = (currentExpensesPage - 1) * EXPENSES_PER_PAGE;
      const endIndex = startIndex + EXPENSES_PER_PAGE;
      return sortedExpenses.slice(startIndex, endIndex);
  }, [sortedExpenses, currentExpensesPage]);

  const totalExpensePages = useMemo(() => {
      return Math.ceil((sortedExpenses.length || 0) / EXPENSES_PER_PAGE);
  }, [sortedExpenses]);

  useEffect(() => {
    if (currentExpensesPage > totalExpensePages && totalExpensePages > 0) {
        setCurrentExpensesPage(totalExpensePages);
    } else if (currentExpensesPage <= 0 && totalExpensePages > 0) { 
        setCurrentExpensesPage(1);
    } else if (sortedExpenses.length > 0 && paginatedExpenses.length === 0 && currentExpensesPage > 1) {
      setCurrentExpensesPage(totalExpensePages > 0 ? totalExpensePages : 1);
    } else if (totalExpensePages === 0 && sortedExpenses.length === 0) { 
      setCurrentExpensesPage(1);
    }
  }, [currentExpensesPage, totalExpensePages, sortedExpenses, paginatedExpenses]);

  const allItineraryCategories = useMemo(() => {
    if (!activeTrip || !activeTrip.itinerary) return [];
    const categories = new Set<string>();
    activeTrip.itinerary.forEach(item => {
        if (item.category) categories.add(item.category);
    });
    return Array.from(categories).sort();
  }, [activeTrip]);

  const filteredItineraryItems = useMemo(() => {
    if (!activeTrip) return [];
    if (selectedItineraryCategoryFilter === "All") {
        return activeTrip.itinerary;
    }
    return activeTrip.itinerary.filter(item => item.category === selectedItineraryCategoryFilter);
  }, [activeTrip, selectedItineraryCategoryFilter]);


  const sortedItineraryItems = useMemo(() => {
    return [...filteredItineraryItems].sort((a,b) => {
        const dateAVal = a.visitDate;
        const dateBVal = b.visitDate;
        const dateA = dateAVal instanceof Date ? dateAVal.getTime() : (dateAVal as any)?.toDate?.().getTime() || 0;
        const dateB = dateBVal instanceof Date ? dateBVal.getTime() : (dateBVal as any)?.toDate?.().getTime() || 0;
        return dateA - dateB;
    });
  }, [filteredItineraryItems]);

  const paginatedItineraryItems = useMemo(() => {
      const startIndex = (currentItineraryPage - 1) * ITINERARY_ITEMS_PER_PAGE;
      const endIndex = startIndex + ITINERARY_ITEMS_PER_PAGE;
      return sortedItineraryItems.slice(startIndex, endIndex);
  }, [sortedItineraryItems, currentItineraryPage]);

  const totalItineraryPages = useMemo(() => {
      return Math.ceil((sortedItineraryItems.length || 0) / ITINERARY_ITEMS_PER_PAGE);
  }, [sortedItineraryItems]);

  useEffect(() => {
    if (currentItineraryPage > totalItineraryPages && totalItineraryPages > 0) {
        setCurrentItineraryPage(totalItineraryPages);
    } else if (currentItineraryPage <= 0 && totalItineraryPages > 0) { 
        setCurrentItineraryPage(1);
    } else if (sortedItineraryItems.length > 0 && paginatedItineraryItems.length === 0 && currentItineraryPage > 1) {
      setCurrentItineraryPage(totalItineraryPages > 0 ? totalItineraryPages : 1);
    } else if (totalItineraryPages === 0 && sortedItineraryItems.length === 0) { 
      setCurrentItineraryPage(1);
    }
  }, [currentItineraryPage, totalItineraryPages, sortedItineraryItems, paginatedItineraryItems]);

  const handleItineraryCategoryFilterChange = (category: string) => {
    setSelectedItineraryCategoryFilter(category);
    setCurrentItineraryPage(1); 
  };


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
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background to-secondary/30 text-foreground">
      <AppHeader tripName={activeTrip?.tripName} />
      <main className="flex-grow container mx-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 p-4 bg-card/80 backdrop-blur-sm rounded-lg shadow-lg">
            <div className="flex-grow w-full sm:max-w-xs">
                <Label htmlFor="tripSelector" className="flex items-center mb-1 text-sm font-medium text-card-foreground"><Briefcase className="mr-2 h-4 w-4"/> Active Trip</Label>
                <Select
                    value={appState.activeTripId || ''}
                    onValueChange={(tripId) => handleSelectTrip(tripId)}
                    disabled={appState.trips.length === 0}
                >
                    <SelectTrigger id="tripSelector" className="text-sm">
                        <SelectValue placeholder="Select a trip" />
                    </SelectTrigger>
                    <SelectContent>
                        {appState.trips.map(trip => (
                            <SelectItem key={trip.id} value={trip.id} className="text-sm">{trip.tripName}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <Dialog open={isCreateTripDialogOpen} onOpenChange={setIsCreateTripDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-auto text-sm border-primary/50 hover:bg-primary/10">
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

        {!activeTrip && appState.trips.length > 0 && (
             <div className="text-center p-10 bg-card/80 backdrop-blur-sm rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold mb-2 text-card-foreground">Select a trip</h2>
                <p className="text-muted-foreground">Please select a trip from the dropdown above to view its details.</p>
            </div>
        )}

        {!activeTrip && appState.trips.length === 0 && !isLoadingTrips && (
            <div className="text-center p-10 bg-card/80 backdrop-blur-sm rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold mb-2 text-card-foreground">Welcome to TripSplit!</h2>
                <p className="text-muted-foreground mb-4">It looks like you don't have any trips yet for user: {user.email}.</p>
                <Button onClick={() => setIsCreateTripDialogOpen(true)} className="text-base py-3">
                    <PlusCircle className="mr-2 h-5 w-5" /> Create Your First Trip
                </Button>
            </div>
        )}

        {activeTrip && user && (
          <Tabs defaultValue="activity" className="w-full">
            <ScrollArea orientation="horizontal" className="w-full whitespace-nowrap pb-2.5 mb-6">
              <div className="flex justify-center">
                <TabsList className="inline-flex h-10 items-center rounded-md bg-muted p-1 text-muted-foreground">
                  <TabsTrigger value="manage" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm gap-2"><Settings className="h-4 w-4"/> Manage</TabsTrigger>
                  <TabsTrigger value="info" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm gap-2"><InfoIcon className="h-4 w-4"/> Trip Info</TabsTrigger>
                  <TabsTrigger value="ai-plan" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm gap-2"><Wand2 className="h-4 w-4"/> Plan with AI</TabsTrigger>
                  <TabsTrigger value="activity" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm gap-2"><Activity className="h-4 w-4"/> Activity</TabsTrigger>
                  <TabsTrigger value="itinerary" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm gap-2"><MapPin className="h-4 w-4"/> Itinerary</TabsTrigger>
                  <TabsTrigger value="chat" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm gap-2"><MessageSquare className="h-4 w-4"/> Chat</TabsTrigger>
                </TabsList>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>

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

            <TabsContent value="ai-plan">
                <AiTripIdeation />
            </TabsContent>

            <TabsContent value="activity">
              <div className="flex flex-col sm:flex-row justify-end items-center mb-4 gap-3">
                <Button onClick={() => setIsAddExpenseDialogOpen(true)} disabled={!user} className="w-full sm:w-auto">
                    <PlusCircle className="mr-2 h-5 w-5" /> Add New Expense
                </Button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6 flex flex-col">
                  <SettlementSummary
                    settlements={settlements}
                    tripCurrency={activeTrip.currency}
                    onRecordPayment={handleRecordPayment}
                    onViewPaymentLog={handleOpenPaymentLog} 
                    members={activeTrip.members}
                  />
                </div>
                <div className="lg:col-span-2 min-h-[600px] flex flex-col"> 
                   <ExpenseList
                      expenses={paginatedExpenses}
                      members={activeTrip.members}
                      tripCurrency={activeTrip.currency}
                      onAddComment={handleAddExpenseComment}
                      onDeleteExpense={(expenseId) => handleRequestDeleteItem(expenseId, 'expense')}
                      onEditExpense={handleOpenEditExpenseDialog}
                      currentPage={currentExpensesPage}
                      totalPages={totalExpensePages}
                      onPageChange={setCurrentExpensesPage}
                    />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="itinerary" className="space-y-6">
              <div className="flex justify-end mb-4">
                <Button onClick={() => setIsAddItineraryItemDialogOpen(true)} disabled={!user}>
                  <CalendarPlus className="mr-2 h-5 w-5" /> Add Itinerary Item
                </Button>
              </div>
               <div className="h-[calc(100vh-320px)] min-h-[400px] md:h-[600px]">
                <ItineraryList
                  itineraryItems={paginatedItineraryItems}
                  onEditItem={handleOpenEditItineraryItemDialog}
                  onDeleteItem={(itemId) => handleRequestDeleteItem(itemId, 'itinerary')}
                  onAddComment={handleAddItineraryComment}
                  currentPage={currentItineraryPage}
                  totalPages={totalItineraryPages}
                  onPageChange={setCurrentItineraryPage}
                  categories={allItineraryCategories}
                  selectedCategory={selectedItineraryCategoryFilter}
                  onCategoryChange={handleItineraryCategoryFilterChange}
                />
              </div>
            </TabsContent>

            <TabsContent value="chat">
              <div className="h-[calc(100vh-280px)] min-h-[400px] md:h-[600px]"> 
                <ChatRoom
                  messages={activeTrip.chatMessages}
                  onAddChatMessage={handleAddChatMessage}
                  onVoteOnPoll={handleVoteOnPoll}
                />
              </div>
            </TabsContent>
          </Tabs>
        )}
      </main>
      <footer className="text-center p-4 text-muted-foreground text-sm border-t border-border/50">
        TripSplit &copy; {new Date().getFullYear()}
      </footer>

      <AlertDialog open={isDeleteConfirmationDialogOpen} onOpenChange={setIsDeleteConfirmationDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertTitleComponent className="flex items-center"><Trash2 className="mr-2 h-5 w-5 text-destructive"/>Confirm Deletion</AlertTitleComponent>
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

      {activeTrip && user && (
        <Dialog open={isAddExpenseDialogOpen} onOpenChange={setIsAddExpenseDialogOpen}>
            <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center text-xl">
                        <PlusCircle className="mr-2 h-6 w-6" /> Add New Expense
                    </DialogTitle>
                </DialogHeader>
                <ExpenseForm
                    members={activeTrip.members}
                    onAddExpense={handleAddExpense}
                    tripCurrency={activeTrip.currency}
                    onFormSubmit={() => setIsAddExpenseDialogOpen(false)} 
                    loggedInUserId={user.uid}
                />
            </DialogContent>
        </Dialog>
      )}

      {expenseToEdit && activeTrip && user && (
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
      {activeTrip && user && (activeTrip.expenses) && (
        <SettlementLogDialog
          isOpen={isPaymentLogDialogOpen}
          onOpenChange={setIsPaymentLogDialogOpen}
          expenses={activeTrip.expenses || []} 
          tripCurrency={activeTrip.currency}
          members={activeTrip.members}
        />
      )}
    </div>
  );
}
