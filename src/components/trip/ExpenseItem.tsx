
"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Expense, Member } from '@/lib/types';
import { User, CalendarDays, Tag, MessageSquare, DollarSign, Split, Edit, Trash2, Paperclip as PaperclipIcon, Users as UsersIcon } from 'lucide-react';
import { format, isValid, isDate } from 'date-fns';
import { CommentForm } from './CommentForm';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import { getAvatarData } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";


interface ExpenseItemProps {
  expense: Expense;
  members: Member[];
  tripCurrency: string;
  onAddComment: (expenseId: string, text: string) => void; // Updated signature
  onDeleteExpense: (expenseId: string) => void;
  onEditExpense: (expense: Expense) => void;
}

export function ExpenseItem({ expense, members, tripCurrency, onAddComment, onDeleteExpense, onEditExpense }: ExpenseItemProps) {
  const { user } = useAuth(); // Get logged-in user
  const paidByMember = members.find(member => member.id === expense.paidById);
  const avatarData = getAvatarData(paidByMember?.name);

  const getSplitDescription = () => {
    switch (expense.splitType) {
      case 'equally':
        if (!expense.splitDetails || expense.splitDetails.length === 0) {
          return "Split equally (all)";
        }
        const involvedMemberIds = new Set(expense.splitDetails.map(sd => sd.memberId));
        if (members.length > 0 && involvedMemberIds.size === members.length && members.every(m => involvedMemberIds.has(m.id))) {
            return "Split equally (all)";
        }
        if (involvedMemberIds.size > 0) return `Split equally (${involvedMemberIds.size} members)`;
        return "Split equally (all)";
      case 'byAmount':
        return "Split by amount";
      case 'byPercentage':
        return "Split by percentage";
      default:
        return "Split equally (all)";
    }
  };

  const renderSplitDetailsForPopover = () => {
    const detailsExist = expense.splitDetails && expense.splitDetails.length > 0;

    switch (expense.splitType) {
      case 'equally':
        let equallySplitMemberNames: string[];
        if (detailsExist) {
          equallySplitMemberNames = expense.splitDetails!
            .map(sd => members.find(m => m.id === sd.memberId)?.name)
            .filter(Boolean as unknown as (name: string | undefined) => name is string);
          if (equallySplitMemberNames.length === 0 && expense.splitDetails!.length > 0) {
            return <p className="text-xs text-muted-foreground">Split among previously selected members (details may be outdated if members were removed).</p>;
          }
        } else {
          equallySplitMemberNames = members.map(m => m.name);
        }
        return (
          <div>
            <p className="font-medium text-sm mb-1">Split Equally Among:</p>
            {equallySplitMemberNames.length > 0 ? (
              <ScrollArea className="max-h-40">
                <ul className="list-disc list-inside text-xs space-y-0.5 pr-2">
                  {equallySplitMemberNames.map((name, index) => <li key={`${name}-${index}`}>{name}</li>)}
                </ul>
              </ScrollArea>
            ) : (
              <p className="text-xs text-muted-foreground">All trip members (or no members currently in trip).</p>
            )}
          </div>
        );
      case 'byAmount':
        if (!detailsExist) return <p className="text-sm text-muted-foreground">No specific amounts detailed.</p>;
        return (
          <div>
            <p className="font-medium text-sm mb-1">Split By Amount:</p>
            <ScrollArea className="max-h-40">
              <ul className="text-xs space-y-0.5 pr-2">
                {expense.splitDetails!.map(sd => {
                  const member = members.find(m => m.id === sd.memberId);
                  return (
                    <li key={sd.memberId} className="flex justify-between">
                      <span>{member?.name || `ID: ${sd.memberId.substring(0,6)}...`}:</span>
                      <span className="font-semibold">{sd.amount?.toFixed(2)} {tripCurrency}</span>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          </div>
        );
      case 'byPercentage':
        if (!detailsExist) return <p className="text-sm text-muted-foreground">No specific percentages detailed.</p>;
        return (
          <div>
            <p className="font-medium text-sm mb-1">Split By Percentage:</p>
            <ScrollArea className="max-h-40">
              <ul className="text-xs space-y-0.5 pr-2">
                {expense.splitDetails!.map(sd => {
                  const member = members.find(m => m.id === sd.memberId);
                  return (
                    <li key={sd.memberId} className="flex justify-between">
                      <span>{member?.name || `ID: ${sd.memberId.substring(0,6)}...`}:</span>
                      <span className="font-semibold">{sd.percentage?.toFixed(2)}%</span>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          </div>
        );
      default:
        return <p className="text-sm text-muted-foreground">Split details not available for this type.</p>;
    }
  };


  const canComment = !!user; // User can comment if they are logged in
  const expenseDate = expense.date instanceof Date ? expense.date : (expense.date as any)?.toDate?.();


  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg flex-grow mr-2">{expense.description}</CardTitle>
          <div className="flex items-center space-x-1 flex-shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditExpense(expense)}>
              <Edit className="h-4 w-4" />
              <span className="sr-only">Edit expense</span>
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDeleteExpense(expense.id)}>
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete expense</span>
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 items-center pt-1">
            <Badge variant={expense.category ? "secondary" : "outline"} className="text-xs whitespace-nowrap">
              <Tag className="mr-1 h-3 w-3"/> {expense.category || "Uncategorized"}
            </Badge>
            <div className="flex items-center">
              <Badge variant="outline" className="text-xs whitespace-nowrap">
                <Split className="mr-1 h-3 w-3"/> {getSplitDescription()}
              </Badge>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 ml-0.5 text-muted-foreground hover:text-foreground">
                    <UsersIcon className="h-3.5 w-3.5" />
                    <span className="sr-only">View split details</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto min-w-[240px] max-w-sm p-3 shadow-xl">
                  {renderSplitDetailsForPopover()}
                </PopoverContent>
              </Popover>
            </div>
            {expense.receiptImageUri && (
                 <Dialog>
                    <DialogTrigger asChild>
                         <Badge variant="outline" className="text-xs whitespace-nowrap cursor-pointer hover:bg-muted/50">
                            <PaperclipIcon className="mr-1 h-3 w-3"/> View Receipt
                        </Badge>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl max-h-[80vh] flex flex-col">
                        <DialogHeader>
                        <DialogTitle>Receipt for: {expense.description}</DialogTitle>
                        </DialogHeader>
                        <div className="flex-grow overflow-auto p-2">
                         <img src={expense.receiptImageUri} alt={`Receipt for ${expense.description}`} className="max-w-full max-h-full mx-auto object-contain rounded-md"/>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
        <CardDescription className="text-xs flex flex-wrap gap-x-4 gap-y-1 pt-1 items-center">
          <span className="flex items-center"><DollarSign className="mr-1 h-3 w-3" /> {expense.amount.toFixed(2)} {tripCurrency}</span>
          {paidByMember && (
            <span className="flex items-center">
              <div className={`w-4 h-4 rounded-full ${avatarData.bgColor} flex items-center justify-center text-white font-semibold text-[10px] mr-1.5`}>
                {avatarData.initials}
              </div>
              Paid by: {paidByMember.name}
            </span>
          )}
          <span className="flex items-center">
            <CalendarDays className="mr-1 h-3 w-3" />
            {expenseDate && isDate(expenseDate) && isValid(expenseDate)
              ? format(expenseDate, "MMM d, yyyy")
              : 'Date not set'}
          </span>
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-2 pb-2">
        {expense.comments.length > 0 && (
          <>
            <h4 className="text-sm font-medium mb-1 flex items-center"><MessageSquare className="mr-1 h-4 w-4 text-muted-foreground" /> Comments:</h4>
            <ScrollArea className="h-[60px] p-1 rounded-md bg-muted/30 mb-2">
              <ul className="space-y-1 text-xs">
                {expense.comments.map((comment) => {
                    const commentAuthorAvatar = getAvatarData(comment.authorName);
                    const commentDateRaw = comment.createdAt;
                    const commentDate = commentDateRaw instanceof Date ? commentDateRaw : (commentDateRaw as any)?.toDate?.();
                    return (
                      <li key={comment.id} className="bg-background/50 p-1.5 rounded flex items-start gap-1.5">
                        <div className={`mt-0.5 w-5 h-5 rounded-full ${commentAuthorAvatar.bgColor} flex items-center justify-center text-white font-semibold text-[10px] flex-shrink-0`}>
                          {commentAuthorAvatar.initials}
                        </div>
                        <div>
                          <strong>{comment.authorName}:</strong> {comment.text}
                          {commentDate && isValid(commentDate) && isDate(commentDate) && (
                            <span className="text-muted-foreground text-[10px] ml-1">({format(commentDate, "p")})</span>
                          )}
                        </div>
                      </li>
                    );
                })}
              </ul>
            </ScrollArea>
          </>
        )}
         { canComment ? (
            <CommentForm
              expenseId={expense.id}
              onAddComment={onAddComment} // No longer passing members or currentUserId
            />
          ) : (
            <p className="text-xs text-muted-foreground pt-1">Login to add comments.</p>
          )}
      </CardContent>
    </Card>
  );
}
