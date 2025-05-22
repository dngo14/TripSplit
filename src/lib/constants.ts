import type { TripData, AppState } from './types';

export const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "INR"];

export function createInitialTripData(name: string, currency: string = "USD"): TripData {
  return {
    id: crypto.randomUUID(),
    tripName: name,
    members: [],
    expenses: [],
    chatMessages: [],
    currency: currency,
  };
}

export const INITIAL_APP_STATE: AppState = {
  trips: [],
  activeTripId: null,
};
