
"use client";

import type React from 'react';
import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { MessageSquarePlus } from 'lucide-react';
import type { Member } from '@/lib/types';
import { getAvatarData } from '@/lib/utils'; // Import the avatar utility

interface CommentFormProps {
  expenseId: string;
  members: Member[]; 
  currentUserId: string; 
  onAddComment: (expenseId: string, authorId: string, text: string) => void;
}

export function CommentForm({ expenseId, members, currentUserId, onAddComment }: CommentFormProps) {
  const [text, setText] = useState('');
  
  const currentUser = members.find(m => m.id === currentUserId);
  const avatarData = getAvatarData(currentUser?.name);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && currentUser) {
      onAddComment(expenseId, currentUser.id, text.trim());
      setText('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex gap-2 items-start"> {/* items-start for alignment */}
      {currentUser && (
         <div className={`mt-1.5 w-7 h-7 rounded-full ${avatarData.bgColor} flex items-center justify-center text-white font-semibold text-xs flex-shrink-0`}>
            {avatarData.initials}
          </div>
      )}
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a comment..."
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
