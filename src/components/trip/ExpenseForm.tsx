"use client";

import type React from 'react';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Receipt, DollarSign, CalendarDays, User, PlusCircle, Brain } from 'lucide-react';
import type { Member, Expense } from '@/lib/types';
import { CURRENCIES } from '@/lib/constants';
import { categorizeExpense as aiCategorizeExpense } from '@/ai/flows/categorize-expense';
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';

interface ExpenseFormProps {
  members: Member[];
  onAddExpense: (expense: Omit<Expense, 'id' | 'comments' | 'createdAt'>) => Promise<void>;
  tripCurrency: string;
}

export function ExpenseForm({ members, onAddExpense, tripCurrency }: ExpenseFormProps) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [paidById, setPaidById] = useState<string>('');
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isCategorizing, setIsCategorizing] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || amount === '' || !paidById || !date) {
      toast({ title: "Missing fields", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }
    if (members.length === 0) {
      toast({ title: "No members", description: "Please add members before adding expenses.", variant: "destructive" });
      return;
    }

    setIsCategorizing(true);
    let category: string | undefined;
    try {
      const categoryResult = await aiCategorizeExpense({ description });
      category = categoryResult.category;
      toast({ title: "AI Category Suggestion", description: `Expense categorized as: ${category}` });
    } catch (error) {
      console.error("AI categorization failed:", error);
      toast({ title: "AI Categorization Failed", description: "Could not automatically categorize expense. You can set it manually later.", variant: "destructive" });
    } finally {
      setIsCategorizing(false);
    }

    await onAddExpense({
      description,
      amount: Number(amount),
      paidById,
      category,
      date,
    });

    setDescription('');
    setAmount('');
    setPaidById('');
    setDate(new Date());
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
          <Receipt className="mr-2 h-6 w-6" /> Add Expense
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="description" className="flex items-center mb-1"><Receipt className="mr-2 h-4 w-4" />Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Dinner, Flight tickets"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount" className="flex items-center mb-1"><DollarSign className="mr-2 h-4 w-4" />Amount ({tripCurrency})</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                placeholder="0.00"
                required
                min="0.01"
                step="0.01"
              />
            </div>
            <div>
              <Label htmlFor="date" className="flex items-center mb-1"><CalendarDays className="mr-2 h-4 w-4" />Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={"outline"}
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div>
            <Label htmlFor="paidBy" className="flex items-center mb-1"><User className="mr-2 h-4 w-4" />Paid By</Label>
            <Select value={paidById} onValueChange={setPaidById} required>
              <SelectTrigger id="paidBy">
                <SelectValue placeholder="Select member" />
              </SelectTrigger>
              <SelectContent>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {members.length === 0 && <p className="text-sm text-destructive mt-1">Add members to select who paid.</p>}
          </div>
          
          <Button type="submit" className="w-full" disabled={isCategorizing || members.length === 0}>
            {isCategorizing ? (
              <>
                <Brain className="mr-2 h-5 w-5 animate-pulse" /> Categorizing...
              </>
            ) : (
              <>
                <PlusCircle className="mr-2 h-5 w-5" /> Add Expense
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
