"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Expense, Member, Comment } from '@/lib/types';
import { User, CalendarDays, Tag, MessageSquare, DollarSign, Split } from 'lucide-react';
import { format } from 'date-fns';
import { CommentForm } from './CommentForm';
import { ScrollArea } from '../ui/scroll-area';

interface ExpenseItemProps {
  expense: Expense;
  members: Member[];
  tripCurrency: string;
  currentUserId: string; // For comment form
  onAddComment: (expenseId: string, authorId: string, text: string) => void;
}

export function ExpenseItem({ expense, members, tripCurrency, currentUserId, onAddComment }: ExpenseItemProps) {
  const paidByMember = members.find(member => member.id === expense.paidById);

  const getSplitDescription = () => {
    switch (expense.splitType) {
      case 'equally':
        if (!expense.splitDetails || expense.splitDetails.length === 0) {
          return "Split equally (all)";
        }
        const involvedNames = expense.splitDetails
          .map(sd => members.find(m => m.id === sd.memberId)?.name)
          .filter(Boolean);
        if (involvedNames.length === members.length) return "Split equally (all)";
        return `Split equally (${involvedNames.length} members)`;
      case 'byAmount':
        return "Split by amount";
      case 'byPercentage':
        return "Split by percentage";
      default:
        return "Split equally (all)"; // Fallback for older data
    }
  };

  return (
    <Card className="mb-4 shadow-md hover:shadow-lg transition-shadow duration-200">
      <CardHeader>
        <CardTitle className="text-lg flex justify-between items-center">
          <span>{expense.description}</span>
          <div className="flex items-center space-x-2">
            <Badge variant={expense.category ? "secondary" : "outline"} className="text-xs whitespace-nowrap">
              {expense.category || "Uncategorized"} <Tag className="ml-1 h-3 w-3"/>
            </Badge>
             <Badge variant="outline" className="text-xs whitespace-nowrap">
              <Split className="mr-1 h-3 w-3"/> {getSplitDescription()}
            </Badge>
          </div>
        </CardTitle>
        <CardDescription className="text-xs flex flex-wrap gap-x-4 gap-y-1 pt-1">
          <span className="flex items-center"><DollarSign className="mr-1 h-3 w-3" /> {expense.amount.toFixed(2)} {tripCurrency}</span>
          {paidByMember && <span className="flex items-center"><User className="mr-1 h-3 w-3" /> Paid by: {paidByMember.name}</span>}
          <span className="flex items-center"><CalendarDays className="mr-1 h-3 w-3" /> {format(new Date(expense.date), "MMM d, yyyy")}</span>
        </CardDescription>
      </CardHeader>
      {expense.comments.length > 0 && (
        <CardContent className="pt-0 pb-2">
          <h4 className="text-sm font-medium mb-1 flex items-center"><MessageSquare className="mr-1 h-4 w-4 text-muted-foreground" /> Comments:</h4>
          <ScrollArea className="h-[60px] p-1 rounded-md bg-muted/30">
            <ul className="space-y-1 text-xs">
              {expense.comments.map((comment) => (
                <li key={comment.id} className="bg-background/50 p-1.5 rounded">
                  <strong>{comment.authorName}:</strong> {comment.text} 
                  <span className="text-muted-foreground text-[10px] ml-1">({format(new Date(comment.createdAt), "p")})</span>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </CardContent>
      )}
      <CardFooter className="pt-0">
        <CommentForm 
          expenseId={expense.id} 
          members={members} 
          currentUserId={currentUserId} 
          onAddComment={onAddComment} 
        />
      </CardFooter>
    </Card>
  );
}
