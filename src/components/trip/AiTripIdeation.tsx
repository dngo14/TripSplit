
"use client";

import type React from 'react';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Wand2, Lightbulb, Map, Calendar, ThumbsUp, Loader2, AlertCircle, ClipboardCopy, DollarSign } from 'lucide-react';
import { suggestTripIdeas, type SuggestTripIdeasInput, type SuggestTripIdeasOutput } from '@/ai/flows/suggest-trip-ideas';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function AiTripIdeation() {
  const [destination, setDestination] = useState('');
  const [interests, setInterests] = useState('');
  const [durationDays, setDurationDays] = useState<number | ''>(7);
  const [budgetPreference, setBudgetPreference] = useState(''); // New state for budget
  const [isLoading, setIsLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<SuggestTripIdeasOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim() || !interests.trim() || durationDays === '' || durationDays <= 0) {
      toast({
        title: 'Missing Information',
        description: 'Please provide a destination, your interests, and a valid trip duration.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setAiSuggestions(null);

    try {
      const input: SuggestTripIdeasInput = {
        destination,
        interests,
        durationDays: Number(durationDays),
        budgetPreference: budgetPreference.trim() || undefined, // Pass budget preference, or undefined if empty
      };
      const result = await suggestTripIdeas(input);
      setAiSuggestions(result);
    } catch (err) {
      console.error('AI Trip Ideation Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to get AI suggestions: ${errorMessage}`);
      toast({
        title: 'AI Suggestion Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        toast({ title: `${fieldName} Copied!`, description: `"${text}" copied to clipboard.` });
      })
      .catch(err => {
        console.error('Failed to copy:', err);
        toast({ title: 'Copy Failed', description: 'Could not copy text to clipboard.', variant: 'destructive' });
      });
  };


  return (
    <Card className="shadow-xl w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl">
          <Wand2 className="mr-3 h-7 w-7 text-primary" /> AI Trip Ideation
        </CardTitle>
        <CardDescription>
          Get inspired! Tell us about your dream trip, and our AI will suggest a theme and activities.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="destination" className="flex items-center mb-1 font-semibold"><Map className="mr-2 h-5 w-5 text-primary"/>Destination</Label>
            <Input
              id="destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g., Kyoto, Japan; Canadian Rockies"
              required
            />
          </div>
          <div>
            <Label htmlFor="interests" className="flex items-center mb-1 font-semibold"><Lightbulb className="mr-2 h-5 w-5 text-primary"/>Interests</Label>
            <Textarea
              id="interests"
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              placeholder="e.g., temples, sushi, nature photography, hiking, local markets"
              rows={3}
              required
            />
             <p className="text-xs text-muted-foreground mt-1">Separate interests with commas.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="durationDays" className="flex items-center mb-1 font-semibold"><Calendar className="mr-2 h-5 w-5 text-primary"/>Trip Duration (days)</Label>
              <Input
                id="durationDays"
                type="number"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                placeholder="e.g., 7"
                min="1"
                max="30"
                required
              />
            </div>
            <div>
              <Label htmlFor="budgetPreference" className="flex items-center mb-1 font-semibold"><DollarSign className="mr-2 h-5 w-5 text-primary"/>Budget Preference (Optional)</Label>
              <Input
                id="budgetPreference"
                value={budgetPreference}
                onChange={(e) => setBudgetPreference(e.target.value)}
                placeholder="e.g., budget-friendly, luxury"
              />
               <p className="text-xs text-muted-foreground mt-1">Helps tailor activity suggestions.</p>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating Ideas...
              </>
            ) : (
              <>
                <ThumbsUp className="mr-2 h-5 w-5" /> Get AI Ideas
              </>
            )}
          </Button>
        </form>

        {error && (
          <Alert variant="destructive" className="mt-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {aiSuggestions && !isLoading && (
          <div className="mt-8 p-4 border rounded-lg bg-card/50">
            <h3 className="text-xl font-semibold mb-1 flex items-center">
                AI Suggested Trip Title:
                <Button variant="ghost" size="icon" className="ml-2 h-7 w-7" onClick={() => handleCopyToClipboard(aiSuggestions.suggestedTitle, 'Title')}>
                    <ClipboardCopy className="h-4 w-4" />
                </Button>
            </h3>
            <p className="text-primary text-lg mb-4">{aiSuggestions.suggestedTitle}</p>

            <h3 className="text-xl font-semibold mb-1 flex items-center">
                Trip Theme:
                 <Button variant="ghost" size="icon" className="ml-2 h-7 w-7" onClick={() => handleCopyToClipboard(aiSuggestions.tripTheme, 'Theme')}>
                    <ClipboardCopy className="h-4 w-4" />
                </Button>
            </h3>
            <p className="text-muted-foreground mb-4 italic">{aiSuggestions.tripTheme}</p>
            
            <h3 className="text-xl font-semibold mb-2">Activity Suggestions:</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              {aiSuggestions.activitySuggestions.map((activity, index) => (
                <li key={index} className="flex items-start">
                  <span className="flex-grow">{activity}</span>
                  <Button variant="ghost" size="icon" className="ml-2 h-7 w-7 flex-shrink-0" onClick={() => handleCopyToClipboard(activity, 'Activity')}>
                    <ClipboardCopy className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
