
"use client";

import type React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Receipt, DollarSign, CalendarDays, User, Save, Split, UsersIcon, Paperclip, XCircle } from 'lucide-react';
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
  const [category, setCategory] = useState<string | undefined>(undefined);

  const [splitType, setSplitType] = useState<SplitType>('equally');
  const [splitEquallyAmongAll, setSplitEquallyAmongAll] = useState(true);
  const [selectedMembersForEqualSplit, setSelectedMembersForEqualSplit] = useState<Set<string>>(new Set());
  const [splitAmounts, setSplitAmounts] = useState<Record<string, string>>({});
  const [splitPercentages, setSplitPercentages] = useState<Record<string, string>>({});
  const [receiptImageUri, setReceiptImageUri] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();

  useEffect(() => {
    if (expenseToEdit && isOpen) {
      setDescription(expenseToEdit.description);
      setAmount(expenseToEdit.amount);
      setPaidById(expenseToEdit.paidById);
      setDate(expenseToEdit.date ? (expenseToEdit.date instanceof Date ? expenseToEdit.date : (expenseToEdit.date as any).toDate?.()) : new Date());
      setCategory(expenseToEdit.category);
      setSplitType(expenseToEdit.splitType);
      setReceiptImageUri(expenseToEdit.receiptImageUri);
      if(fileInputRef.current) fileInputRef.current.value = "";


      if (expenseToEdit.splitType === 'equally') {
        if (expenseToEdit.splitDetails && expenseToEdit.splitDetails.length > 0 && members.length > 0) {
          const selectedMemberIds = new Set(expenseToEdit.splitDetails.map(sd => sd.memberId));
          const allCurrentMemberIdsInTrip = new Set(members.map(m => m.id));
          const validSelectedMemberIds = Array.from(selectedMemberIds).filter(id => allCurrentMemberIdsInTrip.has(id));
          
          let isEffectivelyAll = validSelectedMemberIds.length === allCurrentMemberIdsInTrip.size &&
                                 validSelectedMemberIds.every(id => allCurrentMemberIdsInTrip.has(id));
          
          if (expenseToEdit.splitDetails.length > 0 && isEffectivelyAll && members.length > 0) {
             setSplitEquallyAmongAll(true);
             setSelectedMembersForEqualSplit(new Set()); 
          } else if (expenseToEdit.splitDetails.length === 0 && members.length > 0) {
            setSplitEquallyAmongAll(true);
            setSelectedMembersForEqualSplit(new Set());
          }
          else { 
            setSplitEquallyAmongAll(false);
            setSelectedMembersForEqualSplit(new Set(validSelectedMemberIds));
          }

        } else { 
          setSplitEquallyAmongAll(true);
          setSelectedMembersForEqualSplit(new Set());
        }
      } else { 
        setSplitEquallyAmongAll(false); 
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
  }, [expenseToEdit, members, isOpen]);

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
      if (file.size > 5 * 1024 * 1024) {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseToEdit) return;

    if (!description || amount === '' || !paidById || !date) {
      toast({ title: "Missing fields", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }
    const expenseTotal = Number(amount);
    if (expenseTotal <= 0) {
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

    const updatedExpense: Expense = {
      ...expenseToEdit,
      description,
      amount: expenseTotal,
      paidById,
      category: category, 
      date,
      splitType,
      splitDetails: finalSplitDetails,
      receiptImageUri,
    };

    onUpdateExpense(updatedExpense);
  };

  if (!expenseToEdit || !isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh]"> {/* Made dialog larger */}
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <Receipt className="mr-2 h-6 w-6 text-primary" /> Edit Expense
          </DialogTitle>
        </DialogHeader>
        {/* ScrollArea removed, form should fit or dialog content itself will scroll if viewport is too small */}
        <form onSubmit={handleSubmit} className="space-y-5 py-4 px-1">
            <div>
              <Label htmlFor="edit-description" className="flex items-center mb-1.5"><Receipt className="mr-2 h-4 w-4" />Description</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Dinner, Flight tickets"
                required
                className="text-sm"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div>
                <Label htmlFor="edit-amount" className="flex items-center mb-1.5"><DollarSign className="mr-2 h-4 w-4" />Amount ({tripCurrency})</Label>
                <Input
                  id="edit-amount"
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
                <Label htmlFor="edit-date" className="flex items-center mb-1.5"><CalendarDays className="mr-2 h-4 w-4" />Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="edit-date"
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
              <Label htmlFor="edit-paidBy" className="flex items-center mb-1.5"><User className="mr-2 h-4 w-4" />Paid By</Label>
              <Select value={paidById} onValueChange={setPaidById} required>
                <SelectTrigger id="edit-paidBy" disabled={members.length === 0} className="text-sm">
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

            {category && (
              <div>
                  <Label className="flex items-center mb-1.5 text-sm">Category</Label>
                  <Input type="text" value={category} readOnly className="bg-muted/50 cursor-not-allowed text-sm"/>
              </div>
            )}

            <div>
              <Label htmlFor="edit-receiptImage" className="flex items-center mb-1.5"><Paperclip className="mr-2 h-4 w-4" />Receipt (Optional, &lt;5MB)</Label>
              <Input
                id="edit-receiptImage"
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
                  <RadioGroupItem value="equally" id="edit-s-equally" />
                  <Label htmlFor="edit-s-equally" className="font-normal text-sm">Equally</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="byAmount" id="edit-s-amount" />
                  <Label htmlFor="edit-s-amount" className="font-normal text-sm">By Amount</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="byPercentage" id="edit-s-percentage" />
                  <Label htmlFor="edit-s-percentage" className="font-normal text-sm">By Percentage</Label>
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
                    <Label htmlFor="edit-splitEquallyAmongAll" className="font-normal text-sm">Split among all trip members</Label>
                  </div>
                  {!splitEquallyAmongAll && (
                    <div className="ml-2 space-y-1 pt-2">
                      <Label className="text-xs text-muted-foreground mb-1 block">Select members to include in equal split:</Label>
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
                  <Label className="text-xs text-muted-foreground mb-1 block">Enter specific amount for each member (leave one blank for auto-calculation, or fill all and payer's share will adjust if sum mismatches total):</Label>
                  <ScrollArea className="h-[120px] p-1">
                    {members.map(member => (
                      <div key={member.id} className="flex items-center gap-2 mb-2">
                        <Label htmlFor={`edit-amt-${member.id}`} className="min-w-[40%] sm:min-w-[30%] flex-shrink-0 truncate text-sm">{member.name}</Label>
                        <Input
                          id={`edit-amt-${member.id}`}
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
                        <Label htmlFor={`edit-perc-${member.id}`} className="min-w-[40%] sm:min-w-[30%] flex-shrink-0 truncate text-sm">{member.name}</Label>
                        <Input
                          id={`edit-perc-${member.id}`}
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
        </form>
        <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button 
              onClick={handleSubmit}
              disabled={members.length === 0 && (splitType !== 'equally' || !splitEquallyAmongAll) }
            >
                <Save className="mr-2 h-5 w-5" /> Save Changes
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
 
