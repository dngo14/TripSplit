
import type { TripData, AppState, Member } from './types';
import { Timestamp } from 'firebase/firestore';

export const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "INR"];

export function createInitialTripData(name: string, currency: string = "USD", creatorUID: string, creatorName?: string, creatorEmail?: string): Omit<TripData, 'id'> {
  const creatorMember: Member = {
    id: creatorUID, // Use Firebase UID as member ID for the creator
    name: creatorName || "Trip Creator",
    email: creatorEmail || undefined,
  };
  
  return {
    tripName: name,
    members: [creatorMember], // Add creator as the first member
    expenses: [],
    chatMessages: [],
    currency: currency,
    itinerary: [],
    accommodationAddress: '',
    tripStartDate: undefined,
    tripEndDate: undefined,
    flightDetails: '',
    notes: '',
    creatorUID: creatorUID,
    memberUIDs: [creatorUID], // Creator is initially the only member
    lastUpdatedAt: Timestamp.now(),
  };
}

export const INITIAL_APP_STATE: AppState = {
  trips: [],
  activeTripId: null,
};
