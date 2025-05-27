
"use client";

import type React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Receipt, DollarSign, CalendarDays, User, PlusCircle, Brain, Split, UsersIcon, Paperclip, XCircle } from 'lucide-react';
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
  onFormSubmit?: () => void;
  loggedInUserId: string; // Added to know the logged-in user for defaulting "Paid By"
}

export function ExpenseForm({ members, onAddExpense, tripCurrency, onFormSubmit, loggedInUserId }: ExpenseFormProps) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [paidById, setPaidById] = useState<string>('');
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isCategorizing, setIsCategorizing] = useState(false);
  const { toast } = useToast();

  const [splitType, setSplitType] = useState<SplitType>('equally');
  const [splitEquallyAmongAll, setSplitEquallyAmongAll] = useState(true);
  const [selectedMembersForEqualSplit, setSelectedMembersForEqualSplit] = useState<Set<string>>(new Set());
  const [splitAmounts, setSplitAmounts] = useState<Record<string, string>>({});
  const [splitPercentages, setSplitPercentages] = useState<Record<string, string>>({});
  const [receiptImageUri, setReceiptImageUri] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Default "Paid By" to the logged-in user if they are in the members list
    if (members.length > 0) {
      const loggedInMember = members.find(m => m.id === loggedInUserId);
      if (loggedInMember) {
        setPaidById(loggedInMember.id);
      } else if (!paidById || !members.find(m => m.id === paidById)) {
        setPaidById(members[0].id); // Fallback to first member if logged-in user not in list (shouldn't happen often)
      }
    } else {
      setPaidById('');
    }
  }, [members, loggedInUserId]);


  useEffect(() => {
    setSelectedMembersForEqualSplit(new Set());
    setSplitAmounts({});
    setSplitPercentages({});
  }, [splitType]);


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

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ title: "Image too large", description: "Please select an image smaller than 5MB.", variant: "destructive"});
        if(fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptImageUri(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setReceiptImageUri(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
    const expenseTotal = Number(amount);
    if (expenseTotal <= 0) {
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
    } else if (splitType === 'byAmount') {
      let explicitlySetDetails: { memberId: string; amount: number }[] = [];
      let sumOfExplicitlySet = 0;
      let membersLeftBlankOrZero: string[] = [];

      members.forEach(member => {
        const valueStr = splitAmounts[member.id]?.trim();
        if (valueStr && !isNaN(parseFloat(valueStr)) && parseFloat(valueStr) !== 0) {
          const parsedValue = parseFloat(valueStr);
          explicitlySetDetails.push({ memberId: member.id, amount: parsedValue });
          sumOfExplicitlySet += parsedValue;
        } else {
          membersLeftBlankOrZero.push(member.id);
        }
      });

      const currentDiscrepancy = expenseTotal - sumOfExplicitlySet;

      if (membersLeftBlankOrZero.length === 1) {
        const targetMemberId = membersLeftBlankOrZero[0];
        const amountForTarget = currentDiscrepancy;

        explicitlySetDetails.push({ memberId: targetMemberId, amount: amountForTarget });
        const newSumOfExplicitlySet = explicitlySetDetails.reduce((sum, detail) => sum + detail.amount, 0);

        if (Math.abs(expenseTotal - newSumOfExplicitlySet) > 0.01 && expenseTotal > 0) {
             toast({
                title: "Calculation Issue",
                description: `Amounts still don't sum to total after auto-assignment. Please check values. Sum: ${newSumOfExplicitlySet.toFixed(2)}, Total: ${expenseTotal.toFixed(2)}`,
                variant: "destructive",
                duration: 7000
            });
            return;
        }
        finalSplitDetails = explicitlySetDetails;
        const targetMember = members.find(m => m.id === targetMemberId);
        if (Math.abs(amountForTarget) > 0.001 || expenseTotal === 0 || (amountForTarget === 0 && membersLeftBlankOrZero.includes(targetMemberId))) {
            toast({
            title: "Amount Auto-Calculated",
            description: `Amount for ${targetMember?.name || 'one member'} automatically set to ${amountForTarget.toFixed(2)} ${tripCurrency} to balance the total.`,
            duration: 6000,
            });
        }
      } else if (membersLeftBlankOrZero.length === 0) {
        if (Math.abs(currentDiscrepancy) > 0.01) {
            const payerDetailIndex = explicitlySetDetails.findIndex(detail => detail.memberId === paidById);

            if (payerDetailIndex !== -1) {
                explicitlySetDetails[payerDetailIndex].amount += currentDiscrepancy;
                const finalSumAfterAdjustment = explicitlySetDetails.reduce((sum, detail) => sum + detail.amount, 0);
                 if(Math.abs(expenseTotal - finalSumAfterAdjustment) > 0.01 && expenseTotal > 0) {
                     toast({
                        title: "Auto-Adjustment Failed",
                        description: `Could not auto-adjust payer's share to match total. Please check amounts. Sum: ${finalSumAfterAdjustment.toFixed(2)}, Total: ${expenseTotal.toFixed(2)}`,
                        variant: "destructive",
                        duration: 8000
                    });
                    return;
                }
                const payerMember = members.find(m => m.id === paidById);
                toast({
                    title: "Share Auto-Adjusted",
                    description: `${payerMember?.name || 'Payer'}'s share was automatically adjusted by ${currentDiscrepancy.toFixed(2)} ${tripCurrency} to reach the total of ${expenseTotal.toFixed(2)}. Final sum of shares: ${finalSumAfterAdjustment.toFixed(2)} ${tripCurrency}.`,
                    duration: 8000,
                });
                finalSplitDetails = explicitlySetDetails;
            } else {
                 toast({
                    title: "Amount Mismatch",
                    description: `Sum of entered amounts (${sumOfExplicitlySet.toFixed(2)}) does not match total expense (${expenseTotal.toFixed(2)}). Please adjust amounts manually, or ensure the payer is part of the split for auto-adjustment.`,
                    variant: "destructive",
                    duration: 8000,
                });
                return;
            }
        } else {
            finalSplitDetails = explicitlySetDetails;
        }
      } else {
        if (Math.abs(currentDiscrepancy) > 0.01) {
          toast({
            title: "Amount Mismatch",
            description: `Sum of amounts (${sumOfExplicitlySet.toFixed(2)}) does not match total expense (${expenseTotal.toFixed(2)}). Please adjust or leave only one member's amount blank for auto-calculation.`,
            variant: "destructive",
            duration: 7000,
          });
          return;
        }
        finalSplitDetails = explicitlySetDetails;
      }
      finalSplitDetails = finalSplitDetails.filter(d => Math.abs(d.amount) > 0.001 || (expenseTotal === 0 && d.amount === 0));
      if (finalSplitDetails.length === 0 && expenseTotal > 0) {
          toast({ title: "No valid shares", description: "Please enter amounts for at least one member or ensure auto-calculation results in valid shares.", variant: "destructive" });
          return;
      }

    } else if (splitType === 'byPercentage') {
      const currentSplitPercentages = Object.entries(splitPercentages)
        .map(([memberId, percStr]) => ({ memberId, percentage: parseFloat(percStr) || 0 }))
        .filter(item => item.percentage > 0);

      const totalSplitPercentage = currentSplitPercentages.reduce((sum, item) => sum + item.percentage, 0);
      if (Math.abs(totalSplitPercentage - 100) > 0.01) {
        toast({ title: "Percentage Mismatch", description: `The sum of percentages (${totalSplitPercentage.toFixed(2)}%) must be 100%.`, variant: "destructive" });
        return;
      }
       if (currentSplitPercentages.length === 0 && expenseTotal > 0) {
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
      amount: expenseTotal,
      paidById,
      category,
      date,
      splitType,
      splitDetails: finalSplitDetails,
      receiptImageUri,
    });

    setDescription('');
    setAmount('');
    setDate(new Date());
    setSplitType('equally');
    setSplitEquallyAmongAll(true);
    setSelectedMembersForEqualSplit(new Set());
    setSplitAmounts({});
    setSplitPercentages({});
    setReceiptImageUri(undefined);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (members.length > 0) {
      const loggedInMember = members.find(m => m.id === loggedInUserId);
      setPaidById(loggedInMember ? loggedInMember.id : members[0].id);
    } else {
      setPaidById('');
    }
    if (onFormSubmit) {
        onFormSubmit(); 
    }
  };

  return (
    // Card removed to be part of DialogContent styling, form directly returned
    <form onSubmit={handleSubmit} className="space-y-5 py-4 px-1"> {/* Added some padding if needed */}
      <div>
        <Label htmlFor="description" className="flex items-center mb-1.5"><Receipt className="mr-2 h-4 w-4" />Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., Dinner, Flight tickets"
          required
          className="text-sm"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
        <div>
          <Label htmlFor="amount" className="flex items-center mb-1.5"><DollarSign className="mr-2 h-4 w-4" />Amount ({tripCurrency})</Label>
          <Input
            id="amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
            placeholder="0.00"
            required
            min="0.01"
            step="0.01"
            className="text-sm"
          />
        </div>
        <div>
          <Label htmlFor="date" className="flex items-center mb-1.5"><CalendarDays className="mr-2 h-4 w-4" />Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className="w-full justify-start text-left font-normal text-sm"
              >
                <CalendarDays className="mr-2 h-4 w-4 flex-shrink-0" />
                <span className="whitespace-normal break-all text-left flex-grow">
                  {date ? format(date, "MM/dd/yyyy") : 'Pick a date'}
                </span>
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
        <Label htmlFor="paidBy" className="flex items-center mb-1.5"><User className="mr-2 h-4 w-4" />Paid By</Label>
        <Select value={paidById} onValueChange={setPaidById} required>
          <SelectTrigger id="paidBy" disabled={members.length === 0} className="text-sm">
            <SelectValue placeholder="Select member" />
          </SelectTrigger>
          <SelectContent>
            {members.map((member) => (
              <SelectItem key={member.id} value={member.id} className="text-sm">
                {member.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {members.length === 0 && <p className="text-xs text-destructive mt-1">Add members to select who paid.</p>}
      </div>

      <div>
        <Label htmlFor="receiptImage" className="flex items-center mb-1.5"><Paperclip className="mr-2 h-4 w-4" />Receipt (Optional, &lt;5MB)</Label>
        <Input
          id="receiptImage"
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          ref={fileInputRef}
          className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:bg-muted file:text-muted-foreground hover:file:bg-muted/50"
        />
        {receiptImageUri && (
          <div className="mt-2 relative w-28 h-28 border rounded-md p-1 bg-muted/20">
            <img src={receiptImageUri} alt="Receipt preview" className="w-full h-full object-contain rounded" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6 bg-destructive/80 hover:bg-destructive text-destructive-foreground rounded-full shadow-md"
              onClick={handleRemoveImage}
              aria-label="Remove receipt image"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <Separator className="my-4"/>
      <div>
        <Label className="flex items-center mb-2 text-md font-semibold"><Split className="mr-2 h-5 w-5"/>Split Details</Label>
        <RadioGroup value={splitType} onValueChange={(value) => setSplitType(value as SplitType)} className="mb-3 space-y-1">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="equally" id="s-equally" />
            <Label htmlFor="s-equally" className="font-normal text-sm">Equally</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="byAmount" id="s-amount" />
            <Label htmlFor="s-amount" className="font-normal text-sm">By Amount</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="byPercentage" id="s-percentage" />
            <Label htmlFor="s-percentage" className="font-normal text-sm">By Percentage</Label>
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
              <Label htmlFor="splitEquallyAmongAll" className="font-normal text-sm">Split among all trip members</Label>
            </div>
            {!splitEquallyAmongAll && (
              <div className="ml-2 space-y-1 pt-2">
                <Label className="text-xs text-muted-foreground mb-1 block">Select members to include in equal split:</Label>
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
            <Label className="text-xs text-muted-foreground mb-1 block">Enter specific amount for each member (leave one blank for auto-calculation, or fill all and payer's share will adjust if sum mismatches total):</Label>
             <ScrollArea className="h-[120px] p-1">
              {members.map(member => (
                <div key={member.id} className="flex items-center gap-2 mb-2">
                  <Label htmlFor={`amt-${member.id}`} className="min-w-[40%] sm:min-w-[30%] flex-shrink-0 truncate text-sm">{member.name}</Label>
                  <Input
                    id={`amt-${member.id}`}
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    value={splitAmounts[member.id] || ''}
                    onChange={(e) => handleSplitAmountChange(member.id, e.target.value)}
                    className="h-8 flex-grow text-sm" 
                  />
                </div>
              ))}
            </ScrollArea>
          </div>
        )}

        {splitType === 'byPercentage' && members.length > 0 && (
           <div className="space-y-2 p-3 border rounded-md bg-muted/30">
            <Label className="text-xs text-muted-foreground mb-1 block">Enter percentage for each member (must sum to 100%):</Label>
            <ScrollArea className="h-[120px] p-1">
              {members.map(member => (
                <div key={member.id} className="flex items-center gap-2 mb-2">
                  <Label htmlFor={`perc-${member.id}`} className="min-w-[40%] sm:min-w-[30%] flex-shrink-0 truncate text-sm">{member.name}</Label>
                  <Input
                    id={`perc-${member.id}`}
                    type="number"
                    placeholder="0"
                    min="0"
                    max="100"
                    step="0.01"
                    value={splitPercentages[member.id] || ''}
                    onChange={(e) => handleSplitPercentageChange(member.id, e.target.value)}
                    className="h-8 flex-grow text-sm"
                  />
                  <span className="text-sm flex-shrink-0">%</span>
                </div>
              ))}
            </ScrollArea>
          </div>
        )}
         {members.length === 0 && (splitType === 'byAmount' || splitType === 'byPercentage' || (splitType === 'equally' && !splitEquallyAmongAll)) && (
            <p className="text-sm text-muted-foreground p-3 border rounded-md bg-muted/30 text-center">Add members to specify split details.</p>
         )}
      </div>

      <Button type="submit" className="w-full text-base py-3" disabled={isCategorizing || members.length === 0}>
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
  );
}
 
