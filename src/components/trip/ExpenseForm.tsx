"use client";

import type React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Receipt, DollarSign, CalendarDays, User, PlusCircle, Brain, Split, UsersIcon } from 'lucide-react';
import type { Member, Expense, SplitType, SplitDetail } from '@/lib/types';
import { CURRENCIES } from '@/lib/constants';
import { categorizeExpense as aiCategorizeExpense } from '@/ai/flows/categorize-expense';
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';


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

  const [splitType, setSplitType] = useState<SplitType>('equally');
  const [splitEquallyAmongAll, setSplitEquallyAmongAll] = useState(true);
  const [selectedMembersForEqualSplit, setSelectedMembersForEqualSplit] = useState<Set<string>>(new Set());
  const [splitAmounts, setSplitAmounts] = useState<Record<string, string>>({}); // Store as string for input
  const [splitPercentages, setSplitPercentages] = useState<Record<string, string>>({}); // Store as string for input

  useEffect(() => {
    // Reset split details when members change or split type changes
    setSelectedMembersForEqualSplit(new Set());
    setSplitAmounts({});
    setSplitPercentages({});
    if (members.length > 0 && !paidById) {
      setPaidById(members[0].id);
    }
  }, [members, splitType]);
  
  useEffect(() => {
    if (members.length > 0 && !paidById) {
      setPaidById(members[0].id);
    }
  }, [members, paidById]);


  const handleSplitAmountChange = (memberId: string, value: string) => {
    setSplitAmounts(prev => ({ ...prev, [memberId]: value }));
  };

  const handleSplitPercentageChange = (memberId: string, value: string) => {
    setSplitPercentages(prev => ({ ...prev, [memberId]: value }));
  };

  const handleToggleMemberForEqualSplit = (memberId: string) => {
    setSelectedMembersForEqualSplit(prev => {
      const newSet = new Set(prev);
      if (newSet.has(memberId)) {
        newSet.delete(memberId);
      } else {
        newSet.add(memberId);
      }
      return newSet;
    });
  };

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
    if (Number(amount) <= 0) {
      toast({ title: "Invalid amount", description: "Expense amount must be greater than zero.", variant: "destructive" });
      return;
    }

    let finalSplitDetails: SplitDetail[] = [];

    if (splitType === 'equally') {
      if (!splitEquallyAmongAll) {
        if (selectedMembersForEqualSplit.size === 0) {
          toast({ title: "No members selected", description: "Please select members for equal split or choose 'Split among all members'.", variant: "destructive" });
          return;
        }
        finalSplitDetails = Array.from(selectedMembersForEqualSplit).map(memberId => ({ memberId }));
      }
      // If splitEquallyAmongAll is true, finalSplitDetails remains empty, signaling to split among all trip members.
    } else if (splitType === 'byAmount') {
      const currentSplitAmounts = Object.entries(splitAmounts)
        .map(([memberId, amtStr]) => ({ memberId, amount: parseFloat(amtStr) || 0 }))
        .filter(item => item.amount > 0);

      const totalSplitAmount = currentSplitAmounts.reduce((sum, item) => sum + item.amount, 0);
      if (Math.abs(totalSplitAmount - Number(amount)) > 0.01) {
        toast({ title: "Split Amount Mismatch", description: `The sum of amounts (${totalSplitAmount.toFixed(2)}) for each member must equal the total expense amount (${Number(amount).toFixed(2)}).`, variant: "destructive" });
        return;
      }
      if (currentSplitAmounts.length === 0) {
         toast({ title: "No amounts entered", description: "Please enter amounts for at least one member for 'By Amount' split.", variant: "destructive" });
        return;
      }
      finalSplitDetails = currentSplitAmounts;
    } else if (splitType === 'byPercentage') {
      const currentSplitPercentages = Object.entries(splitPercentages)
        .map(([memberId, percStr]) => ({ memberId, percentage: parseFloat(percStr) || 0 }))
        .filter(item => item.percentage > 0);
      
      const totalSplitPercentage = currentSplitPercentages.reduce((sum, item) => sum + item.percentage, 0);
      if (Math.abs(totalSplitPercentage - 100) > 0.01) {
        toast({ title: "Percentage Mismatch", description: `The sum of percentages (${totalSplitPercentage.toFixed(2)}%) must be 100%.`, variant: "destructive" });
        return;
      }
       if (currentSplitPercentages.length === 0) {
         toast({ title: "No percentages entered", description: "Please enter percentages for at least one member for 'By Percentage' split.", variant: "destructive" });
        return;
      }
      finalSplitDetails = currentSplitPercentages;
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
      splitType,
      splitDetails: finalSplitDetails,
    });

    setDescription('');
    setAmount('');
    // setPaidById(''); // Keep paidBy or reset based on preference. Resetting could be annoying.
    setDate(new Date());
    setSplitType('equally');
    setSplitEquallyAmongAll(true);
    setSelectedMembersForEqualSplit(new Set());
    setSplitAmounts({});
    setSplitPercentages({});
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
              <SelectTrigger id="paidBy" disabled={members.length === 0}>
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

          <Separator />
          <div>
            <Label className="flex items-center mb-2 text-md font-semibold"><Split className="mr-2 h-5 w-5"/>Split Details</Label>
            <RadioGroup value={splitType} onValueChange={(value) => setSplitType(value as SplitType)} className="mb-3">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="equally" id="s-equally" />
                <Label htmlFor="s-equally">Equally</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="byAmount" id="s-amount" />
                <Label htmlFor="s-amount">By Amount</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="byPercentage" id="s-percentage" />
                <Label htmlFor="s-percentage">By Percentage</Label>
              </div>
            </RadioGroup>

            {splitType === 'equally' && members.length > 0 && (
              <div className="space-y-2 p-3 border rounded-md bg-muted/30">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="splitEquallyAmongAll" 
                    checked={splitEquallyAmongAll} 
                    onCheckedChange={(checked) => setSplitEquallyAmongAll(Boolean(checked))}
                  />
                  <Label htmlFor="splitEquallyAmongAll" className="font-normal">Split among all trip members</Label>
                </div>
                {!splitEquallyAmongAll && (
                  <div className="ml-2 space-y-1 pt-1">
                    <Label className="text-xs text-muted-foreground">Select members to include in equal split:</Label>
                    <ScrollArea className="h-[100px] p-2 border rounded-md bg-background">
                    {members.map(member => (
                      <div key={member.id} className="flex items-center space-x-2 mb-1">
                        <Checkbox
                          id={`eq-member-${member.id}`}
                          checked={selectedMembersForEqualSplit.has(member.id)}
                          onCheckedChange={() => handleToggleMemberForEqualSplit(member.id)}
                        />
                        <Label htmlFor={`eq-member-${member.id}`} className="font-normal text-sm">{member.name}</Label>
                      </div>
                    ))}
                    </ScrollArea>
                  </div>
                )}
              </div>
            )}

            {splitType === 'byAmount' && members.length > 0 && (
              <div className="space-y-2 p-3 border rounded-md bg-muted/30">
                <Label className="text-xs text-muted-foreground">Enter specific amount for each member:</Label>
                 <ScrollArea className="h-[120px] p-1">
                  {members.map(member => (
                    <div key={member.id} className="flex items-center gap-2 mb-2">
                      <Label htmlFor={`amt-${member.id}`} className="w-1/3 truncate text-sm">{member.name}</Label>
                      <Input
                        id={`amt-${member.id}`}
                        type="number"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        value={splitAmounts[member.id] || ''}
                        onChange={(e) => handleSplitAmountChange(member.id, e.target.value)}
                        className="h-8"
                      />
                    </div>
                  ))}
                </ScrollArea>
              </div>
            )}

            {splitType === 'byPercentage' && members.length > 0 && (
               <div className="space-y-2 p-3 border rounded-md bg-muted/30">
                <Label className="text-xs text-muted-foreground">Enter percentage for each member (must sum to 100%):</Label>
                <ScrollArea className="h-[120px] p-1">
                  {members.map(member => (
                    <div key={member.id} className="flex items-center gap-2 mb-2">
                      <Label htmlFor={`perc-${member.id}`} className="w-1/3 truncate text-sm">{member.name}</Label>
                      <Input
                        id={`perc-${member.id}`}
                        type="number"
                        placeholder="0"
                        min="0"
                        max="100"
                        step="0.01"
                        value={splitPercentages[member.id] || ''}
                        onChange={(e) => handleSplitPercentageChange(member.id, e.target.value)}
                        className="h-8"
                      />
                      <span className="text-sm">%</span>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            )}
             {members.length === 0 && (splitType === 'byAmount' || splitType === 'byPercentage' || (splitType === 'equally' && !splitEquallyAmongAll)) && (
                <p className="text-sm text-muted-foreground p-3 border rounded-md bg-muted/30">Add members to specify split details.</p>
             )}
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
