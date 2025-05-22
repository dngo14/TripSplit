
"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ItineraryItemCard } from './ItineraryItemCard'; // Renamed from ItineraryItem
import type { ItineraryItem } from '@/lib/types';
import { MapPin, CalendarSearch } from 'lucide-react';

interface ItineraryListProps {
  itineraryItems: ItineraryItem[];
  onEditItem: (item: ItineraryItem) => void;
  onDeleteItem: (itemId: string) => void;
}

export function ItineraryList({ itineraryItems, onEditItem, onDeleteItem }: ItineraryListProps) {
  const sortedItems = [...itineraryItems].sort((a,b) => new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime());

  return (
    <Card className="shadow-lg h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
          <MapPin className="mr-2 h-6 w-6" /> Trip Itinerary
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        <ScrollArea className="h-[600px] pr-3"> {/* Adjusted height */}
          {sortedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-10">
              <CalendarSearch className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg">Your itinerary is empty.</p>
              <p className="text-sm text-muted-foreground">Add places you plan to visit!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedItems.map((item) => (
                <ItineraryItemCard 
                  key={item.id} 
                  item={item} 
                  onEdit={onEditItem}
                  onDelete={onDeleteItem}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
