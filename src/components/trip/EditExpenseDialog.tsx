
"use client";

import type React from 'react';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Receipt, DollarSign, CalendarDays, User, Save, Split, UsersIcon } from 'lucide-react';
import type { Member, Expense, SplitType, SplitDetail } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface EditExpenseDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  expenseToEdit: Expense | null;
  members: Member[];
  tripCurrency: string;
  onUpdateExpense: (updatedExpense: Expense) => void;
}

export function EditExpenseDialog({ 
  isOpen, 
  onOpenChange, 
  expenseToEdit, 
  members, 
  tripCurrency, 
  onUpdateExpense 
}: EditExpenseDialogProps) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [paidById, setPaidById] = useState<string>('');
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [category, setCategory] = useState<string | undefined>(undefined); // Category is not AI-suggested on edit

  const [splitType, setSplitType] = useState<SplitType>('equally');
  const [splitEquallyAmongAll, setSplitEquallyAmongAll] = useState(true);
  const [selectedMembersForEqualSplit, setSelectedMembersForEqualSplit] = useState<Set<string>>(new Set());
  const [splitAmounts, setSplitAmounts] = useState<Record<string, string>>({});
  const [splitPercentages, setSplitPercentages] = useState<Record<string, string>>({});
  
  const { toast } = useToast();

  useEffect(() => {
    if (expenseToEdit) {
      setDescription(expenseToEdit.description);
      setAmount(expenseToEdit.amount);
      setPaidById(expenseToEdit.paidById);
      setDate(new Date(expenseToEdit.date));
      setCategory(expenseToEdit.category);
      setSplitType(expenseToEdit.splitType);

      if (expenseToEdit.splitType === 'equally') {
        if (expenseToEdit.splitDetails && expenseToEdit.splitDetails.length > 0) {
          // If there are specific members selected for equal split
          const selectedMemberIds = new Set(expenseToEdit.splitDetails.map(sd => sd.memberId));
          const allMemberIdsInSplit = members.length > 0 ? new Set(members.map(m => m.id)) : new Set();
          
          // Check if the splitDetails effectively mean "all members"
          let isEffectivelyAll = true;
          if (selectedMemberIds.size !== allMemberIdsInSplit.size) {
            isEffectivelyAll = false;
          } else {
            for (const id of selectedMemberIds) {
              if (!allMemberIdsInSplit.has(id)) {
                isEffectivelyAll = false;
                break;
              }
            }
          }

          if (isEffectivelyAll && members.length > 0) {
             setSplitEquallyAmongAll(true);
             setSelectedMembersForEqualSplit(new Set());
          } else {
            setSplitEquallyAmongAll(false);
            setSelectedMembersForEqualSplit(selectedMemberIds);
          }

        } else {
          // Default to split among all if splitDetails is empty or undefined
          setSplitEquallyAmongAll(true);
          setSelectedMembersForEqualSplit(new Set());
        }
      } else {
        setSplitEquallyAmongAll(false); // Default for other types
        setSelectedMembersForEqualSplit(new Set());
      }


      if (expenseToEdit.splitType === 'byAmount' && expenseToEdit.splitDetails) {
        const amounts: Record<string, string> = {};
        expenseToEdit.splitDetails.forEach(sd => {
          if (sd.amount !== undefined) amounts[sd.memberId] = String(sd.amount);
        });
        setSplitAmounts(amounts);
      } else {
        setSplitAmounts({});
      }

      if (expenseToEdit.splitType === 'byPercentage' && expenseToEdit.splitDetails) {
        const percentages: Record<string, string> = {};
        expenseToEdit.splitDetails.forEach(sd => {
          if (sd.percentage !== undefined) percentages[sd.memberId] = String(sd.percentage);
        });
        setSplitPercentages(percentages);
      } else {
        setSplitPercentages({});
      }
    }
  }, [expenseToEdit, members, isOpen]); // Re-run if isOpen changes to reset form if dialog is re-opened for new expense

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseToEdit) return;

    if (!description || amount === '' || !paidById || !date) {
      toast({ title: "Missing fields", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }
    if (Number(amount) <= 0) {
      toast({ title: "Invalid amount", description: "Expense amount must be greater than zero.", variant: "destructive" });
      return;
    }
    if (members.length === 0 && (splitType === 'byAmount' || splitType === 'byPercentage' || (splitType === 'equally' && !splitEquallyAmongAll))) {
        toast({ title: "No members", description: "Cannot specify split details without members.", variant: "destructive" });
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
      const currentSplitAmounts = Object.entries(splitAmounts)
        .map(([memberId, amtStr]) => ({ memberId, amount: parseFloat(amtStr) || 0 }))
        .filter(item => item.amount > 0);
      const totalSplitAmount = currentSplitAmounts.reduce((sum, item) => sum + item.amount, 0);
      if (Math.abs(totalSplitAmount - Number(amount)) > 0.01) {
        toast({ title: "Split Amount Mismatch", description: `The sum of amounts (${totalSplitAmount.toFixed(2)}) must equal the total expense amount (${Number(amount).toFixed(2)}).`, variant: "destructive" });
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

    const updatedExpense: Expense = {
      ...expenseToEdit,
      description,
      amount: Number(amount),
      paidById,
      category, // Preserve existing category or let it be undefined
      date,
      splitType,
      splitDetails: finalSplitDetails,
      // createdAt is not changed on edit
    };

    onUpdateExpense(updatedExpense);
  };

  if (!expenseToEdit) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Receipt className="mr-2 h-6 w-6" /> Edit Expense
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
          <div>
            <Label htmlFor="edit-description" className="flex items-center mb-1"><Receipt className="mr-2 h-4 w-4" />Description</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Dinner, Flight tickets"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-amount" className="flex items-center mb-1"><DollarSign className="mr-2 h-4 w-4" />Amount ({tripCurrency})</Label>
              <Input
                id="edit-amount"
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
              <Label htmlFor="edit-date" className="flex items-center mb-1"><CalendarDays className="mr-2 h-4 w-4" />Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="edit-date"
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
            <Label htmlFor="edit-paidBy" className="flex items-center mb-1"><User className="mr-2 h-4 w-4" />Paid By</Label>
            <Select value={paidById} onValueChange={setPaidById} required>
              <SelectTrigger id="edit-paidBy" disabled={members.length === 0}>
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
          
          {/* Category display (not editable for now, to keep Genkit flow separate) */}
           {category && (
            <div>
                <Label className="flex items-center mb-1 text-sm">Category</Label>
                <Input type="text" value={category} readOnly className="bg-muted/50 cursor-not-allowed"/>
            </div>
           )}


          <Separator />
          <div>
            <Label className="flex items-center mb-2 text-md font-semibold"><Split className="mr-2 h-5 w-5"/>Split Details</Label>
            <RadioGroup value={splitType} onValueChange={(value) => setSplitType(value as SplitType)} className="mb-3">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="equally" id="edit-s-equally" />
                <Label htmlFor="edit-s-equally">Equally</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="byAmount" id="edit-s-amount" />
                <Label htmlFor="edit-s-amount">By Amount</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="byPercentage" id="edit-s-percentage" />
                <Label htmlFor="edit-s-percentage">By Percentage</Label>
              </div>
            </RadioGroup>

            {splitType === 'equally' && members.length > 0 && (
              <div className="space-y-2 p-3 border rounded-md bg-muted/30">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="edit-splitEquallyAmongAll" 
                    checked={splitEquallyAmongAll} 
                    onCheckedChange={(checked) => setSplitEquallyAmongAll(Boolean(checked))}
                  />
                  <Label htmlFor="edit-splitEquallyAmongAll" className="font-normal">Split among all trip members</Label>
                </div>
                {!splitEquallyAmongAll && (
                  <div className="ml-2 space-y-1 pt-1">
                    <Label className="text-xs text-muted-foreground">Select members to include in equal split:</Label>
                    <ScrollArea className="h-[100px] p-2 border rounded-md bg-background">
                    {members.map(member => (
                      <div key={member.id} className="flex items-center space-x-2 mb-1">
                        <Checkbox
                          id={`edit-eq-member-${member.id}`}
                          checked={selectedMembersForEqualSplit.has(member.id)}
                          onCheckedChange={() => handleToggleMemberForEqualSplit(member.id)}
                        />
                        <Label htmlFor={`edit-eq-member-${member.id}`} className="font-normal text-sm">{member.name}</Label>
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
                      <Label htmlFor={`edit-amt-${member.id}`} className="w-1/3 truncate text-sm">{member.name}</Label>
                      <Input
                        id={`edit-amt-${member.id}`}
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
                      <Label htmlFor={`edit-perc-${member.id}`} className="w-1/3 truncate text-sm">{member.name}</Label>
                      <Input
                        id={`edit-perc-${member.id}`}
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

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={members.length === 0 && (splitType !== 'equally' || !splitEquallyAmongAll) }>
                <Save className="mr-2 h-5 w-5" /> Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
