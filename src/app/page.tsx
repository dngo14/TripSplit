"use client";

import { useState, useEffect, useMemo } from 'react';
import { AppHeader } from '@/components/layout/Header';
import { MemberManager } from '@/components/trip/MemberManager';
import { ExpenseForm } from '@/components/trip/ExpenseForm';
import { ExpenseList } from '@/components/trip/ExpenseList';
import { SettlementSummary } from '@/components/trip/SettlementSummary';
import { ChatRoom } from '@/components/trip/ChatRoom';
import { TripSettings } from '@/components/trip/TripSettings';
import type { TripData, Member, Expense, Comment, ChatMessage, Settlement } from '@/lib/types';
import { INITIAL_TRIP_DATA } from '@/lib/constants';
import { calculateSettlements } from '@/lib/settlement';
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { UserCircle } from 'lucide-react';

export default function TripPage() {
  const [tripData, setTripData] = useState<TripData>(INITIAL_TRIP_DATA);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
    // Load data from localStorage if available (optional persistence)
    const savedData = localStorage.getItem('tripSplitData');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        setTripData(parsedData);
        if (parsedData.members.length > 0 && !currentUserId) {
          setCurrentUserId(parsedData.members[0].id);
        }
      } catch (error) {
        console.error("Failed to parse saved trip data:", error);
        localStorage.removeItem('tripSplitData'); // Clear corrupted data
      }
    } else if (tripData.members.length > 0 && !currentUserId) {
        setCurrentUserId(tripData.members[0].id);
    }
  }, []); // Empty dependency array ensures this runs once on mount

  useEffect(() => {
    if (isClient) {
      localStorage.setItem('tripSplitData', JSON.stringify(tripData));
    }
  }, [tripData, isClient]);

  const handleAddMember = (name: string) => {
    if (tripData.members.find(m => m.name.toLowerCase() === name.toLowerCase())) {
      toast({ title: "Member exists", description: `A member named "${name}" already exists.`, variant: "destructive" });
      return;
    }
    const newMember: Member = { id: crypto.randomUUID(), name };
    setTripData(prev => {
      const updatedMembers = [...prev.members, newMember];
      if (updatedMembers.length === 1) { // If this is the first member, set as current user
        setCurrentUserId(newMember.id);
      }
      return { ...prev, members: updatedMembers };
    });
    toast({ title: "Member Added", description: `${name} has been added to the trip.`});
  };

  const handleRemoveMember = (id: string) => {
    setTripData(prev => {
      // Check if member is involved in expenses
      const memberInvolved = prev.expenses.some(exp => exp.paidById === id);
      if (memberInvolved) {
        toast({ title: "Cannot remove member", description: "This member has paid for expenses and cannot be removed.", variant: "destructive"});
        return prev;
      }
      const updatedMembers = prev.members.filter(member => member.id !== id);
      let newCurrentUserId = currentUserId;
      if (currentUserId === id) { // If removing current user
        newCurrentUserId = updatedMembers.length > 0 ? updatedMembers[0].id : '';
        setCurrentUserId(newCurrentUserId);
      }
      // Also remove from chat messages if needed, or reassign messages to "Removed User" (out of scope for now)
      return { ...prev, members: updatedMembers };
    });
    toast({ title: "Member Removed", description: `Member has been removed.`});
  };

  const handleAddExpense = async (expenseData: Omit<Expense, 'id' | 'comments' | 'createdAt'>) => {
    const newExpense: Expense = {
      ...expenseData,
      id: crypto.randomUUID(),
      comments: [],
      createdAt: new Date(),
    };
    setTripData(prev => ({ ...prev, expenses: [...prev.expenses, newExpense] }));
    toast({ title: "Expense Added", description: `${expenseData.description} for ${expenseData.amount} ${tripData.currency} added.`});
  };

  const handleAddComment = (expenseId: string, authorId: string, text: string) => {
    const author = tripData.members.find(m => m.id === authorId);
    if (!author) return;

    const newComment: Comment = {
      id: crypto.randomUUID(),
      expenseId,
      authorId,
      authorName: author.name,
      text,
      createdAt: new Date(),
    };
    setTripData(prev => ({
      ...prev,
      expenses: prev.expenses.map(exp =>
        exp.id === expenseId ? { ...exp, comments: [...exp.comments, newComment] } : exp
      ),
    }));
  };

  const handleSendMessage = (text: string) => {
    const sender = tripData.members.find(m => m.id === currentUserId);
    if (!sender) return;

    const newMessage: ChatMessage = {
      id: crypto.randomUUID(),
      senderId: currentUserId,
      senderName: sender.name,
      text,
      createdAt: new Date(),
    };
    setTripData(prev => ({ ...prev, chatMessages: [...prev.chatMessages, newMessage] }));
  };
  
  const settlements = useMemo(() => {
    if (!isClient) return []; // Avoid running complex calculation on server or before hydration
    return calculateSettlements(tripData.expenses, tripData.members);
  }, [tripData.expenses, tripData.members, isClient]);

  if (!isClient) {
    // Render a loading state or null to avoid hydration mismatches
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="p-6 rounded-lg shadow-xl">
          Loading TripSplit...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader tripName={tripData.tripName} />
      <main className="flex-grow container mx-auto p-4 space-y-6">
        <TripSettings
          tripName={tripData.tripName}
          onTripNameChange={(name) => setTripData(prev => ({ ...prev, tripName: name }))}
          currency={tripData.currency}
          onCurrencyChange={(curr) => setTripData(prev => ({ ...prev, currency: curr }))}
        />

        {tripData.members.length > 0 && (
          <div className="my-4 max-w-xs">
            <Label htmlFor="currentUser" className="flex items-center mb-1"><UserCircle className="mr-2 h-4 w-4" />You are:</Label>
            <Select value={currentUserId} onValueChange={setCurrentUserId}>
              <SelectTrigger id="currentUser">
                <SelectValue placeholder="Select your user profile" />
              </SelectTrigger>
              <SelectContent>
                {tripData.members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Members & Expense Form */}
          <div className="lg:col-span-1 space-y-6 flex flex-col">
            <MemberManager members={tripData.members} onAddMember={handleAddMember} onRemoveMember={handleRemoveMember}/>
            <ExpenseForm members={tripData.members} onAddExpense={handleAddExpense} tripCurrency={tripData.currency} />
          </div>

          {/* Column 2: Expense List */}
          <div className="lg:col-span-1 min-h-[600px]"> {/* min-h to ensure scroll area works */}
             <ExpenseList 
                expenses={tripData.expenses} 
                members={tripData.members} 
                tripCurrency={tripData.currency}
                currentUserId={currentUserId}
                onAddComment={handleAddComment}
              />
          </div>

          {/* Column 3: Settlements & Chat */}
          <div className="lg:col-span-1 space-y-6 flex flex-col">
            <SettlementSummary settlements={settlements} tripCurrency={tripData.currency} />
            <div className="flex-grow min-h-[400px]"> {/* min-h for chat to take space */}
              <ChatRoom 
                messages={tripData.chatMessages}
                members={tripData.members}
                currentUserId={currentUserId}
                onSendMessage={handleSendMessage}
              />
            </div>
          </div>
        </div>
      </main>
      <footer className="text-center p-4 text-muted-foreground text-sm border-t">
        TripSplit &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
