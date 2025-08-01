
"use client";

import type React from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation'; // Import useParams
import { db, Timestamp, doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, deleteDoc, query, collection, where, getDocs, limit, writeBatch, serverTimestamp } from '@/lib/firebase';
import type { TripData, Member, Expense, Comment, ChatMessage, ItineraryItem, ItineraryComment, SplitType, Settlement, PollData, PollOption, PhotoAlbum, Photo } from '@/lib/types';
import { CURRENCIES, createInitialTripData } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';
import { AppHeader } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle as AlertTitleComponent, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';


import { TripSettings } from '@/components/trip/TripSettings';
import { MemberManager } from '@/components/trip/MemberManager';
import { ExpenseForm } from '@/components/trip/ExpenseForm';
import { EditExpenseDialog } from '@/components/trip/EditExpenseDialog';
import { ExpenseList } from '@/components/trip/ExpenseList';
import { SettlementSummary } from '@/components/trip/SettlementSummary';
import { ChatRoom } from '@/components/trip/ChatRoom';
import { ItineraryFormDialog } from '@/components/trip/ItineraryFormDialog';
import { EditItineraryItemDialog } from '@/components/trip/EditItineraryItemDialog';
import { ItineraryList } from '@/components/trip/ItineraryList';
import { TripInfo } from '@/components/trip/TripInfo';
import { AiTripIdeation } from '@/components/trip/AiTripIdeation';
import { AiAssistant } from '@/components/trip/AiAssistant';
import { SettlementLogDialog } from '@/components/trip/SettlementLogDialog';
import { SpendingOverTimeChart } from '@/components/trip/charts/SpendingOverTimeChart';
import { SpendingByMemberChart } from '@/components/trip/charts/SpendingByMemberChart';
import { SpendingByCategoryChart } from '@/components/trip/charts/SpendingByCategoryChart';
import { BudgetVsActualChart } from '@/components/trip/charts/BudgetVsActualChart';
import { ExpenseFrequencyChart } from '@/components/trip/charts/ExpenseFrequencyChart';
import { TopExpensesChart } from '@/components/trip/charts/TopExpensesChart';
import { PhotoSharingTab } from '@/components/trip/PhotoSharingTab';


import { calculateSettlements } from '@/lib/settlement';
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Users, DollarSign as CurrencyIcon, Loader2, Home, LayoutList, MessageSquare, InfoIcon, Wand2, CalendarCheck, PiggyBank, Camera, BarChart3, TrendingUp, Calendar, PieChart, Activity, Crown, Calculator, MapPin } from 'lucide-react';
import { prepareDataForFirestore } from '@/lib/firestore-utils';

const EXPENSES_PER_PAGE = 5;
const ITINERARY_ITEMS_PER_PAGE = 6; 

export default function TripDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const tripId = params?.tripId as string | undefined;

  const [activeTrip, setActiveTrip] = useState<TripData | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isLoadingTrip, setIsLoadingTrip] = useState(true);

  const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);
  const [itemTypeToDelete, setItemTypeToDelete] = useState<'expense' | 'itinerary' | 'trip' | null>(null);
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);

  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const [isEditExpenseDialogOpen, setIsEditExpenseDialogOpen] = useState(false);

  const [isAddExpenseDialogOpen, setIsAddExpenseDialogOpen] = useState(false);
  
  const [itineraryItemToEdit, setItineraryItemToEdit] = useState<ItineraryItem | null>(null);
  const [isItineraryFormOpen, setIsItineraryFormOpen] = useState(false);

  const [isSettlementLogDialogOpen, setIsSettlementLogDialogOpen] = useState(false);
  const [isBudgetInsightsDialogOpen, setIsBudgetInsightsDialogOpen] = useState(false);

  const [currentExpensesPage, setCurrentExpensesPage] = useState(1);
  const [currentItineraryPage, setCurrentItineraryPage] = useState(1);
  
  const [selectedItineraryCategoryFilter, setSelectedItineraryCategoryFilter] = useState<string>("All");

  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!tripId || !user || !isClient) {
      if (isClient && !authLoading && !user) router.replace('/'); // Redirect if not logged in
      setActiveTrip(null);
      setIsLoadingTrip(false);
      return;
    }

    setIsLoadingTrip(true);
    const tripDocRef = doc(db, "trips", tripId);

    const unsubscribe = onSnapshot(tripDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const rawData = docSnapshot.data() as Omit<TripData, 'id'>;
        
        const guaranteedData: Partial<TripData> = {
            tripName: rawData.tripName || 'Untitled Trip',
            currency: rawData.currency || CURRENCIES[0],
            creatorUID: rawData.creatorUID || '',
            ...rawData, // spread rawData first
            members: Array.isArray(rawData.members) ? rawData.members.filter(m => m != null) : [],
            expenses: Array.isArray(rawData.expenses) ? rawData.expenses.filter(e => e != null) : [],
            itinerary: Array.isArray(rawData.itinerary) ? rawData.itinerary.filter(i => i != null && typeof i === 'object') : [],
            chatMessages: Array.isArray(rawData.chatMessages) ? rawData.chatMessages.filter(c => c != null) : [],
            memberUIDs: Array.isArray(rawData.memberUIDs) ? rawData.memberUIDs.filter(uid => uid != null) : [],
            settlementClearances: Array.isArray(rawData.settlementClearances) ? rawData.settlementClearances.filter(sc => sc != null) : [],
            photoAlbums: Array.isArray(rawData.photoAlbums) ? rawData.photoAlbums.filter(pa => pa != null) : [], // Initialize photoAlbums
            photos: Array.isArray(rawData.photos) ? rawData.photos.filter(p => p != null) : [],                 // Initialize photos
        };

        let tripDataWithDates = convertTimestampsToDates(guaranteedData) as Omit<TripData, 'id'>;
        
        tripDataWithDates.members = (tripDataWithDates.members || []).filter(m => m != null);
        tripDataWithDates.expenses = (tripDataWithDates.expenses || []).map(exp => ({
          ...exp,
          date: exp.date, 
          createdAt: exp.createdAt, 
          comments: (exp.comments || []).filter(c => c != null)
        })).filter(e => e != null);
        tripDataWithDates.itinerary = (tripDataWithDates.itinerary || []).map(item => ({
          ...item,
          visitDate: item.visitDate, 
          createdAt: item.createdAt, 
          comments: (item.comments || []).filter(c => c != null)
        })).filter(i => i != null && typeof i === 'object');
        tripDataWithDates.chatMessages = (tripDataWithDates.chatMessages || []).filter(c => c != null);
        
        tripDataWithDates.settlementClearances = (tripDataWithDates.settlementClearances || []).map(sc => ({
            ...sc,
            clearedAt: sc.clearedAt 
        })).filter(sc => sc != null);

        tripDataWithDates.photoAlbums = (tripDataWithDates.photoAlbums || []).map(album => ({
          ...album,
          createdAt: album.createdAt
        })).filter(pa => pa != null);

        tripDataWithDates.photos = (tripDataWithDates.photos || []).map(photo => ({
          ...photo,
          createdAt: photo.createdAt
        })).filter(p => p != null);


        if(tripDataWithDates.currentSettlementsLastClearedAt) {
            // This field is directly a Timestamp or null, so convertTimestampsToDates handles it.
        }


        if (!tripDataWithDates.memberUIDs.includes(user.uid)) {
          toast({ title: "Access Denied", description: "You are not a member of this trip.", variant: "destructive"});
          router.replace('/home');
          setActiveTrip(null);
          setIsLoadingTrip(false);
          return;
        }
        setActiveTrip({ id: docSnapshot.id, ...tripDataWithDates });
      } else {
        toast({ title: "Trip Not Found", description: "This trip does not exist or you don't have access.", variant: "destructive"});
        router.replace('/home');
        setActiveTrip(null);
      }
      setIsLoadingTrip(false);
    }, (error) => {
      console.error("Error fetching trip from Firestore:", error);
      toast({ title: "Error Loading Trip", description: "Could not fetch the trip data.", variant: "destructive"});
      setIsLoadingTrip(false);
      router.replace('/home');
    });

    return () => unsubscribe();
  }, [tripId, user, isClient, toast, router, authLoading]);


  const convertTimestampsToDates = (data: any): any => {
    if (data instanceof Timestamp) {
      return data.toDate();
    }
    if (Array.isArray(data)) {
      return data.map(convertTimestampsToDates);
    }
    if (data && typeof data === 'object' && !(data instanceof Date) && typeof (data as any).toDate !== 'function' && Object.getPrototypeOf(data) === Object.prototype) {
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


  const updateActiveTripInFirestore = async (updatedTripData: Partial<Omit<TripData, 'id'>>) => {
    if (!activeTrip || !user) {
      toast({ title: "Error", description: "No active trip or user not logged in.", variant: "destructive" });
      return;
    }
     if (!activeTrip.memberUIDs.includes(user.uid)) {
      toast({ title: "Permission Denied", description: "You are not authorized to update this trip.", variant: "destructive" });
      return;
    }

    const tripRef = doc(db, "trips", activeTrip.id);
    try {
      const dataToUpdateWithTimestamp = { ...updatedTripData, lastUpdatedAt: Timestamp.now() };
      const finalDataToUpdate = prepareDataForFirestore(dataToUpdateWithTimestamp);
      await updateDoc(tripRef, finalDataToUpdate);
    } catch (error: any) {
      console.error("Error updating trip in Firestore:", error, "Data attempted:", updatedTripData);
      toast({ title: "Update Failed", description: `Could not save changes to Firestore: ${error.message || 'Unknown error'}.`, variant: "destructive" });
    }
  };


  const handleAddMember = async (name: string, email?: string) => {
    if (!activeTrip || !user) return;
    if (user.uid !== activeTrip.creatorUID) {
        toast({ title: "Permission Denied", description: "Only the trip creator can add members.", variant: "destructive" });
        return;
    }

    const lowercasedEmail = email?.trim().toLowerCase();
    const existingMemberByName = activeTrip.members.find(m => m.name.toLowerCase() === name.trim().toLowerCase());
    if (existingMemberByName) {
        toast({ title: "Member Name Exists", description: `${name.trim()} is already in this trip's display roster.`, variant: "destructive" });
        return;
    }
    if (lowercasedEmail) {
        const existingMemberByEmail = activeTrip.members.find(m => m.email?.toLowerCase() === lowercasedEmail);
        if (existingMemberByEmail) {
            toast({ title: "Member Email Exists", description: `A member with email ${lowercasedEmail} is already in this trip's display roster.`, variant: "destructive" });
            return;
        }
    }
    
    let updatePayload: Partial<TripData> = {};
    let toastTitle = "Member Added to Display Roster";
    let toastDescription = `${name.trim()} (${lowercasedEmail || 'no email'}) added to this trip's display roster. For them to edit, they need to sign up and be re-invited with their registered email, or their Firebase UID must be manually added to this trip by the creator in Firestore.`;

    if (lowercasedEmail) {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", lowercasedEmail), limit(1));
        try {
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const existingUserData = querySnapshot.docs[0].data() as { uid: string; displayName: string; email: string };
                const existingUserUID = existingUserData.uid;

                if (activeTrip.memberUIDs.includes(existingUserUID)) {
                    toastTitle = "Member Already Has Access";
                    toastDescription = `${existingUserData.displayName || name.trim()} already has access to this trip.`;
                    
                    const localMemberIndex = activeTrip.members.findIndex(m => m.id === existingUserUID);
                    if (localMemberIndex !== -1) { 
                        const localMember = activeTrip.members[localMemberIndex];
                        if (localMember.name !== (existingUserData.displayName || name.trim()) || localMember.email?.toLowerCase() !== existingUserData.email.toLowerCase()) {
                            const updatedMembers = [...activeTrip.members];
                            updatedMembers[localMemberIndex] = { ...localMember, name: existingUserData.displayName || name.trim(), email: existingUserData.email.toLowerCase() };
                            updatePayload.members = updatedMembers; 
                        }
                    } else { 
                         const memberToAdd = { id: existingUserUID, name: existingUserData.displayName || name.trim(), email: existingUserData.email.toLowerCase() };
                         updatePayload.members = arrayUnion(prepareDataForFirestore(memberToAdd));
                    }
                } else { 
                    const memberToAdd = { id: existingUserUID, name: existingUserData.displayName || name.trim(), email: existingUserData.email.toLowerCase() };
                    updatePayload.memberUIDs = arrayUnion(existingUserUID); 
                    updatePayload.members = arrayUnion(prepareDataForFirestore(memberToAdd)); 
                    toastTitle = "Member Invited & Access Granted";
                    toastDescription = `${memberToAdd.name} (email: ${lowercasedEmail}) has been invited. They can now see and edit this trip when they log in.`;
                }
            } else { 
                 const newDisplayMemberRaw = { id: crypto.randomUUID(), name: name.trim(), email: lowercasedEmail };
                 updatePayload.members = arrayUnion(prepareDataForFirestore(newDisplayMemberRaw)); 
            }
        } catch (error) {
            console.error("Error querying user by email:", error);
            toast({ title: "Error Adding Member", description: "Could not verify user email.", variant: "destructive" });
            return;
        }
    } else { 
        const newDisplayMemberRaw = { id: crypto.randomUUID(), name: name.trim(), email: undefined };
        updatePayload.members = arrayUnion(prepareDataForFirestore(newDisplayMemberRaw));
    }
    
    if (Object.keys(updatePayload).length > 0) {
        await updateActiveTripInFirestore(updatePayload);
    }
    toast({ title: toastTitle, description: toastDescription, duration: 10000 });
  };

  const handleRemoveMember = async (idToRemove: string) => {
    if (!activeTrip || !user) return;
     if (user.uid !== activeTrip.creatorUID) {
        toast({ title: "Permission Denied", description: "Only the trip creator can remove members.", variant: "destructive" });
        return;
    }

    const memberToRemove = activeTrip.members.find(m => m.id === idToRemove);
    if (!memberToRemove) return;

    if (memberToRemove.id === activeTrip.creatorUID) {
        toast({ title: "Action Not Allowed", description: "The trip creator cannot be removed using this function. Consider deleting the trip if you are the last member and wish to remove yourself.", variant: "destructive", duration: 7000});
        return;
    }

    const isMemberInvolvedInExpenses = activeTrip.expenses.some(exp => 
      exp.paidById === idToRemove || (exp.splitDetails && exp.splitDetails.some(sd => sd.memberId === idToRemove))
    );
    if (isMemberInvolvedInExpenses) {
      toast({ title: "Cannot Remove Member", description: `${memberToRemove.name} is involved in existing expenses and cannot be removed. Settle or reassign expenses first.`, variant: "destructive", duration: 7000 });
      return;
    }
    
    const preparedMemberToRemove = prepareDataForFirestore(memberToRemove);
    let updatePayload: Partial<TripData> = { members: arrayRemove(preparedMemberToRemove) as any };

    if (activeTrip.memberUIDs.includes(idToRemove)) { 
        updatePayload.memberUIDs = arrayRemove(idToRemove) as any;
    }
    
    await updateActiveTripInFirestore(updatePayload);
    toast({ title: "Member Removed", description: `${memberToRemove.name} removed from the trip.` });
  };

  const handleAddExpense = async (expenseData: Omit<Expense, 'id' | 'comments' | 'createdAt'>) => {
    if (!activeTrip || !user) return;
    const newExpense: Omit<Expense, 'id'> = {
      ...expenseData,
      comments: [],
      createdAt: Timestamp.now(), 
    };
    const preparedNewExpense = prepareDataForFirestore(newExpense);
    await updateActiveTripInFirestore({ expenses: arrayUnion(preparedNewExpense) as any });
    toast({ title: "Expense Added", description: `"${newExpense.description}" added.` });
    setIsAddExpenseDialogOpen(false); 
    setCurrentExpensesPage(1); 
  };

  const handleRequestDeleteItem = (id: string, type: 'expense' | 'itinerary' | 'trip') => {
    setItemToDeleteId(id);
    setItemTypeToDelete(type);
    setIsDeleteConfirmationOpen(true);
  };
  
  const handleConfirmDelete = async () => {
    if (!itemToDeleteId || !itemTypeToDelete || !activeTrip || !user) return;

    if (itemTypeToDelete === 'trip') {
        if (user.uid !== activeTrip.creatorUID) {
            toast({ title: "Deletion Forbidden", description: "Only the trip creator can delete this trip.", variant: "destructive" });
            setIsDeleteConfirmationOpen(false);
            return;
        }
        try {
            await deleteDoc(doc(db, "trips", itemToDeleteId));
            toast({ title: "Trip Deleted", description: `Trip "${activeTrip.tripName}" has been deleted.` });
            router.replace('/home'); 
        } catch (error) {
            console.error("Error deleting trip from Firestore:", error);
            toast({ title: "Error Deleting Trip", description: "Could not delete the trip.", variant: "destructive"});
        }
    } else if (itemTypeToDelete === 'expense') {
        const expenseToDelete = activeTrip.expenses.find(exp => exp.id === itemToDeleteId);
        if (!expenseToDelete) return;
        const preparedExpenseToDelete = prepareDataForFirestore(expenseToDelete);
        await updateActiveTripInFirestore({ expenses: arrayRemove(preparedExpenseToDelete) as any });
        toast({ title: "Expense Deleted" });
    } else if (itemTypeToDelete === 'itinerary') {
        const itemToDelete = activeTrip.itinerary.find(item => item.id === itemToDeleteId);
        if(!itemToDelete) return;
        const preparedItemToDelete = prepareDataForFirestore(itemToDelete);
        await updateActiveTripInFirestore({ itinerary: arrayRemove(preparedItemToDelete) as any });
        toast({title: "Itinerary Item Deleted"});
    }

    setIsDeleteConfirmationOpen(false);
    setItemToDeleteId(null);
    setItemTypeToDelete(null);
  };

  const handleEditExpense = (expense: Expense) => {
    setExpenseToEdit(expense);
    setIsEditExpenseDialogOpen(true);
  };

  const handleUpdateExpense = async (updatedExpenseData: Expense) => {
    if (!activeTrip || !user || !expenseToEdit) return;

    const batch = writeBatch(db);
    const tripRef = doc(db, "trips", activeTrip.id);

    const originalExpenseInState = activeTrip.expenses.find(e => e.id === expenseToEdit.id);
    if (!originalExpenseInState) {
        toast({title: "Error", description: "Original expense not found for update.", variant: "destructive"});
        setIsEditExpenseDialogOpen(false);
        return;
    }
    const preparedOriginalExpense = prepareDataForFirestore(originalExpenseInState);
    const preparedUpdatedExpense = prepareDataForFirestore(updatedExpenseData);

    batch.update(tripRef, { expenses: arrayRemove(preparedOriginalExpense) });
    batch.update(tripRef, { expenses: arrayUnion(preparedUpdatedExpense) });
    batch.update(tripRef, { lastUpdatedAt: Timestamp.now() });
    
    try {
        await batch.commit();
        toast({ title: "Expense Updated", description: `"${updatedExpenseData.description}" updated.`});
    } catch (error) {
        console.error("Error updating expense with batch:", error);
        const updatedExpenses = activeTrip.expenses.map(exp => exp.id === updatedExpenseData.id ? updatedExpenseData : exp);
        await updateActiveTripInFirestore({ expenses: updatedExpenses });
        toast({ title: "Expense Updated (fallback)", description: `"${updatedExpenseData.description}" updated.`});
    }
    setIsEditExpenseDialogOpen(false);
    setExpenseToEdit(null);
  };

  const handleAddExpenseComment = async (expenseId: string, text: string) => {
    if (!activeTrip || !user) return;
    const expenseIndex = activeTrip.expenses.findIndex(exp => exp.id === expenseId);
    if (expenseIndex === -1) return;

    let authorName = user.displayName || user.email?.split('@')[0] || "User";
    const memberProfile = activeTrip.members.find(m => m.id === user.uid);
    if (memberProfile && memberProfile.name) {
      authorName = memberProfile.name;
    }


    const newComment: Comment = {
      id: crypto.randomUUID(),
      expenseId,
      authorId: user.uid,
      authorName,
      text,
      createdAt: Timestamp.now(),
    };
    
    const expenseToUpdate = { ...activeTrip.expenses[expenseIndex] };
    expenseToUpdate.comments = [...(expenseToUpdate.comments || []), newComment];
    
    const finalExpensesArray = activeTrip.expenses.map((exp, index) => 
      index === expenseIndex ? expenseToUpdate : exp
    );
    await updateActiveTripInFirestore({ expenses: finalExpensesArray });
  };

  const handleAddChatMessage = async (messageContent: { text?: string; poll?: Omit<PollData, 'id' | 'voters'> }) => {
    if (!activeTrip || !user) return;

    let senderName = user.displayName || user.email?.split('@')[0] || "User";
    const memberProfile = activeTrip.members.find(m => m.id === user.uid);
    if (memberProfile && memberProfile.name) {
        senderName = memberProfile.name;
    }
    
    const baseMessage = {
        id: crypto.randomUUID(),
        senderId: user.uid,
        senderName,
        createdAt: Timestamp.now(),
    };

    let newMessage: ChatMessage;

    if(messageContent.poll) {
        const newPollData: PollData = {
            ...messageContent.poll,
            id: crypto.randomUUID(),
            voters: {},
        };
        newMessage = { ...baseMessage, poll: newPollData, text: messageContent.text }; 
    } else if (messageContent.text) {
        newMessage = { ...baseMessage, text: messageContent.text };
    } else {
        toast({title: "Cannot send empty message", variant: "destructive"});
        return;
    }

    const preparedNewMessage = prepareDataForFirestore(newMessage);
    await updateActiveTripInFirestore({ chatMessages: arrayUnion(preparedNewMessage) as any });
  };

  const handleVoteOnPoll = async (messageId: string, pollId: string, optionId: string) => {
    if (!activeTrip || !user) return;

    const messageIndex = activeTrip.chatMessages.findIndex(msg => msg.id === messageId && msg.poll?.id === pollId);
    if (messageIndex === -1 || !activeTrip.chatMessages[messageIndex].poll) return;

    const pollToUpdate = { ...activeTrip.chatMessages[messageIndex].poll! }; 

    if (pollToUpdate.voters[user.uid]) {
        toast({title: "Already Voted", description: "You have already voted in this poll.", variant: "destructive"});
        return;
    }

    const updatedOptions = pollToUpdate.options.map(opt => 
        opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt
    );
    const updatedVoters = { ...pollToUpdate.voters, [user.uid]: optionId };

    const updatedPollData: PollData = { ...pollToUpdate, options: updatedOptions, voters: updatedVoters };
    
    const updatedChatMessages = [...activeTrip.chatMessages]; 
    updatedChatMessages[messageIndex] = { ...updatedChatMessages[messageIndex], poll: updatedPollData };
    
    await updateActiveTripInFirestore({ chatMessages: updatedChatMessages });
    toast({title: "Vote Recorded!"});
  };


  const handleAddItineraryItem = async (itemData: Omit<ItineraryItem, 'id' | 'createdAt' | 'comments'>) => {
    if (!activeTrip || !user) return;
    const newItem: Omit<ItineraryItem, 'id'> = {
      ...itemData,
      comments: [],
      createdAt: Timestamp.now(),
    };
    const preparedNewItem = prepareDataForFirestore(newItem);
    await updateActiveTripInFirestore({ itinerary: arrayUnion(preparedNewItem) as any });
    toast({title: "Itinerary Item Added"});
    setIsItineraryFormOpen(false);
    setCurrentItineraryPage(1);
  };

  const handleEditItineraryItem = (item: ItineraryItem) => {
    setItineraryItemToEdit(item);
    setIsItineraryFormOpen(true);
  };

  const handleUpdateItineraryItem = async (updatedItemData: ItineraryItem) => {
    if (!activeTrip || !user || !itineraryItemToEdit) return;
    
    const batch = writeBatch(db);
    const tripRef = doc(db, "trips", activeTrip.id);

    const originalItemInState = activeTrip.itinerary.find(i => i.id === itineraryItemToEdit.id);
    if (!originalItemInState) {
        toast({title: "Error", description: "Original itinerary item not found for update.", variant: "destructive"});
        setIsItineraryFormOpen(false);
        return;
    }
    const preparedOriginalItem = prepareDataForFirestore(originalItemInState);
    const preparedUpdatedItem = prepareDataForFirestore(updatedItemData);

    batch.update(tripRef, { itinerary: arrayRemove(preparedOriginalItem) });
    batch.update(tripRef, { itinerary: arrayUnion(preparedUpdatedItem) });
    batch.update(tripRef, { lastUpdatedAt: Timestamp.now() });

    try {
        await batch.commit();
        toast({title: "Itinerary Item Updated"});
    } catch (error) {
        console.error("Error updating itinerary item with batch:", error);
        const updatedItinerary = activeTrip.itinerary.map(item => item.id === updatedItemData.id ? updatedItemData : item);
        await updateActiveTripInFirestore({ itinerary: updatedItinerary });
        toast({title: "Itinerary Item Updated (fallback)"});
    }
    
    setIsItineraryFormOpen(false);
    setItineraryItemToEdit(null);
  };

  const handleAddItineraryComment = async (itineraryItemId: string, text: string) => {
    if (!activeTrip || !user) return;
    const itemIndex = activeTrip.itinerary.findIndex(item => item.id === itineraryItemId);
    if (itemIndex === -1) return;

    let authorName = user.displayName || user.email?.split('@')[0] || "User";
    const memberProfile = activeTrip.members.find(m => m.id === user.uid);
    if(memberProfile && memberProfile.name) {
        authorName = memberProfile.name;
    }

    const newComment: ItineraryComment = {
      id: crypto.randomUUID(),
      authorId: user.uid,
      authorName,
      text,
      createdAt: Timestamp.now(),
    };

    const itemToUpdate = { ...activeTrip.itinerary[itemIndex] };
    itemToUpdate.comments = [...(itemToUpdate.comments || []), newComment]; 

    const finalItineraryArray = activeTrip.itinerary.map((item, index) =>
      index === itemIndex ? itemToUpdate : item
    );
    
    await updateActiveTripInFirestore({ itinerary: finalItineraryArray });
  };

  const handleTripInfoChange = (field: keyof TripData, value: any) => {
    if (!activeTrip || !user) return;
    updateActiveTripInFirestore({ [field]: value } as Partial<TripData>);
  };

  const handleTripNameChange = (name: string) => {
    if (!activeTrip || !user) return;
    updateActiveTripInFirestore({ tripName: name });
  };
  
  const handleCurrencyChange = (currency: string) => {
    if (!activeTrip || !user) return;
    updateActiveTripInFirestore({ currency });
  };

   const handleRecordPayment = async (settlement: Settlement) => {
    if (!activeTrip || !user) return;

    const payer = activeTrip.members.find(m => m.id === settlement.fromId);
    const recipient = activeTrip.members.find(m => m.id === settlement.toId);

    if (!payer || !recipient) {
        toast({ title: "Error", description: "Payer or recipient not found in trip members.", variant: "destructive"});
        return;
    }

    const paymentExpense: Omit<Expense, 'id' | 'comments' | 'createdAt'> = {
      description: `Settlement: ${payer.name} to ${recipient.name}`,
      amount: settlement.amount,
      paidById: settlement.fromId, 
      category: 'Settlement Payment', 
      date: Timestamp.now(), 
      splitType: 'byAmount', 
      splitDetails: [{ memberId: settlement.toId, amount: settlement.amount }],
    };
    
    const newExpenseWithTimestamp: Omit<Expense, 'id'> = {
      ...paymentExpense,
      comments: [],
      createdAt: Timestamp.now(), 
    };

    const preparedNewExpense = prepareDataForFirestore(newExpenseWithTimestamp);
    await updateActiveTripInFirestore({ expenses: arrayUnion(preparedNewExpense) as any });
    
    toast({ title: "Payment Recorded", description: `Payment from ${payer.name} to ${recipient.name} of ${settlement.amount.toFixed(2)} ${activeTrip.currency} recorded as an expense.` });
  };
  
  const handleOpenPaymentLog = useCallback(() => {
    setIsSettlementLogDialogOpen(true);
  }, []);


  const getDialogDescription = () => {
    if (itemTypeToDelete === 'expense') return "This will permanently delete this expense and its comments.";
    if (itemTypeToDelete === 'itinerary') return "This will permanently delete this itinerary item and its comments.";
    if (itemTypeToDelete === 'trip' && activeTrip && user && user.uid !== activeTrip.creatorUID) {
      return "You are not the creator of this trip. Deletion is restricted to the trip creator.";
    }
    if (itemTypeToDelete === 'trip') return `This will permanently delete the trip "${activeTrip?.tripName}" and all its data. This action cannot be undone.`;
    return "This action cannot be undone.";
  };

  const settlements = useMemo(() => {
    if (!activeTrip) return [];
    const nonSettlementExpenses = activeTrip.expenses.filter(exp => exp.category !== "Settlement Payment");
    return calculateSettlements(nonSettlementExpenses, activeTrip.members);
  }, [activeTrip]);

  const allItineraryCategories = useMemo(() => {
    if (!activeTrip?.itinerary) return [];
    const categories = new Set(activeTrip.itinerary.map(item => item.category).filter(Boolean) as string[]);
    return Array.from(categories).sort();
  }, [activeTrip?.itinerary]);

  const handleItineraryCategoryFilterChange = (category: string) => {
    setSelectedItineraryCategoryFilter(category);
    setCurrentItineraryPage(1); 
  };

  const filteredItineraryItems = useMemo(() => {
    if (!activeTrip?.itinerary) return [];
    return activeTrip.itinerary.filter(item => 
      selectedItineraryCategoryFilter === "All" || item.category === selectedItineraryCategoryFilter
    );
  }, [activeTrip?.itinerary, selectedItineraryCategoryFilter]);

  const sortedItineraryItems = useMemo(() => {
    return [...filteredItineraryItems].sort((a, b) => {
      const dateAVal = a.visitDate;
      const dateBVal = b.visitDate;
      const dateA = dateAVal instanceof Date ? dateAVal.getTime() : (dateAVal as Timestamp)?.toMillis?.() || 0;
      const dateB = dateBVal instanceof Date ? dateBVal.getTime() : (dateBVal as Timestamp)?.toMillis?.() || 0;
      return dateA - dateB;
    });
  }, [filteredItineraryItems]);

  const totalItineraryPages = useMemo(() => Math.ceil(sortedItineraryItems.length / ITINERARY_ITEMS_PER_PAGE), [sortedItineraryItems.length]);
  const paginatedItineraryItems = useMemo(() => {
    const startIndex = (currentItineraryPage - 1) * ITINERARY_ITEMS_PER_PAGE;
    return sortedItineraryItems.slice(startIndex, startIndex + ITINERARY_ITEMS_PER_PAGE);
  }, [sortedItineraryItems, currentItineraryPage]);
  
  useEffect(() => {
    if (currentItineraryPage > totalItineraryPages && totalItineraryPages > 0) {
      setCurrentItineraryPage(totalItineraryPages);
    } else if (currentItineraryPage === 0 && totalItineraryPages > 0) { 
      setCurrentItineraryPage(1);
    }
  }, [currentItineraryPage, totalItineraryPages]);


  const sortedExpenses = useMemo(() => {
    if (!activeTrip) return [];
    return activeTrip.expenses
      .filter(exp => exp.category !== "Settlement Payment") 
      .sort((a, b) => {
        const dateAVal = a.date;
        const dateBVal = b.date;
        const dateA = dateAVal instanceof Date ? dateAVal.getTime() : (dateAVal as Timestamp)?.toMillis?.() || 0;
        const dateB = dateBVal instanceof Date ? dateBVal.getTime() : (dateBVal as Timestamp)?.toMillis?.() || 0;
        return dateB - dateA; 
    });
  }, [activeTrip]);
  
  const totalExpensePages = useMemo(() => Math.ceil(sortedExpenses.length / EXPENSES_PER_PAGE), [sortedExpenses]);
  const paginatedExpenses = useMemo(() => {
      const startIndex = (currentExpensesPage - 1) * EXPENSES_PER_PAGE;
      return sortedExpenses.slice(startIndex, startIndex + EXPENSES_PER_PAGE);
  }, [sortedExpenses, currentExpensesPage]);

  useEffect(() => {
      if (currentExpensesPage > totalExpensePages && totalExpensePages > 0) {
          setCurrentExpensesPage(totalExpensePages);
      } else if (currentExpensesPage <= 0 && totalExpensePages > 0) { 
          setCurrentExpensesPage(1);
      }
  }, [currentExpensesPage, totalExpensePages]);

  useEffect(() => { 
    setCurrentExpensesPage(1);
    setCurrentItineraryPage(1);
    setSelectedItineraryCategoryFilter("All");
  }, [activeTrip?.id]);


  if (authLoading || (isLoadingTrip && tripId)) { 
    return (
      <div className="flex flex-col min-h-screen">
        <AppHeader tripName={activeTrip?.tripName} />
        <main className="flex-grow flex items-center justify-center p-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  if (!user) { 
    if (isClient) router.replace('/'); 
    return ( 
      <div className="flex flex-col min-h-screen">
        <AppHeader />
        <main className="flex-grow flex items-center justify-center p-4">
          <p>Please sign in to view trip details.</p>
        </main>
      </div>
    );
  }
  
  if (!activeTrip) {
    if (!tripId && isClient) { 
      router.replace('/home');
      return <div className="flex flex-col items-center justify-center min-h-screen"><AppHeader/><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }
    return (
      <div className="flex flex-col min-h-screen">
        <AppHeader />
        <main className="flex-grow flex items-center justify-center p-4">
            <p>Loading trip data or trip not found...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <AppHeader tripName={activeTrip.tripName} />
      <main className="flex-grow container mx-auto px-4 md:px-8 lg:px-12 py-6 md:py-8">
        {/* Trip Header Section */}
        <div className="mb-8 md:mb-12">
          <div className="bg-gradient-to-r from-card to-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-6 md:p-8 shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-3">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
                  {activeTrip.tripName}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-foreground/70">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{activeTrip.members?.length || 0} members</span>
                  </div>
                  {activeTrip.destinationCity && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{[activeTrip.destinationCity, activeTrip.destinationCountry].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                  {activeTrip.budget && (
                    <div className="flex items-center gap-2">
                      <CurrencyIcon className="h-4 w-4" />
                      <span>Budget: {activeTrip.budget} {activeTrip.currency}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Dialog open={isBudgetInsightsDialogOpen} onOpenChange={setIsBudgetInsightsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300">
                      <BarChart3 className="mr-2 h-5 w-5" /> View Insights
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="activity" className="w-full">
          <div className="mb-8">
            <ScrollArea orientation="horizontal" className="pb-3">
              <TabsList className="inline-flex bg-card/50 backdrop-blur-sm border border-border/30 shadow-lg p-1 rounded-xl">
                <TabsTrigger value="manage" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200">
                  <Users className="mr-2 h-4 w-4" />Manage
                </TabsTrigger>
                <TabsTrigger value="info" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200">
                  <InfoIcon className="mr-2 h-4 w-4" />Trip Info
                </TabsTrigger>
                <TabsTrigger value="activity" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200">
                  <LayoutList className="mr-2 h-4 w-4" />Activity
                </TabsTrigger>
                <TabsTrigger value="itinerary" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200">
                  <CalendarCheck className="mr-2 h-4 w-4" />Itinerary
                </TabsTrigger>
                <TabsTrigger value="photos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200">
                  <Camera className="mr-2 h-4 w-4" />Photos
                </TabsTrigger>
                <TabsTrigger value="ai-plan" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200">
                  <Wand2 className="mr-2 h-4 w-4" />Plan with AI
                </TabsTrigger>
                <TabsTrigger value="ai-assistant" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200">
                  <Wand2 className="mr-2 h-4 w-4" />AI Assistant
                </TabsTrigger>
                <TabsTrigger value="chat" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200">
                  <MessageSquare className="mr-2 h-4 w-4" />Trip Chat
                </TabsTrigger>
              </TabsList>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>

          <TabsContent value="manage" className="space-y-8 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="space-y-6">
                <TripSettings
                  tripName={activeTrip.tripName}
                  onTripNameChange={handleTripNameChange}
                  currency={activeTrip.currency}
                  onCurrencyChange={handleCurrencyChange}
                  onDeleteTrip={() => handleRequestDeleteItem(activeTrip.id, 'trip')}
                  isCreator={user.uid === activeTrip.creatorUID}
                />
              </div>
              <div className="space-y-6">
                <MemberManager
                  members={activeTrip.members}
                  onAddMember={handleAddMember}
                  onRemoveMember={handleRemoveMember}
                  isCreator={user.uid === activeTrip.creatorUID}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="info" className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
             <TripInfo tripData={activeTrip} onTripInfoChange={handleTripInfoChange} />
          </TabsContent>

          <TabsContent value="activity" className="space-y-8 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center gap-4 mb-6">

                <Dialog open={isAddExpenseDialogOpen} onOpenChange={setIsAddExpenseDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="text-sm border-primary/50 hover:bg-primary/10">
                            <PlusCircle className="mr-2 h-5 w-5" /> Add New Expense
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh]">
                        <DialogHeader>
                           <DialogTitle className="flex items-center text-xl"><PlusCircle className="mr-2 h-6 w-6" /> Add New Expense</DialogTitle>
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
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              <div className="lg:col-span-1 space-y-6">
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
                  onDeleteExpense={(id) => handleRequestDeleteItem(id, 'expense')}
                  onEditExpense={handleEditExpense}
                  currentPage={currentExpensesPage}
                  totalPages={totalExpensePages}
                  onPageChange={setCurrentExpensesPage}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="itinerary">
            <div className="flex justify-end mb-4">
              <Button onClick={() => { setItineraryItemToEdit(null); setIsItineraryFormOpen(true); }} variant="outline" className="text-sm border-primary/50 hover:bg-primary/10">
                <PlusCircle className="mr-2 h-5 w-5" /> Add Itinerary Item
              </Button>
            </div>
             <div className="min-h-[600px] flex flex-col">
              <ItineraryList
                itineraryItems={paginatedItineraryItems}
                onEditItem={handleEditItineraryItem}
                onDeleteItem={(id) => handleRequestDeleteItem(id, 'itinerary')}
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
          
          <TabsContent value="photos">
            <PhotoSharingTab 
              tripId={activeTrip.id}
              photoAlbums={activeTrip.photoAlbums || []}
              photos={activeTrip.photos || []}
              members={activeTrip.members}
              onUpdateTripData={updateActiveTripInFirestore}
            />
          </TabsContent>

          <TabsContent value="ai-plan">
            <AiTripIdeation />
          </TabsContent>

          <TabsContent value="ai-assistant">
            <AiAssistant tripData={activeTrip} />
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
      </main>

      <footer className="text-center p-4 text-muted-foreground text-sm border-t border-border/50">
        TripSplit &copy; {new Date().getFullYear()}
      </footer>

      <AlertDialog open={isDeleteConfirmationOpen} onOpenChange={setIsDeleteConfirmationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertTitleComponent>Are you absolutely sure?</AlertTitleComponent>
            <AlertDialogDescription>
              {getDialogDescription()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              disabled={itemTypeToDelete === 'trip' && activeTrip && user.uid !== activeTrip.creatorUID}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {expenseToEdit && (
        <EditExpenseDialog
          isOpen={isEditExpenseDialogOpen}
          onOpenChange={setIsEditExpenseDialogOpen}
          expenseToEdit={expenseToEdit}
          members={activeTrip.members}
          tripCurrency={activeTrip.currency}
          onUpdateExpense={handleUpdateExpense}
        />
      )}

      {(isItineraryFormOpen || itineraryItemToEdit) && (
        <ItineraryFormDialog
          isOpen={isItineraryFormOpen}
          onOpenChange={(open) => {
            setIsItineraryFormOpen(open);
            if (!open) setItineraryItemToEdit(null); 
          }}
          onAddItineraryItem={handleAddItineraryItem}
          itemToEdit={itineraryItemToEdit}
          onUpdateItineraryItem={handleUpdateItineraryItem}
        />
      )}

       <SettlementLogDialog
          isOpen={isSettlementLogDialogOpen}
          onOpenChange={setIsSettlementLogDialogOpen}
          expenses={activeTrip.expenses || []} 
          tripCurrency={activeTrip.currency}
          members={activeTrip.members}
        />

        {/* Budget Insights Dialog */}
        <Dialog open={isBudgetInsightsDialogOpen} onOpenChange={setIsBudgetInsightsDialogOpen}>
          <DialogContent className="sm:max-w-4xl md:max-w-5xl lg:max-w-7xl max-h-[90vh]">
            <DialogHeader className="space-y-3">
              <DialogTitle className="flex items-center text-2xl"><BarChart3 className="mr-3 h-7 w-7 text-primary" /> Budget Insights & Analytics</DialogTitle>
              <CardDescription className="text-base">Comprehensive visual analysis of your trip's spending patterns, budget performance, and financial insights.</CardDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[75vh] p-2">
              <div className="space-y-8 py-6 pr-4">
                {activeTrip && activeTrip.expenses && activeTrip.expenses.length > 0 ? (
                  <>
                    {/* Budget vs Actual - Top Priority */}
                    {activeTrip.budget && (
                      <Card className="border-2 border-primary/20">
                        <CardHeader className="pb-4">
                          <CardTitle className="flex items-center text-lg">
                            <TrendingUp className="mr-2 h-5 w-5 text-primary" />
                            Budget vs Actual Spending
                          </CardTitle>
                          <CardDescription>Track your spending against your budget goal over time.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <BudgetVsActualChart 
                            expenses={activeTrip.expenses} 
                            tripCurrency={activeTrip.currency} 
                            budget={activeTrip.budget}
                          />
                        </CardContent>
                      </Card>
                    )}

                    {/* Main Spending Overview */}
                    <Card>
                      <CardHeader className="pb-4">
                        <CardTitle className="flex items-center text-lg">
                          <Calendar className="mr-2 h-5 w-5 text-primary" />
                          Spending Over Time
                        </CardTitle>
                        <CardDescription>Daily spending progression throughout your trip.</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <SpendingOverTimeChart expenses={activeTrip.expenses} tripCurrency={activeTrip.currency} />
                      </CardContent>
                    </Card>

                    {/* Member and Category Analysis - Side by Side */}
                    <div className="grid lg:grid-cols-2 gap-8">
                      <Card>
                        <CardHeader className="pb-4">
                          <CardTitle className="flex items-center text-lg">
                            <Users className="mr-2 h-5 w-5 text-primary" />
                            Spending by Member
                          </CardTitle>
                          <CardDescription>Compare total contributions by each trip member.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <SpendingByMemberChart expenses={activeTrip.expenses} members={activeTrip.members} tripCurrency={activeTrip.currency} />
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-4">
                          <CardTitle className="flex items-center text-lg">
                            <PieChart className="mr-2 h-5 w-5 text-primary" />
                            Spending by Category
                          </CardTitle>
                          <CardDescription>Breakdown of expenses across different categories.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <SpendingByCategoryChart expenses={activeTrip.expenses} tripCurrency={activeTrip.currency} />
                        </CardContent>
                      </Card>
                    </div>

                    {/* Detailed Analysis - Three Column Layout */}
                    <div className="grid lg:grid-cols-3 gap-6">
                      <Card>
                        <CardHeader className="pb-4">
                          <CardTitle className="flex items-center text-base">
                            <Activity className="mr-2 h-4 w-4 text-primary" />
                            Expense Frequency
                          </CardTitle>
                          <CardDescription className="text-sm">Daily expense activity patterns.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <ExpenseFrequencyChart expenses={activeTrip.expenses} />
                        </CardContent>
                      </Card>

                      <Card className="lg:col-span-2">
                        <CardHeader className="pb-4">
                          <CardTitle className="flex items-center text-base">
                            <Crown className="mr-2 h-4 w-4 text-primary" />
                            Top Expenses
                          </CardTitle>
                          <CardDescription className="text-sm">Largest individual expenses in descending order.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <TopExpensesChart expenses={activeTrip.expenses} tripCurrency={activeTrip.currency} />
                        </CardContent>
                      </Card>
                    </div>

                    {/* Summary Stats */}
                    <Card className="bg-muted/30">
                      <CardHeader className="pb-4">
                        <CardTitle className="flex items-center text-lg">
                          <Calculator className="mr-2 h-5 w-5 text-primary" />
                          Trip Summary
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                          <div className="text-center space-y-1">
                            <p className="text-2xl font-bold text-primary">
                              {activeTrip.expenses.reduce((sum, exp) => sum + exp.amount, 0).toFixed(2)}
                            </p>
                            <p className="text-sm text-foreground/70">Total Spent ({activeTrip.currency})</p>
                          </div>
                          <div className="text-center space-y-1">
                            <p className="text-2xl font-bold text-primary">
                              {activeTrip.expenses.length}
                            </p>
                            <p className="text-sm text-foreground/70">Total Expenses</p>
                          </div>
                          <div className="text-center space-y-1">
                            <p className="text-2xl font-bold text-primary">
                              {(activeTrip.expenses.reduce((sum, exp) => sum + exp.amount, 0) / activeTrip.expenses.length).toFixed(2)}
                            </p>
                            <p className="text-sm text-foreground/70">Average per Expense ({activeTrip.currency})</p>
                          </div>
                          <div className="text-center space-y-1">
                            <p className="text-2xl font-bold text-primary">
                              {(activeTrip.expenses.reduce((sum, exp) => sum + exp.amount, 0) / activeTrip.members.length).toFixed(2)}
                            </p>
                            <p className="text-sm text-foreground/70">Average per Member ({activeTrip.currency})</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <Card className="text-center py-12">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-center text-xl">
                        <BarChart3 className="mr-2 h-6 w-6 text-muted-foreground" />
                        Budget Analytics Dashboard
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <p className="text-foreground/60 text-lg">No expenses logged yet to display budget charts.</p>
                        <p className="text-foreground/50 text-sm">Start adding expenses to see comprehensive analytics and insights.</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBudgetInsightsDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  );
}

