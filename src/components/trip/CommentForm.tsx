"use client";

import type React from 'react';
import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { MessageSquarePlus } from 'lucide-react';
import type { Member } from '@/lib/types';

interface CommentFormProps {
  expenseId: string;
  members: Member[]; // Needed to select current user or if comments are tied to a user
  currentUserId: string; // Assuming there's a way to know the current user
  onAddComment: (expenseId: string, authorId: string, text: string) => void;
}

export function CommentForm({ expenseId, members, currentUserId, onAddComment }: CommentFormProps) {
  const [text, setText] = useState('');
  
  const currentUser = members.find(m => m.id === currentUserId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && currentUser) {
      onAddComment(expenseId, currentUser.id, text.trim());
      setText('');
    }
  };

  if (!currentUser) {
    return <p className="text-xs text-muted-foreground">Login or select user to comment.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex gap-2">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a comment..."
        rows={1}
        className="flex-grow text-sm"
      />
      <Button type="submit" size="sm" variant="outline">
        <MessageSquarePlus className="mr-1 h-4 w-4" /> Post
      </Button>
    </form>
  );
}
