
"use client";

import type React from 'react';
import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ChatMessage, PollData, PollOption } from '@/lib/types';
import { MessageCircle, Send, Vote as VoteIcon, CheckSquare, BarChart3 } from 'lucide-react';
import { format, isValid, isDate } from 'date-fns';
import { cn, getAvatarData } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { CreatePollDialog } from './CreatePollDialog'; 
import { Progress } from '@/components/ui/progress'; 

interface ChatRoomProps {
  messages: ChatMessage[];
  onAddChatMessage: (messageContent: { text?: string; poll?: Omit<PollData, 'id' | 'voters'> }) => void;
  onVoteOnPoll: (messageId: string, pollId: string, optionId: string) => void;
}

export function ChatRoom({ messages, onAddChatMessage, onVoteOnPoll }: ChatRoomProps) {
  const [newMessageText, setNewMessageText] = useState('');
  const [isCreatePollDialogOpen, setIsCreatePollDialogOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessageText.trim() && user) {
      onAddChatMessage({ text: newMessageText.trim() });
      setNewMessageText('');
    }
  };

  const handleCreatePoll = (pollData: Omit<PollData, 'id' | 'voters'>) => {
    if (user) {
      onAddChatMessage({ poll: pollData });
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

  const renderPoll = (message: ChatMessage) => {
    if (!message.poll || !user) return null;
    const poll = message.poll;
    const totalVotes = poll.options.reduce((sum, option) => sum + option.votes, 0);
    const userVote = poll.voters[user.uid];

    return (
      <div className="mt-1.5 space-y-2 p-2.5 rounded-md bg-background/70 border border-border shadow-sm">
        <p className="font-semibold text-sm text-foreground">{poll.question}</p>
        <div className="space-y-1.5">
          {poll.options.map((option) => {
            const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
            const hasVotedForThisOption = userVote === option.id;
            
            const isThumbOption = option.text === '👍' || option.text === '👎';
            let buttonDisplayContent: React.ReactNode;
            let ariaLabelText: string;

            if (isThumbOption) {
                buttonDisplayContent = <span className="text-lg">{option.text}</span>;
                ariaLabelText = option.text === '👍' ? "Vote Thumbs Up" : "Vote Thumbs Down";
            } else {
                buttonDisplayContent = (
                    <span className="truncate" title={option.text}>
                        {option.text}
                    </span>
                );
                ariaLabelText = `Vote for ${option.text}`;
            }

            return (
              <div key={option.id}>
                <div className="flex items-center justify-between text-xs mb-0.5">
                  <span className={cn("font-medium", hasVotedForThisOption && "text-primary")}>{option.text}</span>
                  <span className="text-muted-foreground">{option.votes} vote(s) ({percentage.toFixed(0)}%)</span>
                </div>
                <Progress value={percentage} className="h-2 mb-1" />
                {!userVote && ( 
                  <Button
                    size="xs" 
                    variant={hasVotedForThisOption ? "default" : "outline"}
                    onClick={() => onVoteOnPoll(message.id, poll.id, option.id)}
                    className={cn("w-full h-7 text-xs flex items-center justify-center gap-1", isThumbOption && "py-0 px-2")}
                    disabled={!!userVote}
                    aria-label={ariaLabelText}
                  >
                    {hasVotedForThisOption ? <CheckSquare className="h-3.5 w-3.5 flex-shrink-0"/> : <VoteIcon className="h-3.5 w-3.5 flex-shrink-0"/>}
                    {buttonDisplayContent}
                  </Button>
                )}
                 {userVote && hasVotedForThisOption && (
                  <div className="text-xs text-primary flex items-center mt-0.5">
                    <CheckSquare className="mr-1 h-3.5 w-3.5"/> You voted for this
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {userVote && <p className="text-xs text-muted-foreground mt-1.5 text-center">You have voted in this poll.</p>}
      </div>
    );
  };


  return (
    <>
      <Card className="shadow-lg flex flex-col h-full">
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <MessageCircle className="mr-2 h-6 w-6" /> Trip Chat
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col overflow-hidden p-0">
          <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
            {messages.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No messages yet. Start the conversation or create a poll!</p>
            ) : (
              <ul className="space-y-4">
                {messages.map((msg) => {
                  const isCurrentUser = user ? msg.senderId === user.uid : false;
                  const avatarData = getAvatarData(msg.senderName);
                  const messageDate = msg.createdAt ? (msg.createdAt instanceof Date ? msg.createdAt : (msg.createdAt as any).toDate?.()) : null;

                  return (
                    <li key={msg.id} className={cn("flex gap-2.5", isCurrentUser ? "flex-row-reverse" : "flex-row")}>
                       <div className={`mt-1 w-8 h-8 rounded-full ${avatarData.bgColor} flex items-center justify-center text-white font-semibold text-xs flex-shrink-0`}>
                          {avatarData.initials}
                        </div>
                      <div className={cn(
                        "max-w-[80%] p-2 rounded-lg shadow flex flex-col", 
                        isCurrentUser ? "bg-primary text-primary-foreground rounded-br-none" : "bg-secondary text-secondary-foreground rounded-bl-none"
                      )}>
                        {!isCurrentUser && <p className="text-xs font-medium mb-0.5">{msg.senderName}</p>}
                        {msg.text && <p className="text-sm">{msg.text}</p>}
                        {msg.poll && renderPoll(msg)}
                        {messageDate && isValid(messageDate) && (
                          <p className="text-xs opacity-70 mt-1 self-end">{format(messageDate, "p")}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>
          <div className="flex gap-2 p-4 border-t items-center">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsCreatePollDialogOpen(true)}
              disabled={!user}
              aria-label="Create a new poll"
              title="Create Poll"
            >
              <BarChart3 className="h-5 w-5" />
            </Button>
            <form onSubmit={handleTextSubmit} className="flex-grow flex gap-2">
              <Input
                type="text"
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                placeholder="Type a message..."
                className="flex-grow"
                disabled={!user}
              />
              <Button type="submit" size="icon" aria-label="Send message" disabled={!user || !newMessageText.trim()}>
                <Send className="h-5 w-5" />
              </Button>
            </form>
          </div>
          {!user && <p className="text-xs text-muted-foreground px-4 pb-2">Login to send messages or create polls.</p>}
        </CardContent>
      </Card>
      {user && (
        <CreatePollDialog
          isOpen={isCreatePollDialogOpen}
          onOpenChange={setIsCreatePollDialogOpen}
          onCreatePoll={handleCreatePoll}
        />
      )}
    </>
  );
}
