import { defineFlow, runFlow } from '@genkit-ai/next';
import { gemini20FlashPreview } from '@genkit-ai/googleai';
import { z } from 'zod';

const RestaurantRecommendationsInputSchema = z.object({
  destination: z.string(),
  cuisinePreferences: z.string().optional().describe('Preferred cuisine types'),
  budgetPreference: z.string().optional().describe('Budget preference (budget, moderate, upscale)'),
  dietaryRestrictions: z.string().optional().describe('Dietary restrictions or preferences'),
  mealTypes: z.array(z.enum(['breakfast', 'lunch', 'dinner', 'snacks', 'drinks'])).optional(),
});

const RestaurantSchema = z.object({
  name: z.string(),
  cuisine: z.string(),
  priceRange: z.string().describe('Price range (e.g., $, $$, $$$)'),
  description: z.string(),
  mustTry: z.string().describe('Must-try dish or specialty'),
  location: z.string().describe('Area or neighborhood'),
  tips: z.string().optional().describe('Dining tips or reservation advice'),
});

const RestaurantRecommendationsOutputSchema = z.object({
  destination: z.string(),
  recommendations: z.array(RestaurantSchema),
  localFoodTips: z.array(z.string()).describe('General local food culture tips'),
  budgetTips: z.array(z.string()).describe('Money-saving dining tips'),
  foodMarkets: z.array(z.string()).optional().describe('Local food markets or street food areas'),
});

export type RestaurantRecommendationsInput = z.infer<typeof RestaurantRecommendationsInputSchema>;
export type RestaurantRecommendationsOutput = z.infer<typeof RestaurantRecommendationsOutputSchema>;

export const getRestaurantRecommendations = defineFlow(
  {
    name: 'getRestaurantRecommendations',
    inputSchema: RestaurantRecommendationsInputSchema,
    outputSchema: RestaurantRecommendationsOutputSchema,
  },
  async (input) => {
    const { destination, cuisinePreferences, budgetPreference, dietaryRestrictions, mealTypes } = input;
    
    const prompt = `
    Provide restaurant and dining recommendations for ${destination}.
    
    Preferences:
    - Cuisine preferences: ${cuisinePreferences || 'Open to all cuisines'}
    - Budget preference: ${budgetPreference || 'Mixed range'}
    - Dietary restrictions: ${dietaryRestrictions || 'None specified'}
    - Meal types interested in: ${mealTypes?.join(', ') || 'All meals'}
    
    Please provide:
    
    1. 8-12 diverse restaurant recommendations including:
       - Restaurant name
       - Cuisine type
       - Price range (using $, $$, $$$ system)
       - Description of the restaurant and atmosphere
       - Must-try signature dish or specialty
       - Specific location/neighborhood
       - Any dining tips (reservations, best times, etc.)
    
    2. Local food culture tips specific to ${destination}
    3. Budget-friendly dining tips and strategies
    4. Recommended food markets, street food areas, or food halls
    
    Include a mix of:
    - Local specialties and traditional cuisine
    - Different price points
    - Various neighborhoods/areas
    - Different meal types (breakfast, lunch, dinner)
    - Both tourist-friendly and local favorites
    ${dietaryRestrictions ? `- Options suitable for ${dietaryRestrictions}` : ''}
    
    Focus on authentic experiences and insider knowledge that helps travelers eat like locals.
    `;

    const result = await runFlow(gemini20FlashPreview, {
      prompt,
      output: { schema: RestaurantRecommendationsOutputSchema },
    });

    return result;
  }
);