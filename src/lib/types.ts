
import type { Timestamp } from 'firebase/firestore'; // Import Timestamp

export interface Member {
  id: string; // This can be a custom ID or Firebase UID if linked
  name: string;
  email?: string;
  contactInfo?: string;
}

export interface Comment {
  id: string;
  expenseId: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: Date | Timestamp;
}

export type SplitType = 'equally' | 'byAmount' | 'byPercentage';

export interface SplitDetail {
  memberId: string;
  amount?: number;
  percentage?: number;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  paidById: string;
  category?: string;
  comments: Comment[];
  createdAt: Date | Timestamp;
  date: Date | Timestamp;
  splitType: SplitType;
  splitDetails: SplitDetail[];
  receiptImageUri?: string;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface PollData {
  id: string;
  question: string;
  options: PollOption[];
  // type: 'thumbs' | 'custom'; // Type can be inferred from options. Thumbs will have specific option texts.
  voters: Record<string, string>; // Tracks { userId: optionId } to ensure one vote per user per poll
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text?: string; // Optional if it's a poll message
  poll?: PollData; // Optional poll data
  createdAt: Date | Timestamp;
}

export interface ItineraryComment {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: Date | Timestamp;
}

export interface ItineraryItem {
  id: string;
  placeName: string; // Will be treated as "Activity / Place Name"
  address: string;
  visitDate: Date | Timestamp;
  notes: string;
  createdAt: Date | Timestamp;
  comments: ItineraryComment[];
  category?: string; // New field for AI categorization
  placeId?: string; 
  latitude?: number;
  longitude?: number;
}

export interface Settlement {
  from: string; 
  to: string;   
  amount: number;
  fromId: string; // Member ID of the debtor
  toId: string;   // Member ID of the creditor
}

export interface TripData {
  id: string;
  tripName: string;
  members: Member[];
  expenses: Expense[];
  chatMessages: ChatMessage[];
  currency: string;
  itinerary: ItineraryItem[];

  accommodationAddress?: string;
  tripStartDate?: Date | Timestamp | null;
  tripEndDate?: Date | Timestamp | null;
  
  // Structured Flight Details
  mainFlightDepartureAirline?: string;
  mainFlightDepartureNumber?: string;
  mainFlightDepartureAirport?: string;
  mainFlightDepartureDateTime?: Date | Timestamp | null;
  mainFlightArrivalAirport?: string;
  mainFlightArrivalDateTime?: Date | Timestamp | null;
  mainFlightConfirmation?: string;
  mainFlightNotes?: string;

  notes?: string; // General trip notes

  destinationCity?: string;
  destinationCountry?: string;
  budget?: number | null;

  creatorUID: string;
  memberUIDs: string[]; // Firebase Auth UIDs of users with access
  lastUpdatedAt?: Timestamp;
}

export interface AppState {
  trips: TripData[];
  activeTripId: string | null;
}

// For user profiles in Firestore /users collection
export interface UserProfile {
    uid: string;
    email: string | null;
    displayName: string | null;
    lastLogin: Timestamp;
}
