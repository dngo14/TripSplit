import { defineFlow, runFlow } from '@genkit-ai/next';
import { gemini20FlashPreview } from '@genkit-ai/googleai';
import { z } from 'zod';

const GenerateItineraryInputSchema = z.object({
  destination: z.string(),
  durationDays: z.number().min(1).max(30),
  interests: z.string().describe('Comma-separated list of interests'),
  budgetPreference: z.string().optional().describe('Budget preference (e.g., budget-friendly, moderate, luxury)'),
  travelStyle: z.string().optional().describe('Travel style (e.g., relaxed, active, cultural)'),
});

const DayActivitySchema = z.object({
  time: z.string().describe('Time of day (e.g., "9:00 AM", "Afternoon")'),
  activity: z.string().describe('Activity name'),
  description: z.string().describe('Detailed activity description'),
  estimatedCost: z.string().describe('Estimated cost for the activity'),
  tips: z.string().optional().describe('Tips or recommendations'),
});

const DayItinerarySchema = z.object({
  day: z.number(),
  theme: z.string().describe('Theme for the day'),
  activities: z.array(DayActivitySchema),
  dailyBudget: z.string().describe('Estimated daily budget'),
});

const GenerateItineraryOutputSchema = z.object({
  destination: z.string(),
  overview: z.string().describe('Brief overview of the itinerary'),
  totalEstimatedCost: z.string().describe('Total estimated cost for the trip'),
  bestTimeToVisit: z.string().describe('Best time to visit the destination'),
  days: z.array(DayItinerarySchema),
  generalTips: z.array(z.string()).describe('General travel tips for the destination'),
  budgetTips: z.array(z.string()).describe('Budget-saving tips'),
});

export type GenerateItineraryInput = z.infer<typeof GenerateItineraryInputSchema>;
export type GenerateItineraryOutput = z.infer<typeof GenerateItineraryOutputSchema>;

export const generateItinerary = defineFlow(
  {
    name: 'generateItinerary',
    inputSchema: GenerateItineraryInputSchema,
    outputSchema: GenerateItineraryOutputSchema,
  },
  async (input) => {
    const { destination, durationDays, interests, budgetPreference, travelStyle } = input;
    
    const prompt = `
    Create a detailed ${durationDays}-day itinerary for ${destination}.
    
    Traveler preferences:
    - Interests: ${interests}
    - Budget preference: ${budgetPreference || 'Not specified'}
    - Travel style: ${travelStyle || 'Not specified'}
    
    Please create a comprehensive itinerary that includes:
    
    1. A brief overview of what makes this itinerary special
    2. Day-by-day breakdown with:
       - A theme for each day
       - 3-5 activities per day with specific times
       - Detailed descriptions of each activity
       - Estimated costs (use $ ranges like $10-20, $50-100)
       - Practical tips for each activity
    3. Total estimated cost for the entire trip
    4. Best time to visit this destination
    5. General travel tips specific to ${destination}
    6. Budget-saving tips and recommendations
    
    Focus on:
    - Realistic timing and logistics
    - Mix of must-see attractions and local experiences
    - Variety in activity types
    - Practical cost estimates
    - Local insights and hidden gems
    - Transportation between activities
    ${budgetPreference ? `- ${budgetPreference} options throughout` : ''}
    
    Make it feel like advice from a knowledgeable local friend.
    `;

    const result = await runFlow(gemini20FlashPreview, {
      prompt,
      output: { schema: GenerateItineraryOutputSchema },
    });

    return result;
  }
);