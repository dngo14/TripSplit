"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Settlement } from '@/lib/types';
import { Handshake, VenetianMask } from 'lucide-react'; // Using VenetianMask as placeholder for "owe"

interface SettlementSummaryProps {
  settlements: Settlement[];
  tripCurrency: string;
}

export function SettlementSummary({ settlements, tripCurrency }: SettlementSummaryProps) {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
          <Handshake className="mr-2 h-6 w-6" /> Settlement Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[150px] rounded-md border p-2 bg-muted/20">
          {settlements.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No settlements needed (or no expenses yet).</p>
          ) : (
            <ul className="space-y-2">
              {settlements.map((settlement, index) => (
                <li key={index} className="p-2 bg-background rounded-md shadow-sm text-sm">
                  <span className="font-semibold">{settlement.from}</span> owes <span className="font-semibold">{settlement.to}</span>: 
                  <span className="font-bold text-primary-foreground ml-1">{settlement.amount.toFixed(2)} {tripCurrency}</span>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
