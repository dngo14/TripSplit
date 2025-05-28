
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ItineraryItemCard } from './ItineraryItemCard';
import type { ItineraryItem } from '@/lib/types';
import { MapPin, CalendarSearch, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface ItineraryListProps {
  itineraryItems: ItineraryItem[];
  onEditItem: (item: ItineraryItem) => void;
  onDeleteItem: (itemId: string) => void;
  onAddComment: (itineraryItemId: string, text: string) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export function ItineraryList({ 
  itineraryItems, 
  onEditItem, 
  onDeleteItem, 
  onAddComment,
  currentPage,
  totalPages,
  onPageChange,
  categories,
  selectedCategory,
  onCategoryChange
}: ItineraryListProps) {
  
  const displayedItems = itineraryItems;

  return (
    <Card className="shadow-lg h-full flex flex-col bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <CardTitle className="flex items-center text-xl">
            <MapPin className="mr-2 h-6 w-6" /> Trip Itinerary
            </CardTitle>
            {categories.length > 0 && (
                <div className="w-full sm:w-auto sm:max-w-[200px]">
                    <Label htmlFor="itineraryCategoryFilter" className="text-xs text-muted-foreground flex items-center mb-0.5"><Filter className="mr-1 h-3 w-3"/>Filter by Category</Label>
                    <Select value={selectedCategory} onValueChange={onCategoryChange}>
                        <SelectTrigger id="itineraryCategoryFilter" className="h-9 text-sm">
                            <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All" className="text-sm">All Categories</SelectItem>
                            {categories.map(category => (
                                <SelectItem key={category} value={category} className="text-sm">{category}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-4"> {/* Removed overflow-hidden and internal ScrollArea */}
          {displayedItems.length === 0 && currentPage === 1 && selectedCategory === "All" ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-10">
              <CalendarSearch className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg">Your itinerary is empty.</p>
              <p className="text-sm text-muted-foreground">Add places you plan to visit!</p>
            </div>
          ) : displayedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-10">
              <CalendarSearch className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg">
                {selectedCategory === "All" ? "No itinerary items on this page." : `No items found for category: "${selectedCategory}".`}
              </p>
               {selectedCategory !== "All" && <Button variant="link" onClick={() => onCategoryChange("All")}>Show all categories</Button>}
            </div>
          ) : (
            <div className="space-y-4">
              {displayedItems.map((item) => (
                <ItineraryItemCard 
                  key={item.id} 
                  item={item} 
                  onEdit={onEditItem}
                  onDelete={onDeleteItem}
                  onAddComment={onAddComment}
                />
              ))}
            </div>
          )}
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

