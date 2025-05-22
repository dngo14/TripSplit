
"use client";

import type React from 'react';
import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ChatMessage, Member } from '@/lib/types';
import { MessageCircle, Send } from 'lucide-react';
import { format, isValid, isDate } from 'date-fns'; // Import isValid and isDate
import { cn, getAvatarData } from '@/lib/utils';

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
            <ul className="space-y-4"> {/* Increased spacing for avatar */}
              {messages.map((msg) => {
                const isCurrentUser = msg.senderId === currentUserId;
                const senderMember = members.find(m => m.id === msg.senderId);
                const avatarData = getAvatarData(senderMember?.name);
                const messageDate = msg.createdAt ? (msg.createdAt instanceof Date ? msg.createdAt : (msg.createdAt as any).toDate?.()) : null;

                return (
                  <li key={msg.id} className={cn("flex gap-2.5", isCurrentUser ? "flex-row-reverse" : "flex-row")}>
                     <div className={`mt-1 w-8 h-8 rounded-full ${avatarData.bgColor} flex items-center justify-center text-white font-semibold text-xs flex-shrink-0`}>
                        {avatarData.initials}
                      </div>
                    <div className={cn(
                      "max-w-[70%] p-2 rounded-lg shadow flex flex-col",
                      isCurrentUser ? "bg-primary text-primary-foreground rounded-br-none" : "bg-secondary text-secondary-foreground rounded-bl-none"
                    )}>
                      {!isCurrentUser && <p className="text-xs font-medium mb-0.5">{msg.senderName}</p>}
                      <p className="text-sm">{msg.text}</p>
                      {/* Updated date formatting to be more robust */}
                      {messageDate && isValid(messageDate) && (
                        <p className="text-xs opacity-70 mt-0.5 self-end">{format(messageDate, "p")}</p>
                      )}
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
