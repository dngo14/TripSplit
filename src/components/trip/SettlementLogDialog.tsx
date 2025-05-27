
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Expense, Member } from '@/lib/types';
import { History, Landmark, User, CalendarDays, Tag, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle as LogCardTitle } from '../ui/card';
import { Button } from '@/components/ui/button';
import { format, isValid, isDate } from 'date-fns';
import type { Timestamp } from 'firebase/firestore';
import { Badge } from '../ui/badge';
import { getAvatarData } from '@/lib/utils';

interface SettlementLogDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  expenses: Expense[];
  tripCurrency: string;
  members: Member[];
}

const PAYMENTS_PER_LOG_PAGE = 5;

export function SettlementLogDialog({
  isOpen,
  onOpenChange,
  expenses,
  tripCurrency,
  members
}: SettlementLogDialogProps) {
  const [currentPaymentLogPage, setCurrentPaymentLogPage] = useState(1);

  const sortedPaymentExpenses = useMemo(() => {
    return (expenses || []) // Fallback to empty array if expenses is undefined
      .filter(exp => exp.category === "Settlement Payment")
      .sort((a, b) => {
        const dateAVal = a.createdAt;
        const dateBVal = b.createdAt;
        const dateA = dateAVal instanceof Date ? dateAVal.getTime() : (typeof (dateAVal as any)?.toDate === 'function' ? (dateAVal as any).toDate().getTime() : 0);
        const dateB = dateBVal instanceof Date ? dateBVal.getTime() : (typeof (dateBVal as any)?.toDate === 'function' ? (dateBVal as any).toDate().getTime() : 0);
        return dateB - dateA;
      });
  }, [expenses]);

  const totalPaymentLogPages = useMemo(() => {
    return Math.ceil((sortedPaymentExpenses.length || 0) / PAYMENTS_PER_LOG_PAGE);
  }, [sortedPaymentExpenses]);

  const paginatedPaymentExpenses = useMemo(() => {
    const startIndex = (currentPaymentLogPage - 1) * PAYMENTS_PER_LOG_PAGE;
    const endIndex = startIndex + PAYMENTS_PER_LOG_PAGE;
    return sortedPaymentExpenses.slice(startIndex, endIndex);
  }, [sortedPaymentExpenses, currentPaymentLogPage]);

  useEffect(() => {
    if (isOpen) {
      setCurrentPaymentLogPage(1); 
    }
  }, [isOpen]);

   useEffect(() => {
    if (currentPaymentLogPage > totalPaymentLogPages && totalPaymentLogPages > 0) {
        setCurrentPaymentLogPage(totalPaymentLogPages);
    } else if (currentPaymentLogPage <= 0 && totalPaymentLogPages > 0) { 
        setCurrentPaymentLogPage(1);
    } else if (sortedPaymentExpenses.length > 0 && paginatedPaymentExpenses.length === 0 && currentPaymentLogPage > 1) {
      setCurrentPaymentLogPage(totalPaymentLogPages > 0 ? totalPaymentLogPages : 1);
    } else if (totalPaymentLogPages === 0 && sortedPaymentExpenses.length === 0) { 
      setCurrentPaymentLogPage(1);
    }
  }, [currentPaymentLogPage, totalPaymentLogPages, sortedPaymentExpenses, paginatedPaymentExpenses]);


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b flex-shrink-0">
          <DialogTitle className="flex items-center text-xl">
            <History className="mr-2 h-6 w-6" /> Payment Log
          </DialogTitle>
          <DialogDescription>
            This log shows recorded payments made to settle debts between trip members.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 min-h-0 overflow-y-auto"> {/* Ensure this handles overflow and flex properties */}
          <div className="p-6 pt-4 space-y-3"> {/* Content padding moved here */}
            {paginatedPaymentExpenses.length === 0 ? (
              <div className="text-muted-foreground text-center py-6">
                {sortedPaymentExpenses.length === 0 ? "No settlement payments recorded yet." : "No payments on this page."}
              </div>
            ) : (
              <>
                {paginatedPaymentExpenses.map((payment) => {
                  let paymentDate: Date | null = null;
                  const rawDate = payment.date; 
                  if (rawDate instanceof Date) {
                    paymentDate = rawDate;
                  } else if (rawDate && typeof (rawDate as unknown as Timestamp).toDate === 'function') {
                    paymentDate = (rawDate as unknown as Timestamp).toDate();
                  }

                  const payer = members.find(m => m.id === payment.paidById);
                  const avatarData = getAvatarData(payer?.name);
                  const recipientDetail = payment.splitDetails?.find(sd => sd.amount && sd.amount > 0);
                  const recipient = recipientDetail ? members.find(m => m.id === recipientDetail.memberId) : null;

                  return (
                      <Card key={payment.id} className="shadow-sm">
                          <CardHeader className="pb-2 pt-3 px-4">
                              <LogCardTitle className="text-sm font-semibold flex items-center justify-between">
                                  <span className="flex items-center gap-2">
                                      <Landmark className="h-4 w-4 text-primary"/>
                                      {payment.description || "Settlement Payment"}
                                  </span>
                                  <Badge variant="secondary" className="text-xs">{payment.amount.toFixed(2)} {tripCurrency}</Badge>
                              </LogCardTitle>
                              <div className="text-xs text-muted-foreground pt-0.5 flex items-center gap-2">
                                <CalendarDays className="h-3 w-3" />
                                {paymentDate && isValid(paymentDate) && isDate(paymentDate) ? format(paymentDate, "MMM d, yyyy, p") : 'Date not available'}
                              </div>
                          </CardHeader>
                          <CardContent className="px-4 pb-3 text-xs space-y-1">
                              {payer && (
                                <div className="flex items-center">
                                  <div className={`w-4 h-4 rounded-full ${avatarData.bgColor} flex items-center justify-center text-white font-semibold text-[10px] mr-1.5 flex-shrink-0`}>
                                    {avatarData.initials}
                                  </div>
                                  Paid by: <span className="font-medium ml-1">{payer.name}</span>
                                </div>
                              )}
                              {recipient && (
                                 <div className="flex items-center">
                                   <User className="mr-1 h-3 w-3 text-muted-foreground"/> To: <span className="font-medium ml-1">{recipient.name}</span>
                                 </div>
                              )}
                               <div className="flex items-center"><Tag className="mr-1 h-3 w-3"/>Category: <Badge variant="outline" className="ml-1 text-xs">{payment.category}</Badge></div>
                          </CardContent>
                      </Card>
                  )
                })}
              </>
            )}
          </div>
        </ScrollArea>
        
        {totalPaymentLogPages > 1 && (
          <div className="p-4 border-t flex-shrink-0 flex justify-center items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPaymentLogPage(p => Math.max(1, p - 1))}
              disabled={currentPaymentLogPage <= 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPaymentLogPage} of {totalPaymentLogPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPaymentLogPage(p => Math.min(totalPaymentLogPages, p + 1))}
              disabled={currentPaymentLogPage >= totalPaymentLogPages}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
