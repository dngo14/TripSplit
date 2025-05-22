
"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { ItineraryItem } from '@/lib/types';
import { MapPin, Home, CalendarDays, NotebookText, Edit3, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface ItineraryItemCardProps {
  item: ItineraryItem;
  onEdit: (item: ItineraryItem) => void;
  onDelete: (itemId: string) => void;
}

export function ItineraryItemCard({ item, onEdit, onDelete }: ItineraryItemCardProps) {
  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg flex items-center">
            <MapPin className="mr-2 h-5 w-5 text-primary" />
            {item.placeName}
          </CardTitle>
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(item)}>
              <Edit3 className="h-4 w-4" />
              <span className="sr-only">Edit item</span>
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(item.id)}>
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete item</span>
            </Button>
          </div>
        </div>
        <CardDescription className="text-xs flex items-center pt-1">
          <CalendarDays className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
          {format(new Date(item.visitDate), "EEE, MMM d, yyyy 'at' p")}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-0 pb-3 space-y-2">
        {item.address && (
          <div className="flex items-start text-sm">
            <Home className="mr-2 h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-muted-foreground">{item.address}</p>
          </div>
        )}
        {item.notes && (
          <div className="flex items-start text-sm">
            <NotebookText className="mr-2 h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="whitespace-pre-wrap">{item.notes}</p>
          </div>
        )}
        {!item.address && !item.notes && (
            <p className="text-sm text-muted-foreground italic">No additional details provided.</p>
        )}
      </CardContent>
       <CardFooter className="text-xs text-muted-foreground pt-2 border-t">
        Added on: {format(new Date(item.createdAt), "MMM d, yyyy")}
      </CardFooter>
    </Card>
  );
}
