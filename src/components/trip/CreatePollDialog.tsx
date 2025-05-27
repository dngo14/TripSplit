
"use client";

import type React from 'react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { PlusCircle, Trash2, Vote, ListPlus, MinusCircle } from 'lucide-react';
import type { PollData, PollOption } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";

interface CreatePollDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onCreatePoll: (pollData: Omit<PollData, 'id' | 'voters'>) => void;
}

type PollType = "thumbs" | "custom";

export function CreatePollDialog({ isOpen, onOpenChange, onCreatePoll }: CreatePollDialogProps) {
  const [question, setQuestion] = useState('');
  const [pollType, setPollType] = useState<PollType>('thumbs');
  const [customOptions, setCustomOptions] = useState<string[]>(['', '']); // Start with 2 empty options for custom
  const { toast } = useToast();

  const handleAddOption = () => {
    if (customOptions.length < 10) { // Limit number of options
      setCustomOptions([...customOptions, '']);
    } else {
      toast({ title: "Option Limit Reached", description: "You can add a maximum of 10 options.", variant: "destructive" });
    }
  };

  const handleRemoveOption = (index: number) => {
    if (customOptions.length > 2) { // Keep at least 2 options
      const newOptions = customOptions.filter((_, i) => i !== index);
      setCustomOptions(newOptions);
    } else {
      toast({ title: "Minimum Options Required", description: "A poll must have at least 2 options.", variant: "destructive" });
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...customOptions];
    newOptions[index] = value;
    setCustomOptions(newOptions);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      toast({ title: "Poll Question Required", description: "Please enter a question for your poll.", variant: "destructive" });
      return;
    }

    let optionsData: Omit<PollOption, 'id' | 'votes'>[] = [];

    if (pollType === 'thumbs') {
      optionsData = [
        { text: '👍' }, // Just the emoji
        { text: '👎' }, // Just the emoji
      ];
    } else { // custom
      const filledOptions = customOptions.map(opt => opt.trim()).filter(opt => opt !== '');
      if (filledOptions.length < 2) {
        toast({ title: "Minimum Options Required", description: "Please provide at least two distinct options for a custom poll.", variant: "destructive" });
        return;
      }
      if (new Set(filledOptions).size !== filledOptions.length) {
        toast({ title: "Duplicate Options", description: "Please ensure all custom options are unique.", variant: "destructive"});
        return;
      }
      optionsData = filledOptions.map(optText => ({ text: optText }));
    }

    const finalOptions = optionsData.map(opt => ({
      ...opt,
      id: crypto.randomUUID(),
      votes: 0,
    }));
    
    onCreatePoll({ question: question.trim(), options: finalOptions });
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setQuestion('');
    setPollType('thumbs');
    setCustomOptions(['', '']);
  }

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center"><Vote className="mr-2 h-6 w-6" /> Create New Poll</DialogTitle>
          <DialogDescription>
            Ask a question and let your trip members vote.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4 overflow-y-auto pr-2">
          <div>
            <Label htmlFor="pollQuestion" className="font-semibold">Poll Question</Label>
            <Input
              id="pollQuestion"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., Where should we go for dinner tonight?"
              required
              className="mt-1"
            />
          </div>

          <div>
            <Label className="font-semibold">Poll Type</Label>
            <RadioGroup value={pollType} onValueChange={(value) => setPollType(value as PollType)} className="mt-1 grid grid-cols-2 gap-2">
              <Label htmlFor="type-thumbs" className="flex items-center space-x-2 p-2 border rounded-md cursor-pointer hover:bg-accent/50 has-[input:checked]:bg-accent has-[input:checked]:text-accent-foreground">
                <RadioGroupItem value="thumbs" id="type-thumbs" />
                <span>👍👎 Thumbs</span>
              </Label>
              <Label htmlFor="type-custom" className="flex items-center space-x-2 p-2 border rounded-md cursor-pointer hover:bg-accent/50 has-[input:checked]:bg-accent has-[input:checked]:text-accent-foreground">
                <RadioGroupItem value="custom" id="type-custom" />
                <span>Custom Options</span>
              </Label>
            </RadioGroup>
          </div>

          {pollType === 'custom' && (
            <div className="space-y-2">
              <Label className="font-semibold">Custom Options (min. 2)</Label>
              {customOptions.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    required
                  />
                  {customOptions.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveOption(index)}
                      aria-label="Remove option"
                      className="text-destructive hover:text-destructive"
                    >
                      <MinusCircle className="h-5 w-5" />
                    </Button>
                  )}
                </div>
              ))}
              {customOptions.length < 10 && (
                <Button type="button" variant="outline" size="sm" onClick={handleAddOption} className="mt-2 text-sm w-full sm:w-auto">
                  <ListPlus className="mr-1 h-4 w-4" /> Add Option
                </Button>
              )}
            </div>
          )}
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => handleDialogClose(false)}>Cancel</Button>
            <Button type="submit">
              <PlusCircle className="mr-2 h-5 w-5" /> Create Poll
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
