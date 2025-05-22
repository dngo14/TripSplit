"use client";

import type React from 'react';
import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ChatMessage, Member } from '@/lib/types';
import { MessageCircle, Send } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ChatRoomProps {
  messages: ChatMessage[];
  members: Member[];
  currentUserId: string;
  onSendMessage: (text: string) => void;
}

export function ChatRoom({ messages, members, currentUserId, onSendMessage }: ChatRoomProps) {
  const [newMessage, setNewMessage] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
    }
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if(scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, [messages]);


  return (
    <Card className="shadow-lg flex flex-col h-full">
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
          <MessageCircle className="mr-2 h-6 w-6" /> Trip Chat
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col overflow-hidden p-0">
        <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
          {messages.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No messages yet. Start the conversation!</p>
          ) : (
            <ul className="space-y-3">
              {messages.map((msg) => {
                const isCurrentUser = msg.senderId === currentUserId;
                return (
                  <li key={msg.id} className={cn("flex flex-col", isCurrentUser ? "items-end" : "items-start")}>
                    <div className={cn(
                      "max-w-[70%] p-2 rounded-lg shadow", 
                      isCurrentUser ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                    )}>
                      <p className="text-xs font-medium mb-0.5">{msg.senderName}</p>
                      <p className="text-sm">{msg.text}</p>
                      <p className="text-xs opacity-70 mt-0.5 text-right">{format(new Date(msg.createdAt), "p")}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
        <form onSubmit={handleSubmit} className="flex gap-2 p-4 border-t">
          <Input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-grow"
            disabled={members.length === 0 || !currentUserId}
          />
          <Button type="submit" size="icon" aria-label="Send message" disabled={members.length === 0 || !currentUserId || !newMessage.trim()}>
            <Send className="h-5 w-5" />
          </Button>
        </form>
        {(members.length === 0 || !currentUserId) && <p className="text-xs text-muted-foreground px-4 pb-2">Add members and select your user to chat.</p>}
      </CardContent>
    </Card>
  );
}
