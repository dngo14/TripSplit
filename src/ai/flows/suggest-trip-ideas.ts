
'use server';
/**
 * @fileOverview This file defines a Genkit flow for suggesting trip themes and activities.
 *
 * - suggestTripIdeas - A function that takes destination, interests, and duration, and returns a theme and activity ideas.
 * - SuggestTripIdeasInput - The input type for the suggestTripIdeas function.
 * - SuggestTripIdeasOutput - The return type for the suggestTripIdeas function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestTripIdeasInputSchema = z.object({
  destination: z.string().describe('The primary destination of the trip (e.g., Paris, France; Yellowstone National Park).'),
  interests: z.string().describe('A comma-separated list of interests for the trip (e.g., history, hiking, beaches, nightlife, art museums).'),
  durationDays: z.number().min(1).max(30).describe('The duration of the trip in days (e.g., 7).'),
  budgetPreference: z.string().optional().describe('User\'s budget preference for the trip (e.g., "budget-friendly", "mid-range", "luxury", "backpacking", "splurge"). This helps tailor activity and theme suggestions.')
});
export type SuggestTripIdeasInput = z.infer<typeof SuggestTripIdeasInputSchema>;

const SuggestTripIdeasOutputSchema = z.object({
  tripTheme: z.string().describe('A creative and concise theme for the trip based on the inputs (e.g., "Parisian Culinary Adventure", "Rocky Mountain Exploration").'),
  activitySuggestions: z.array(z.string()).describe('A list of 3 to 5 key activity suggestions relevant to the theme and inputs.'),
  suggestedTitle: z.string().describe('A catchy and concise title for the trip based on the theme and destination (e.g., "Paris for Foodies", "Yellowstone Nature Escape").')
});
export type SuggestTripIdeasOutput = z.infer<typeof SuggestTripIdeasOutputSchema>;

export async function suggestTripIdeas(input: SuggestTripIdeasInput): Promise<SuggestTripIdeasOutput> {
  return suggestTripIdeasFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestTripIdeasPrompt',
  input: {schema: SuggestTripIdeasInputSchema},
  output: {schema: SuggestTripIdeasOutputSchema},
  prompt: `You are an expert travel planner AI. Based on the user's destination, interests, trip duration, and optionally their budget preference, generate a creative trip theme, a catchy trip title, and 3-5 key activity suggestions that includes the location if relevant.

Destination: {{{destination}}}
Interests: {{{interests}}}
Duration (days): {{{durationDays}}}
{{#if budgetPreference}}
Budget Preference: {{{budgetPreference}}}
{{/if}}

Trip Theme: Generate a short, inspiring theme for the trip (e.g., "Historical Journey through Rome", "Bali Beach Bliss & Yoga Retreat", "NYC Urban Explorer"). Consider the budget preference if provided.
Suggested Title: Generate a concise and appealing title for the trip, suitable for a trip name (e.g., "Rome: Ancient Wonders", "Bali Relaxation", "NYC Adventure '24"). Consider the budget preference if provided.
Activity Suggestions: Provide a list of 3 to 5 specific activity suggestions that align with the destination, interests, duration, and budget preference (if provided). Be specific and actionable. For example, instead of "Visit museums", suggest "Explore the Louvre Museum and Musée d'Orsay".

Ensure your response is formatted according to the output schema.
Focus on quality and relevance.
`,
});

const suggestTripIdeasFlow = ai.defineFlow(
  {
    name: 'suggestTripIdeasFlow',
    inputSchema: SuggestTripIdeasInputSchema,
    outputSchema: SuggestTripIdeasOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
        throw new Error("AI failed to generate trip ideas.");
    }
    // Ensure activitySuggestions is always an array, even if AI fails to provide it or provides a non-array
    if (!Array.isArray(output.activitySuggestions)) {
        console.warn("AI output for activitySuggestions was not an array, defaulting to empty array. Output was:", output.activitySuggestions);
        return {
            ...output,
            activitySuggestions: []
        };
    }
    return output;
  }
);

