
"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { ItineraryItem } from '@/lib/types';
import { MapPin, Home, CalendarDays, NotebookText, Edit3, Trash2, MessageSquare, ExternalLink, Tag } from 'lucide-react';
import { format, isValid, isDate } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ItineraryCommentForm } from './ItineraryCommentForm';
import { getAvatarData } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';

interface ItineraryItemCardProps {
  item: ItineraryItem;
  onEdit: (item: ItineraryItem) => void;
  onDelete: (itemId: string) => void;
  onAddComment: (itineraryItemId: string, text: string) => void;
}

export function ItineraryItemCard({ item, onEdit, onDelete, onAddComment }: ItineraryItemCardProps) {
  const { user } = useAuth();

  const generateMapsLink = (platform: 'google' | 'apple') => {
    const query = encodeURIComponent(item.address || item.placeName);
    if (!query) return "#";

    if (platform === 'google') {
      return `https://www.google.com/maps/search/?api=1&query=${query}`;
    } else { // apple
      return `http://maps.apple.com/?q=${query}`;
    }
  };

  const canComment = !!user;
  const itemVisitDate = item.visitDate instanceof Date ? item.visitDate : (item.visitDate as any)?.toDate?.();
  const itemCreatedAtDate = item.createdAt instanceof Date ? item.createdAt : (item.createdAt as any)?.toDate?.();


  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg flex items-center">
            <MapPin className="mr-2 h-5 w-5 text-primary flex-shrink-0" />
            <span className="flex-grow mr-2">{item.placeName}</span>
          </CardTitle>
          <div className="flex items-center space-x-1 flex-shrink-0">
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
        <div className="flex flex-wrap gap-x-3 gap-y-1 items-center pt-1">
            <CardDescription className="text-xs flex items-center">
                <CalendarDays className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                {isDate(itemVisitDate) && isValid(itemVisitDate as Date)
                    ? format(itemVisitDate as Date, "EEE, MMM d, yyyy 'at' p")
                    : 'Date not set'}
            </CardDescription>
            {item.category && (
                <Badge variant="secondary" className="text-xs whitespace-nowrap">
                    <Tag className="mr-1 h-3 w-3"/> {item.category}
                </Badge>
            )}
        </div>
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
        {(!item.address && !item.notes && !item.category) && ( // Show if no address, notes, or category
            <p className="text-sm text-muted-foreground italic">No additional details provided.</p>
        )}

        {(item.address || item.placeName) && (
          <div className="flex items-center gap-2 pt-2">
            <Button variant="outline" size="sm" asChild className="text-xs">
              <a href={generateMapsLink('google')} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1 h-3 w-3" /> Google Maps
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild className="text-xs">
              <a href={generateMapsLink('apple')} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1 h-3 w-3" /> Apple Maps
              </a>
            </Button>
          </div>
        )}
      </CardContent>

      <CardContent className="pt-2 pb-2 border-t">
        {item.comments.length > 0 && (
          <>
            <h4 className="text-sm font-medium mb-1 flex items-center"><MessageSquare className="mr-1 h-4 w-4 text-muted-foreground" /> Comments:</h4>
            <ScrollArea className="h-[60px] p-1 rounded-md bg-muted/30 mb-2">
              <ul className="space-y-1 text-xs">
                {item.comments.map((comment) => {
                    const commentAuthorAvatar = getAvatarData(comment.authorName);
                    const commentDate = comment.createdAt ? (comment.createdAt instanceof Date ? comment.createdAt : (comment.createdAt as any).toDate?.()) : null;
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
            <ItineraryCommentForm
              itineraryItemId={item.id}
              onAddComment={onAddComment}
            />
          ) : (
            <p className="text-xs text-muted-foreground pt-1">Login to add comments.</p>
          )}
      </CardContent>

       <CardFooter className="text-xs text-muted-foreground pt-2 border-t">
        Added on: {isDate(itemCreatedAtDate) && isValid(itemCreatedAtDate as Date)
            ? format(itemCreatedAtDate as Date, "MMM d, yyyy")
            : 'Date not available'}
      </CardFooter>
    </Card>
  );
}
