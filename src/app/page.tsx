
"use client";

import { useState, useEffect, useMemo } from 'react';
import { AppHeader } from '@/components/layout/Header';
import { MemberManager } from '@/components/trip/MemberManager';
import { ExpenseForm } from '@/components/trip/ExpenseForm';
import { ExpenseList } from '@/components/trip/ExpenseList';
import { SettlementSummary } from '@/components/trip/SettlementSummary';
import { ChatRoom } from '@/components/trip/ChatRoom';
import { TripSettings } from '@/components/trip/TripSettings';
import type { AppState, TripData, Member, Expense, Comment, ChatMessage } from '@/lib/types';
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
import { UserCircle, Briefcase, PlusCircle, Edit3, DollarSign as CurrencyIcon, Settings, Users, Activity, Trash2, MessageSquare } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'tripSplitAppState_v2';

export default function TripPage() {
  const [appState, setAppState] = useState<AppState>(INITIAL_APP_STATE);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isClient, setIsClient] = useState(false);
  const [isCreateTripDialogOpen, setIsCreateTripDialogOpen] = useState(false);
  const [newTripName, setNewTripName] = useState('');
  const [newTripCurrency, setNewTripCurrency] = useState(CURRENCIES[0]);
  const [expenseToDeleteId, setExpenseToDeleteId] = useState<string | null>(null);
  const [isDeleteConfirmationDialogOpen, setIsDeleteConfirmationDialogOpen] = useState(false);
  const { toast } = useToast();

  const activeTrip = useMemo(() => {
    if (!isClient) return undefined; 
    return appState.trips.find(trip => trip.id === appState.activeTripId);
  }, [appState.trips, appState.activeTripId, isClient]);

  useEffect(() => {
    setIsClient(true);
    const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
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
          })),
          chatMessages: trip.chatMessages.map(msg => ({...msg, createdAt: new Date(msg.createdAt)}))
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
          } else if (!initiallyActiveTrip && parsedData.trips.length > 0) { // Active trip not found, select first
            handleSelectTrip(parsedData.trips[0].id, parsedData.trips[0].members);
          }
           else {
            setCurrentUserId('');
          }
        }
      } catch (error) {
        console.error("Failed to parse saved app state:", error);
        toast({ title: "Error loading data", description: "Could not load saved trip data. Starting fresh.", variant: "destructive"});
        localStorage.removeItem(LOCAL_STORAGE_KEY); 
        setAppState(INITIAL_APP_STATE); // Reset to initial state if parsing fails
        setCurrentUserId('');
      }
    } else {
      // No saved data, ensure currentUserId is clear if there's no active trip or members
       if (!activeTrip || activeTrip.members.length === 0) {
        setCurrentUserId('');
      }
    }
  }, []);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(appState));
    }
  }, [appState, isClient]);

  useEffect(() => {
    if (isClient && appState.trips.length > 0 && !appState.activeTripId) {
      const firstTrip = appState.trips[0];
      handleSelectTrip(firstTrip.id, firstTrip.members);
    } else if (isClient && appState.trips.length === 0) {
      // No trips, clear active trip and user
      setAppState(prev => ({ ...prev, activeTripId: null }));
      setCurrentUserId('');
    }
  }, [appState.trips, appState.activeTripId, isClient]);


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
    const newTrip = createInitialTripData(newTripName.trim(), newTripCurrency);
    setAppState(prev => ({
      trips: [...prev.trips, newTrip],
      activeTripId: newTrip.id,
    }));
    setCurrentUserId(''); 
    setNewTripName('');
    setNewTripCurrency(CURRENCIES[0]);
    setIsCreateTripDialogOpen(false);
    toast({ title: "Trip Created", description: `"${newTrip.tripName}" has been created.`});
  };

  const handleAddMember = (name: string) => {
    if (!activeTrip) return;
    if (activeTrip.members.find(m => m.name.toLowerCase() === name.toLowerCase())) {
      toast({ title: "Member exists", description: `A member named "${name}" already exists in this trip.`, variant: "destructive" });
      return;
    }
    const newMember: Member = { id: crypto.randomUUID(), name };
    updateActiveTrip(trip => {
      const updatedMembers = [...trip.members, newMember];
      if (updatedMembers.length === 1) { 
        setCurrentUserId(newMember.id);
      }
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

  const handleRequestDeleteExpense = (expenseId: string) => {
    setExpenseToDeleteId(expenseId);
    setIsDeleteConfirmationDialogOpen(true);
  };

  const handleConfirmDeleteExpense = () => {
    if (!activeTrip || !expenseToDeleteId) return;
    const expenseDescription = activeTrip.expenses.find(exp => exp.id === expenseToDeleteId)?.description || "Expense";
    updateActiveTrip(trip => ({
      ...trip,
      expenses: trip.expenses.filter(exp => exp.id !== expenseToDeleteId),
    }));
    toast({ title: "Expense Deleted", description: `"${expenseDescription}" has been removed.` });
    setIsDeleteConfirmationDialogOpen(false);
    setExpenseToDeleteId(null);
  };

  const handleCancelDelete = () => {
    setIsDeleteConfirmationDialogOpen(false);
    setExpenseToDeleteId(null);
  };
  
  const handleEditExpense = (expense: Expense) => {
    toast({ title: "Edit Feature", description: `Editing "${expense.description}" is not yet implemented.` });
    console.log("Attempting to edit expense:", expense);
  };

  const handleAddComment = (expenseId: string, authorId: string, text: string) => {
    if (!activeTrip) return;
    const author = activeTrip.members.find(m => m.id === authorId);
    if (!author) return;

    const newComment: Comment = {
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
    if (!activeTrip || !currentUserId) return;
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

  const settlements = useMemo(() => {
    if (!isClient || !activeTrip) return [];
    return calculateSettlements(activeTrip.expenses, activeTrip.members);
  }, [activeTrip, isClient]);


  if (!isClient) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="p-6 rounded-lg shadow-xl bg-card text-card-foreground">
          Loading TripSplit...
        </div>
      </div>
    );
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
                <p className="text-muted-foreground mb-4">It looks like you don't have any trips yet.</p>
                <Button onClick={() => setIsCreateTripDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-5 w-5" /> Create Your First Trip
                </Button>
            </div>
        )}

        {activeTrip && (
          <Tabs defaultValue="activity" className="w-full">
            <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 mb-6">
              <TabsTrigger value="manage" className="flex items-center gap-2"><Settings className="h-4 w-4"/> Manage Trip</TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center gap-2"><Activity className="h-4 w-4"/> Activity Log</TabsTrigger>
              <TabsTrigger value="chat" className="flex items-center gap-2"><MessageSquare className="h-4 w-4"/> Trip Chat</TabsTrigger>
            </TabsList>

            <TabsContent value="manage" className="space-y-6">
              <TripSettings
                tripName={activeTrip.tripName}
                onTripNameChange={handleTripNameChange}
                currency={activeTrip.currency}
                onCurrencyChange={handleCurrencyChange}
              />
              <MemberManager members={activeTrip.members} onAddMember={handleAddMember} onRemoveMember={handleRemoveMember}/>
            </TabsContent>

            <TabsContent value="activity">
              {activeTrip.members.length > 0 && (
                <div className="my-4 max-w-xs">
                  <Label htmlFor="currentUserActivity" className="flex items-center mb-1"><UserCircle className="mr-2 h-4 w-4" />You are:</Label>
                  <Select value={currentUserId} onValueChange={setCurrentUserId} disabled={activeTrip.members.length === 0}>
                    <SelectTrigger id="currentUserActivity">
                      <SelectValue placeholder="Select your user profile" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeTrip.members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
               {activeTrip.members.length === 0 && (
                  <p className="my-4 text-sm text-muted-foreground">Add members in the 'Manage Trip' tab to participate.</p>
               )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6 flex flex-col">
                  <ExpenseForm members={activeTrip.members} onAddExpense={handleAddExpense} tripCurrency={activeTrip.currency} />
                  <SettlementSummary settlements={settlements} tripCurrency={activeTrip.currency} />
                </div>
                <div className="lg:col-span-2 min-h-[600px]"> {/* ExpenseList now spans 2 columns */}
                   <ExpenseList 
                      expenses={activeTrip.expenses} 
                      members={activeTrip.members} 
                      tripCurrency={activeTrip.currency}
                      currentUserId={currentUserId}
                      onAddComment={handleAddComment}
                      onDeleteExpense={handleRequestDeleteExpense}
                      onEditExpense={handleEditExpense}
                    />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="chat">
              {activeTrip.members.length > 0 && (
                <div className="my-4 max-w-xs">
                  <Label htmlFor="currentUserChat" className="flex items-center mb-1"><UserCircle className="mr-2 h-4 w-4" />You are:</Label>
                   <Select value={currentUserId} onValueChange={setCurrentUserId} disabled={activeTrip.members.length === 0}>
                    <SelectTrigger id="currentUserChat">
                      <SelectValue placeholder="Select your user profile" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeTrip.members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {activeTrip.members.length === 0 && !currentUserId &&(
                  <p className="my-4 text-sm text-muted-foreground">Add members and select your user profile in 'Manage Trip' or 'Activity Log' tab to chat.</p>
               )}
              <div className="h-[600px]"> {/* Ensure chat room has enough height */}
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
              Are you sure you want to delete this expense? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteExpense} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
