
"use client";

import type React from 'react';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserPlus, Users, X, AtSign, ShieldAlert } from 'lucide-react';
import type { Member } from '@/lib/types';
import { getAvatarData } from '@/lib/utils';
import { Label } from '@/components/ui/label';

interface MemberManagerProps {
  members: Member[];
  onAddMember: (name: string, email?: string) => void;
  onRemoveMember: (id: string) => void;
  isCreator: boolean; // New prop
}

export function MemberManager({ members, onAddMember, onRemoveMember, isCreator }: MemberManagerProps) {
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');

  const handleAddMemberToList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCreator) return; // Should be caught by disabled button, but good to have
    if (newMemberName.trim()) {
      onAddMember(newMemberName.trim(), newMemberEmail.trim() || undefined);
      setNewMemberName('');
      setNewMemberEmail('');
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
          <Users className="mr-2 h-6 w-6" /> Trip Members & Invites
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isCreator ? (
          <form onSubmit={handleAddMemberToList} className="space-y-3 mb-4">
            <div className="flex gap-2 items-end">
              <div className="flex-grow">
                <Label htmlFor="newMemberName" className="text-xs mb-1 block">Member's Display Name*</Label>
                <Input
                  id="newMemberName"
                  type="text"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="Enter name for display"
                  required
                  disabled={!isCreator}
                />
              </div>
              <Button type="submit" size="icon" aria-label="Add member to list" className="shrink-0" disabled={!isCreator}>
                <UserPlus className="h-5 w-5" />
              </Button>
            </div>
            <div>
              <Label htmlFor="newMemberEmail" className="text-xs mb-1 block">Member's Email (Optional, for granting edit access)</Label>
              <div className="relative flex items-center">
                  <AtSign className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                      id="newMemberEmail"
                      type="email"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      placeholder="name@example.com (if they have an account)"
                      className="pl-8"
                      disabled={!isCreator}
                  />
              </div>
              <p className="text-xs text-muted-foreground mt-1">If the email matches a registered user, they'll gain edit access. Otherwise, they're added for display.</p>
            </div>
          </form>
        ) : (
          <div className="mb-4 p-3 bg-muted/50 rounded-md text-sm text-muted-foreground flex items-center">
            <ShieldAlert className="mr-2 h-5 w-5 text-primary" />
            Only the trip creator can add or remove members.
          </div>
        )}
        <ScrollArea className="h-[150px] rounded-md border p-2 bg-muted/20">
          {members.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No members yet. {isCreator ? "Add some!" : "The trip creator can add members."}</p>
          ) : (
            <ul className="space-y-2">
              {members.map((member) => {
                const { initials, bgColor } = getAvatarData(member.name);
                return (
                  <li key={member.id} className="flex items-center justify-between p-2 bg-background rounded-md shadow-sm">
                    <div className="flex items-center overflow-hidden">
                      <div className={`w-8 h-8 rounded-full ${bgColor} flex items-center justify-center text-white font-semibold text-sm mr-3 flex-shrink-0`}>
                        {initials}
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="truncate font-medium">{member.name}</span>
                        {member.email && <span className="text-xs text-muted-foreground truncate">{member.email}</span>}
                      </div>
                    </div>
                    {isCreator && (
                      <Button variant="ghost" size="icon" onClick={() => onRemoveMember(member.id)} aria-label={`Remove ${member.name}`} className="ml-2 flex-shrink-0">
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
