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

export interface Expense {
  id: string;
  description: string;
  amount: number;
  paidById: string; // Member ID
  category?: string;
  comments: Comment[];
  createdAt: Date;
  date: Date; 
}

export interface ChatMessage {
  id: string;
  senderId: string; // Member ID
  senderName: string; // Member Name
  text: string;
  createdAt: Date;
}

export interface TripData {
  tripName: string;
  members: Member[];
  expenses: Expense[];
  chatMessages: ChatMessage[];
  currency: string; // e.g., "USD", "EUR"
}

export interface Settlement {
  from: string; // Member name
  to: string;   // Member name
  amount: number;
}
