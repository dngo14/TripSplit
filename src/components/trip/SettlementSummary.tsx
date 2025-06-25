
"use client";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Settlement, Member } from '@/lib/types'; 
import { Handshake, Landmark, History } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth


interface SettlementSummaryProps {
  settlements: Settlement[];
  tripCurrency: string;
  onRecordPayment: (settlement: Settlement) => void; 
  onViewPaymentLog: () => void; 
  members: Member[]; 
  // currentUserId prop removed, will use useAuth
}

export function SettlementSummary({
  settlements,
  tripCurrency,
  onRecordPayment,
  onViewPaymentLog,
  members,
}: SettlementSummaryProps) {
  const { user } = useAuth(); // Get logged-in user
  const canTakeAction = !!user; // User can take action if logged in

  const handleViewLogClick = () => {
    onViewPaymentLog();
  };

  return (
    <Card className="shadow-xl rounded-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
          <Handshake className="mr-2 h-6 w-6 text-primary" /> Outstanding Settlements
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[150px] rounded-md border p-2 bg-muted/10">
          {settlements.length === 0 ? (
            <p className="text-foreground/60 text-center py-4">All settled up!</p>
          ) : (
            <ul className="space-y-2">
              {settlements.map((settlement, index) => (
                <li key={index} className="p-2 bg-card rounded-md shadow-sm text-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-y-1 sm:gap-x-2 border">
                  <div className="flex-grow min-w-0 text-foreground"> 
                    <span className="font-semibold">{settlement.from}</span> owes <span className="font-semibold">{settlement.to}</span>:
                    <span className="font-bold text-primary ml-1 inline-block break-all">
                        {settlement.amount.toFixed(2)} {tripCurrency}
                    </span>
                  </div>
                  <TooltipProvider delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm" 
                          onClick={() => onRecordPayment(settlement)}
                          disabled={!canTakeAction || !user || settlement.fromId !== user.uid} // Check against logged-in user's UID
                          className="w-full sm:w-auto text-xs flex-shrink-0 px-2.5 py-1.5 h-auto whitespace-normal" 
                          title={
                            !canTakeAction ? "Login to record payments." :
                            (user && settlement.fromId !== user.uid) ? "Only the person who owes can record this payment." :
                            "Record this payment"
                          }
                        >
                          Settle
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Record this payment to settle the debt.</p>
                        {!canTakeAction && <p className="text-destructive">Login to record payments.</p>}
                        {canTakeAction && user && settlement.fromId !== user.uid && <p className="text-destructive">Only the person who owes can record this payment.</p>}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </CardContent>
       <CardFooter className="pt-3 flex flex-col sm:flex-row gap-2 justify-center border-t">
        <p className="text-xs text-foreground/50 text-center flex-grow mb-2 sm:mb-0 sm:mr-2">
          Recording a payment will add a "Settlement Payment" expense.
        </p>
        <Button onClick={handleViewLogClick} variant="outline" size="sm" className="w-full sm:w-auto">
          <History className="mr-1 h-4 w-4" /> View Payment Log
        </Button>
      </CardFooter>
    </Card>
  );
}
 
