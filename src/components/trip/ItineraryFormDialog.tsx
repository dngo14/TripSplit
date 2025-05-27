
"use client";

import type React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { MapPin, Home, CalendarDays, NotebookText, PlusCircle, Save, Edit3, Brain } from 'lucide-react';
import type { ItineraryItem } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { categorizeItineraryItem as aiCategorizeItineraryItem } from '@/ai/flows/categorize-itinerary-item';

interface ItineraryFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddItineraryItem: (itemData: Omit<ItineraryItem, 'id' | 'createdAt' | 'comments'>) => Promise<void>;
  itemToEdit?: ItineraryItem | null;
  onUpdateItineraryItem?: (updatedItem: ItineraryItem) => Promise<void>;
}

let isGoogleMapsScriptLoaded = false;
let autocompleteListener: google.maps.MapsEventListener | null = null;

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
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const { toast } = useToast();

  const addressInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const isEditing = !!itemToEdit;

  const resetForm = useCallback(() => {
    setPlaceName('');
    setAddress('');
    setVisitDate(new Date());
    setNotes('');
    setCategory(undefined);
    if (autocompleteRef.current && addressInputRef.current) {
        addressInputRef.current.value = '';
    }
  }, []);


  useEffect(() => {
    if (isOpen) {
      if (isEditing && itemToEdit) {
        setPlaceName(itemToEdit.placeName);
        setAddress(itemToEdit.address);
        setVisitDate(itemToEdit.visitDate instanceof Date ? itemToEdit.visitDate : (itemToEdit.visitDate as any)?.toDate?.() || new Date());
        setNotes(itemToEdit.notes || '');
        setCategory(itemToEdit.category || undefined);
        if (addressInputRef.current) addressInputRef.current.value = itemToEdit.address;
      } else {
        resetForm();
      }
    }
  }, [itemToEdit, isOpen, isEditing, resetForm]);


  const loadGoogleMapsScript = useCallback(() => {
    const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!GOOGLE_MAPS_API_KEY) {
      console.warn("Google Maps API Key (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) is missing. Address autocomplete will not function.");
      return;
    }
    if (isGoogleMapsScriptLoaded || (window as any).googleMapsScriptLoading) {
      return;
    }

    (window as any).googleMapsScriptLoading = true;
    const scriptId = 'google-maps-places-script';
    if (document.getElementById(scriptId)) {
      isGoogleMapsScriptLoaded = true;
      (window as any).googleMapsScriptLoading = false;
      return; 
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&callback=initAutocomplete`;
    script.async = true;
    script.defer = true;

    (window as any).initAutocomplete = () => {
      console.log("Google Maps Places script loaded.");
      isGoogleMapsScriptLoaded = true;
      (window as any).googleMapsScriptLoading = false;
      if (isOpen && addressInputRef.current) {
         initializeAutocompleteLogic();
      }
    };
    document.head.appendChild(script);
  }, [isOpen]); 

  const initializeAutocompleteLogic = useCallback(() => {
    if (!isGoogleMapsScriptLoaded || !window.google || !window.google.maps || !window.google.maps.places || !addressInputRef.current) {
      return;
    }

    if (autocompleteRef.current && autocompleteListener) {
        google.maps.event.removeListener(autocompleteListener);
        autocompleteListener = null;
    }
    
    autocompleteRef.current = new window.google.maps.places.Autocomplete(
      addressInputRef.current,
      { types: ['address', 'establishment'] } // Added 'establishment' for places
    );

    autocompleteListener = autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace();
      if (place) {
        if (place.formatted_address) {
          setAddress(place.formatted_address);
          if (addressInputRef.current) addressInputRef.current.value = place.formatted_address;
        }
        if (!placeName && place.name && place.name !== place.formatted_address) {
          setPlaceName(place.name);
        }
      }
    });

  }, [placeName]);


  useEffect(() => {
    loadGoogleMapsScript();
  }, [loadGoogleMapsScript]);

  useEffect(() => {
    if (isOpen && isGoogleMapsScriptLoaded && addressInputRef.current) {
        initializeAutocompleteLogic();
    }
    return () => {
      if (autocompleteListener) {
        google.maps.event.removeListener(autocompleteListener);
        autocompleteListener = null;
      }
    };
  }, [isOpen, initializeAutocompleteLogic]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!placeName.trim() || !visitDate) {
      toast({ title: "Missing fields", description: "Activity/Place name and visit date are required.", variant: "destructive" });
      return;
    }

    setIsCategorizing(true);
    let finalCategory = category; // Use existing category if editing and not changing name, or if AI fails
    
    // Only re-categorize if it's a new item or if the placeName has changed significantly (for simplicity, we re-categorize if name exists)
    if (placeName.trim()) {
        try {
          const categoryResult = await aiCategorizeItineraryItem({ description: placeName.trim() });
          finalCategory = categoryResult.category;
          toast({ title: "AI Category Suggestion", description: `Item categorized as: ${finalCategory}` });
        } catch (error) {
          console.error("AI itinerary categorization failed:", error);
          toast({ title: "AI Categorization Failed", description: "Could not automatically categorize. Defaulting to 'Other' or previous.", variant: "destructive" });
          finalCategory = finalCategory || 'Other'; // Keep existing if editing, else 'Other'
        }
    } else {
        finalCategory = finalCategory || 'Other';
    }
    setIsCategorizing(false);


    const itemData: Omit<ItineraryItem, 'id' | 'createdAt' | 'comments'> = { 
        placeName: placeName.trim(), 
        address: address.trim(), 
        visitDate, 
        notes: notes.trim(),
        category: finalCategory,
    };

    if (isEditing && itemToEdit && onUpdateItineraryItem) {
      await onUpdateItineraryItem({ ...itemToEdit, ...itemData, visitDate: visitDate as Date });
    } else {
      await onAddItineraryItem({...itemData, visitDate: visitDate as Date, comments: [] });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open && autocompleteListener) {
             if(window.google && window.google.maps) google.maps.event.removeListener(autocompleteListener); // Check for google object
             autocompleteListener = null;
        }
        onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            {isEditing ? <Edit3 className="mr-2 h-6 w-6" /> : <PlusCircle className="mr-2 h-6 w-6" />}
            {isEditing ? 'Edit Itinerary Item' : 'Add New Itinerary Item'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
          <div>
            <Label htmlFor="placeName" className="flex items-center mb-1"><MapPin className="mr-2 h-4 w-4" />Activity / Place Name</Label>
            <Input
              id="placeName"
              value={placeName}
              onChange={(e) => setPlaceName(e.target.value)}
              placeholder="e.g., Visit Eiffel Tower, Dinner at 'Le Restaurant'"
              required
            />
          </div>
          <div>
            <Label htmlFor="address" className="flex items-center mb-1"><Home className="mr-2 h-4 w-4" />Address (Optional)</Label>
            <Input
              id="address"
              ref={addressInputRef}
              defaultValue={isEditing && itemToEdit ? itemToEdit.address : address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Start typing for suggestions..."
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
                <div className="p-2 border-t">
                  <Input
                    type="time"
                    value={visitDate ? format(visitDate, "HH:mm") : ""}
                    onChange={(e) => {
                        const [hours, minutes] = e.target.value.split(':').map(Number);
                        setVisitDate(prevDate => {
                            const newDate = prevDate ? new Date(prevDate) : new Date();
                            if(!isNaN(hours) && !isNaN(minutes)) newDate.setHours(hours, minutes);
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
              placeholder="e.g., Book tickets online, check opening hours, reservation at 7 PM"
              rows={3}
            />
          </div>
          {isEditing && category && (
            <div>
              <Label className="flex items-center mb-1">Current Category</Label>
              <Input value={category} readOnly className="bg-muted cursor-not-allowed" />
              <p className="text-xs text-muted-foreground mt-1">Category will be re-evaluated by AI if you change the Activity/Place Name.</p>
            </div>
          )}
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isCategorizing}>
              {isCategorizing && <Brain className="mr-2 h-5 w-5 animate-pulse" />}
              {isCategorizing ? (isEditing ? 'Categorizing & Saving...' : 'Categorizing & Adding...') : (isEditing ? <><Save className="mr-2 h-5 w-5" /> Save Changes</> : <><PlusCircle className="mr-2 h-5 w-5" /> Add Item</>)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
