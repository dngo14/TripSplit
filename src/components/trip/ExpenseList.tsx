
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ExpenseItem } from './ExpenseItem';
import type { Expense, Member } from '@/lib/types';
import { ListChecks, ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExpenseListProps {
  expenses: Expense[]; 
  members: Member[];
  tripCurrency: string;
  // currentUserId prop removed, onAddComment signature changed
  onAddComment: (expenseId: string, text: string) => void;
  onDeleteExpense: (expenseId: string) => void;
  onEditExpense: (expense: Expense) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function ExpenseList({ 
  expenses, 
  members, 
  tripCurrency, 
  onAddComment, 
  onDeleteExpense, 
  onEditExpense,
  currentPage,
  totalPages,
  onPageChange
}: ExpenseListProps) {
  
  return (
    <Card className="shadow-xl rounded-lg flex-1 flex flex-col bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center text-xl text-card-foreground">
          <ShoppingBag className="mr-2 h-6 w-6 text-primary" /> Trip Expenses
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden p-4">
        <ScrollArea className="h-full pr-2"> 
          {expenses.length === 0 && currentPage === 1 ? ( 
            <div className="flex flex-col items-center justify-center h-full text-center py-10">
              <ListChecks className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg">No expenses logged yet.</p>
              <p className="text-sm text-muted-foreground">Add expenses using the "Add New Expense" button.</p>
            </div>
          ) : expenses.length === 0 && currentPage > 1 ? (
             <div className="flex flex-col items-center justify-center h-full text-center py-10">
              <ListChecks className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg">No expenses on this page.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {expenses.map((expense) => ( 
                <ExpenseItem
                  key={expense.id}
                  expense={expense}
                  members={members}
                  tripCurrency={tripCurrency}
                  onAddComment={onAddComment} // Pass updated onAddComment
                  onDeleteExpense={onDeleteExpense}
                  onEditExpense={onEditExpense}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
      {totalPages > 1 && (
        <CardFooter className="border-t pt-4 flex justify-center items-center gap-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
