
import { config } from 'dotenv';
config();

import '@/ai/flows/categorize-expense.ts';
import '@/ai/flows/suggest-trip-ideas.ts';
import '@/ai/flows/categorize-itinerary-item.ts'; // Added new flow
