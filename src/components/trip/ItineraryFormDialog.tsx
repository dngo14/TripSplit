
"use client";

import type React from 'react'; // Keep this for type-only imports if needed elsewhere
import { useState, useEffect } from 'react'; // Import useEffect directly
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { MapPin, Home, CalendarDays, NotebookText, PlusCircle, Save, Edit3 } from 'lucide-react'; // Added Edit3
import type { ItineraryItem } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";

interface ItineraryFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddItineraryItem: (itemData: Omit<ItineraryItem, 'id' | 'createdAt'>) => void;
  itemToEdit?: ItineraryItem; // Optional: for editing
  onUpdateItineraryItem?: (updatedItem: ItineraryItem) => void; // Optional: for editing
}

export function ItineraryFormDialog({
  isOpen,
  onOpenChange,
  onAddItineraryItem,
  itemToEdit,
  onUpdateItineraryItem
}: ItineraryFormDialogProps) {
  const [placeName, setPlaceName] = useState('');
  const [address, setAddress] = useState('');
  const [visitDate, setVisitDate] = useState<Date | undefined>(new Date());
  const [notes, setNotes] = useState('');
  const { toast } = useToast();

  const isEditing = !!itemToEdit;

  useEffect(() => {
    if (isEditing && itemToEdit) {
      setPlaceName(itemToEdit.placeName);
      setAddress(itemToEdit.address);
      setVisitDate(new Date(itemToEdit.visitDate));
      setNotes(itemToEdit.notes);
    } else {
      // Reset form for adding
      setPlaceName('');
      setAddress('');
      setVisitDate(new Date());
      setNotes('');
    }
  }, [itemToEdit, isOpen, isEditing]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!placeName.trim() || !visitDate) {
      toast({ title: "Missing fields", description: "Place name and visit date are required.", variant: "destructive" });
      return;
    }

    const itemData = { placeName, address, visitDate, notes };

    if (isEditing && itemToEdit && onUpdateItineraryItem) {
      onUpdateItineraryItem({ ...itemToEdit, ...itemData });
    } else {
      onAddItineraryItem(itemData);
    }

    // Reset form fields after successful submission
    if (!isEditing) { // Only reset if adding, not editing (dialog closes on edit)
        setPlaceName('');
        setAddress('');
        setVisitDate(new Date());
        setNotes('');
    }
    // onOpenChange(false); // Dialog will be closed by parent component
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            {isEditing ? <Edit3 className="mr-2 h-6 w-6" /> : <PlusCircle className="mr-2 h-6 w-6" />} {/* Changed CalendarPlus to PlusCircle for consistency with PRD, and Edit3 for editing */}
            {isEditing ? 'Edit Itinerary Item' : 'Add New Itinerary Item'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
          <div>
            <Label htmlFor="placeName" className="flex items-center mb-1"><MapPin className="mr-2 h-4 w-4" />Place Name</Label>
            <Input
              id="placeName"
              value={placeName}
              onChange={(e) => setPlaceName(e.target.value)}
              placeholder="e.g., Eiffel Tower, Local Museum"
              required
            />
          </div>
          <div>
            <Label htmlFor="address" className="flex items-center mb-1"><Home className="mr-2 h-4 w-4" />Address (Optional)</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g., Champ de Mars, 5 Av. Anatole France"
            />
          </div>
          <div>
            <Label htmlFor="visitDate" className="flex items-center mb-1"><CalendarDays className="mr-2 h-4 w-4" />Visit Date & Time</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="visitDate"
                  variant={"outline"}
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {visitDate ? format(visitDate, "PPP p") : <span>Pick a date and time</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={visitDate}
                  onSelect={setVisitDate}
                  initialFocus
                />
                {/* Basic time input, can be improved with a dedicated time picker */}
                <div className="p-2 border-t">
                  <Input
                    type="time"
                    value={visitDate ? format(visitDate, "HH:mm") : ""}
                    onChange={(e) => {
                        const [hours, minutes] = e.target.value.split(':').map(Number);
                        setVisitDate(prevDate => {
                            const newDate = prevDate ? new Date(prevDate) : new Date();
                            newDate.setHours(hours, minutes);
                            return newDate;
                        });
                    }}
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label htmlFor="notes" className="flex items-center mb-1"><NotebookText className="mr-2 h-4 w-4" />Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Book tickets online, check opening hours"
              rows={3}
            />
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">
              {isEditing ? <><Save className="mr-2 h-5 w-5" /> Save Changes</> : <><PlusCircle className="mr-2 h-5 w-5" /> Add Item</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
