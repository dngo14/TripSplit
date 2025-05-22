"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ExpenseItem } from './ExpenseItem';
import type { Expense, Member } from '@/lib/types';
import { ListChecks } from 'lucide-react';

interface ExpenseListProps {
  expenses: Expense[];
  members: Member[];
  tripCurrency: string;
  currentUserId: string;
  onAddComment: (expenseId: string, authorId: string, text: string) => void;
}

export function ExpenseList({ expenses, members, tripCurrency, currentUserId, onAddComment }: ExpenseListProps) {
  return (
    <Card className="shadow-lg h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
          <ListChecks className="mr-2 h-6 w-6" /> Expenses
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        <ScrollArea className="h-full pr-3"> {/* Adjust height as needed, pr-3 for scrollbar */}
          {expenses.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground text-center py-10">No expenses logged yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {expenses.slice().sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((expense) => (
                <ExpenseItem 
                  key={expense.id} 
                  expense={expense} 
                  members={members} 
                  tripCurrency={tripCurrency} 
                  currentUserId={currentUserId}
                  onAddComment={onAddComment}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
