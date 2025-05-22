import type { TripData } from './types';

export const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "INR"];

export const INITIAL_TRIP_DATA: TripData = {
  tripName: "My Awesome Trip",
  members: [],
  expenses: [],
  chatMessages: [],
  currency: "USD",
};
