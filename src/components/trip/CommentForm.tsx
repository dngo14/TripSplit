
"use client";

import type React from 'react';
import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { MessageSquarePlus } from 'lucide-react';
import { getAvatarData } from '@/lib/utils'; 
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth

interface CommentFormProps {
  expenseId: string;
  onAddComment: (expenseId: string, text: string) => void;
}

export function CommentForm({ expenseId, onAddComment }: CommentFormProps) {
  const [text, setText] = useState('');
  const { user } = useAuth(); // Get logged-in user
  
  // Avatar is now for the logged-in user
  const avatarData = getAvatarData(user?.displayName || user?.email?.split('@')[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && user) { // Check if user is logged in
      onAddComment(expenseId, text.trim());
      setText('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex gap-2 items-start">
      {user && ( // Only show avatar if user is logged in
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
        disabled={!user} // Disable if no user logged in
      />
      <Button type="submit" size="sm" variant="outline" disabled={!text.trim() || !user}>
        <MessageSquarePlus className="mr-1 h-4 w-4" /> Post
      </Button>
    </form>
  );
}
