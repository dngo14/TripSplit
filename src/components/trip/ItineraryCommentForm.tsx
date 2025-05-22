
"use client";

import type React from 'react';
import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { MessageSquarePlus } from 'lucide-react';
import type { Member } from '@/lib/types';
import { getAvatarData } from '@/lib/utils';

interface ItineraryCommentFormProps {
  itineraryItemId: string;
  members: Member[]; 
  currentUserId: string; 
  onAddComment: (itineraryItemId: string, authorId: string, text: string) => void;
}

export function ItineraryCommentForm({ itineraryItemId, members, currentUserId, onAddComment }: ItineraryCommentFormProps) {
  const [text, setText] = useState('');
  
  const currentUser = members.find(m => m.id === currentUserId);
  const avatarData = getAvatarData(currentUser?.name);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && currentUser) {
      onAddComment(itineraryItemId, currentUser.id, text.trim());
      setText('');
    }
  };

  if (!currentUser) {
    return <p className="text-xs text-muted-foreground pt-1">Select your user profile to add comments.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex gap-2 items-start">
      {currentUser && (
         <div className={`mt-1.5 w-7 h-7 rounded-full ${avatarData.bgColor} flex items-center justify-center text-white font-semibold text-xs flex-shrink-0`}>
            {avatarData.initials}
          </div>
      )}
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a comment about this place..."
        rows={1}
        className="flex-grow text-sm"
        disabled={!currentUser}
      />
      <Button type="submit" size="sm" variant="outline" disabled={!text.trim() || !currentUser}>
        <MessageSquarePlus className="mr-1 h-4 w-4" /> Post
      </Button>
    </form>
  );
}
