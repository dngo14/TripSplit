
'use server';
/**
 * @fileOverview This file defines a Genkit flow for categorizing itinerary items.
 *
 * - categorizeItineraryItem - A function that takes an item description and returns its category.
 * - CategorizeItineraryItemInput - The input type for the categorizeItineraryItem function.
 * - CategorizeItineraryItemOutput - The return type for the categorizeItineraryItem function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CategorizeItineraryItemInputSchema = z.object({
  description: z.string().describe('The description or name of the itinerary item (e.g., "Eiffel Tower visit", "Dinner at Le Jules Verne", "Hike to Lake Agnes").'),
});
export type CategorizeItineraryItemInput = z.infer<typeof CategorizeItineraryItemInputSchema>;

const CategorizeItineraryItemOutputSchema = z.object({
  category: z.string().describe('The category of the itinerary item. Choose from: Food & Drink, Sightseeing, Outdoor Activity, Museum, Shopping, Accommodation, Travel/Transportation, Entertainment, Other.'),
});
export type CategorizeItineraryItemOutput = z.infer<typeof CategorizeItineraryItemOutputSchema>;

export async function categorizeItineraryItem(input: CategorizeItineraryItemInput): Promise<CategorizeItineraryItemOutput> {
  return categorizeItineraryItemFlow(input);
}

const prompt = ai.definePrompt({
  name: 'categorizeItineraryItemPrompt',
  input: {schema: CategorizeItineraryItemInputSchema},
  output: {schema: CategorizeItineraryItemOutputSchema},
  prompt: `You are an AI assistant that categorizes itinerary items based on their description.

  Given the following itinerary item description, determine the most appropriate category.

  Description: {{{description}}}

  Choose one category from the following list:
  - Food & Drink (e.g., restaurants, cafes, bars, cooking classes)
  - Sightseeing (e.g., landmarks, historical sites, viewpoints, city tours)
  - Outdoor Activity (e.g., hiking, beaches, parks, cycling, water sports)
  - Museum (e.g., art museums, history museums, science centers)
  - Shopping (e.g., markets, malls, souvenir shops)
  - Accommodation (e.g., hotel check-in, Airbnb)
  - Travel/Transportation (e.g., flight, train ride, bus trip, ferry)
  - Entertainment (e.g., concerts, shows, theme parks, nightlife)
  - Other (for items that don't fit well into other categories)

  Ensure the category is exactly one of the provided options.
  `,
});

const categorizeItineraryItemFlow = ai.defineFlow(
  {
    name: 'categorizeItineraryItemFlow',
    inputSchema: CategorizeItineraryItemInputSchema,
    outputSchema: CategorizeItineraryItemOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output?.category) {
        // Fallback if AI fails or returns unexpected output
        return { category: 'Other' };
    }
    // Validate if the category is one of the predefined ones, otherwise default to 'Other'
    const validCategories = ["Food & Drink", "Sightseeing", "Outdoor Activity", "Museum", "Shopping", "Accommodation", "Travel/Transportation", "Entertainment", "Other"];
    if (!validCategories.includes(output.category)) {
        console.warn(`AI returned an invalid category: "${output.category}". Defaulting to "Other".`);
        return { category: "Other" };
    }
    return output;
  }
);
