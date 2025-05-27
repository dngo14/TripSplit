
import type { TripData, AppState, Member, ItineraryItem } from './types';
import { Timestamp } from 'firebase/firestore';

export const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "INR"];

export function createInitialTripData(
  name: string,
  currency: string = "USD",
  creatorUID: string,
  creatorName?: string,
  creatorEmail?: string
): Omit<TripData, 'id'> {
  const creatorDisplayName = creatorName || creatorEmail?.split('@')[0] || "Trip Creator";
  const creatorMember: Member = {
    id: creatorUID,
    name: creatorDisplayName,
    email: creatorEmail?.toLowerCase() || undefined,
  };

  const initialItinerary: ItineraryItem[] = []; // Ensure it's typed

  return {
    tripName: name,
    members: [creatorMember],
    expenses: [],
    chatMessages: [],
    currency: currency,
    itinerary: initialItinerary, // Use typed empty array
    
    accommodationAddress: '',
    tripStartDate: null,
    tripEndDate: null,
    flightDetails: '',
    notes: '',

    destinationCity: '',
    destinationCountry: '',
    budget: null,

    creatorUID: creatorUID,
    memberUIDs: [creatorUID],
    lastUpdatedAt: Timestamp.now(),

    settlementClearances: [],
    currentSettlementsLastClearedAt: null,
  };
}

export const INITIAL_APP_STATE: AppState = {
  trips: [],
  activeTripId: null,
};
