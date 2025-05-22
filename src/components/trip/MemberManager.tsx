"use client";

import type React from 'react';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserPlus, Users, X } from 'lucide-react';
import type { Member } from '@/lib/types';

interface MemberManagerProps {
  members: Member[];
  onAddMember: (name: string) => void;
  onRemoveMember: (id: string) => void;
}

export function MemberManager({ members, onAddMember, onRemoveMember }: MemberManagerProps) {
  const [newMemberName, setNewMemberName] = useState('');

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMemberName.trim()) {
      onAddMember(newMemberName.trim());
      setNewMemberName('');
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
          <Users className="mr-2 h-6 w-6" /> Trip Members
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAddMember} className="flex gap-2 mb-4">
          <Input
            type="text"
            value={newMemberName}
            onChange={(e) => setNewMemberName(e.target.value)}
            placeholder="New member name"
            className="flex-grow"
          />
          <Button type="submit" size="icon" aria-label="Add member">
            <UserPlus className="h-5 w-5" />
          </Button>
        </form>
        <ScrollArea className="h-[150px] rounded-md border p-2 bg-muted/20">
          {members.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No members yet. Add some!</p>
          ) : (
            <ul className="space-y-2">
              {members.map((member) => (
                <li key={member.id} className="flex items-center justify-between p-2 bg-background rounded-md shadow-sm">
                  <span>{member.name}</span>
                  <Button variant="ghost" size="icon" onClick={() => onRemoveMember(member.id)} aria-label={`Remove ${member.name}`}>
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
