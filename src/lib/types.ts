
import type { Timestamp } from 'firebase/firestore'; // Import Timestamp

export interface Member {
  id: string; // This can be a custom ID or Firebase UID if linked
  name: string;
  email?: string; 
}

export interface Comment {
  id: string;
  expenseId: string;
  authorId: string; 
  authorName: string; 
  text: string;
  createdAt: Date | Timestamp; // Allow both for easier handling before/after Firestore conversion
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

export interface ChatMessage {
  id: string;
  senderId: string; 
  senderName: string; 
  text: string;
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
  placeName: string;
  address: string;
  visitDate: Date | Timestamp;
  notes: string;
  createdAt: Date | Timestamp;
  comments: ItineraryComment[];
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
  tripStartDate?: Date | Timestamp;
  tripEndDate?: Date | Timestamp;
  flightDetails?: string;
  notes?: string; 

  // Firestore specific fields
  creatorUID: string; // Firebase Auth UID of the trip creator
  memberUIDs: string[]; // Array of Firebase Auth UIDs of users who are members of this trip
  lastUpdatedAt?: Timestamp; // For ordering or tracking
}

export interface AppState {
  trips: TripData[];
  activeTripId: string | null;
  // No longer storing currentUser in AppState, will rely on AuthContext
}

export interface Settlement {
  from: string; 
  to: string;   
  amount: number;
}
