
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

export interface PhotoAlbum {
  id: string;
  tripId: string;
  name: string;
  description?: string;
  createdAt: Date | Timestamp;
  creatorId: string;
  coverPhotoURL?: string;
  photoCount?: number; // Denormalized for quick display
}

export interface Photo {
  id: string;
  tripId: string;
  albumId?: string | null; // null if not in an album (e.g., in "All Photos")
  uploaderId: string;
  uploaderName: string;
  fileName: string;
  storagePath: string; // Path in Firebase Storage
  downloadURL: string;
  contentType: string; // e.g., 'image/jpeg'
  caption?: string;
  createdAt: Date | Timestamp;
  width?: number;
  height?: number;
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
  
  // Structured Flight Details - Outbound
  mainFlightDepartureAirline?: string;
  mainFlightDepartureNumber?: string;
  mainFlightDepartureAirport?: string;
  mainFlightDepartureDateTime?: Date | Timestamp | null;
  mainFlightArrivalAirport?: string;
  mainFlightArrivalDateTime?: Date | Timestamp | null;
  mainFlightConfirmation?: string; // Shared for round trip potentially
  mainFlightNotes?: string; // Shared for round trip potentially

  // Structured Flight Details - Return
  returnFlightDepartureAirline?: string;
  returnFlightDepartureNumber?: string;
  returnFlightDepartureAirport?: string;
  returnFlightDepartureDateTime?: Date | Timestamp | null;
  returnFlightArrivalAirport?: string;
  returnFlightArrivalDateTime?: Date | Timestamp | null;

  notes?: string; // General trip notes

  destinationCity?: string;
  destinationCountry?: string;
  budget?: number | null;

  creatorUID: string;
  memberUIDs: string[]; // Firebase Auth UIDs of users with access
  
  photoAlbums?: PhotoAlbum[]; // New: For photo sharing
  photos?: Photo[];           // New: For photo sharing

  lastUpdatedAt?: Timestamp;
  settlementClearances?: {
    settlement: Settlement;
    clearedByUID: string;
    clearedByName: string;
    clearedAt: Timestamp | Date;
  }[];
  currentSettlementsLastClearedAt?: Timestamp | Date | null;
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
