
export interface Member {
  id: string;
  name: string;
}

export interface Comment {
  id: string;
  expenseId: string;
  authorId: string; // Member ID
  authorName: string; // Member Name
  text: string;
  createdAt: Date;
}

export type SplitType = 'equally' | 'byAmount' | 'byPercentage';

export interface SplitDetail {
  memberId: string;
  amount?: number; // For 'byAmount'
  percentage?: number; // For 'byPercentage'
  // For 'equally', only memberId is needed if not splitting among all
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  paidById: string; // Member ID
  category?: string;
  comments: Comment[];
  createdAt: Date;
  date: Date;
  splitType: SplitType;
  splitDetails: SplitDetail[]; // Details of how the expense is split
  receiptImageUri?: string; // To store the receipt image as a data URI
}

export interface ChatMessage {
  id: string;
  senderId: string; // Member ID
  senderName: string; // Member Name
  text: string;
  createdAt: Date;
}

export interface TripData {
  id: string; // Unique ID for the trip
  tripName: string;
  members: Member[];
  expenses: Expense[];
  chatMessages: ChatMessage[];
  currency: string; // e.g., "USD", "EUR"
}

export interface AppState {
  trips: TripData[];
  activeTripId: string | null;
}

export interface Settlement {
  from: string; // Member name
  to: string;   // Member name
  amount: number;
}
