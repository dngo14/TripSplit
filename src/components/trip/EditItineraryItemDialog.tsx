
"use client";
// This is essentially a wrapper around ItineraryFormDialog for editing.
// For simplicity and to avoid too much prop drilling or complex context,
// we are re-using ItineraryFormDialog logic by passing itemToEdit and onUpdateItineraryItem.

import { ItineraryFormDialog } from './ItineraryFormDialog';
import type { ItineraryItem } from '@/lib/types';

interface EditItineraryItemDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  itemToEdit: ItineraryItem | null; // Nullable, but should be provided when isOpen is true
  onUpdateItineraryItem: (updatedItem: ItineraryItem) => void;
}

export function EditItineraryItemDialog({ 
  isOpen, 
  onOpenChange, 
  itemToEdit, 
  onUpdateItineraryItem 
}: EditItineraryItemDialogProps) {
  
  if (!isOpen || !itemToEdit) {
    return null; // Don't render if not open or no item to edit
  }

  return (
    <ItineraryFormDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      // Pass a dummy function for onAddItineraryItem as it won't be used in edit mode
      onAddItineraryItem={() => { console.warn("onAddItineraryItem called in edit mode. This should not happen.")}}
      itemToEdit={itemToEdit}
      onUpdateItineraryItem={onUpdateItineraryItem}
    />
  );
}
