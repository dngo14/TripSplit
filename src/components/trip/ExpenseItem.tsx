
"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Expense, Member } from '@/lib/types';
import { User, CalendarDays, Tag, MessageSquare, DollarSign, Split, Edit, Trash2, Paperclip as PaperclipIcon } from 'lucide-react';
import { format, isValid, isDate } from 'date-fns'; // Import isValid and isDate
import { CommentForm } from './CommentForm';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import { getAvatarData } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"


interface ExpenseItemProps {
  expense: Expense;
  members: Member[];
  tripCurrency: string;
  currentUserId: string;
  onAddComment: (expenseId: string, authorId: string, text: string) => void;
  onDeleteExpense: (expenseId: string) => void;
  onEditExpense: (expense: Expense) => void;
}

export function ExpenseItem({ expense, members, tripCurrency, currentUserId, onAddComment, onDeleteExpense, onEditExpense }: ExpenseItemProps) {
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

  const canComment = !!currentUserId && members.some(m => m.id === currentUserId);

  return (
    <Card className="mb-4 shadow-md hover:shadow-lg transition-shadow duration-200">
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
             <Badge variant="outline" className="text-xs whitespace-nowrap">
              <Split className="mr-1 h-3 w-3"/> {getSplitDescription()}
            </Badge>
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
            {/* Updated date formatting to be more robust */}
            {isDate(expense.date) && isValid(expense.date as Date)
              ? format(expense.date as Date, "MMM d, yyyy")
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
                    const commentDate = comment.createdAt ? (comment.createdAt instanceof Date ? comment.createdAt : (comment.createdAt as any).toDate?.()) : null;
                    return (
                      <li key={comment.id} className="bg-background/50 p-1.5 rounded flex items-start gap-1.5">
                        <div className={`mt-0.5 w-5 h-5 rounded-full ${commentAuthorAvatar.bgColor} flex items-center justify-center text-white font-semibold text-[10px] flex-shrink-0`}>
                          {commentAuthorAvatar.initials}
                        </div>
                        <div>
                          <strong>{comment.authorName}:</strong> {comment.text}
                          {commentDate && isValid(commentDate) && (
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
              members={members}
              currentUserId={currentUserId}
              onAddComment={onAddComment}
            />
          ) : (
            <p className="text-xs text-muted-foreground pt-1">Select your user profile to add comments.</p>
          )}
      </CardContent>
    </Card>
  );
}
