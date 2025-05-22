import { Coins } from 'lucide-react';

interface HeaderProps {
  tripName?: string; // Optional now
}

export function AppHeader({ tripName }: HeaderProps) {
  return (
    <header className="bg-card text-card-foreground p-4 shadow-md sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Coins className="h-8 w-8" />
          <h1 className="text-2xl font-bold">TripSplit</h1>
        </div>
        {tripName && <span className="text-lg">{tripName}</span>}
        {!tripName && <span className="text-lg italic text-card-foreground/80">No active trip</span>}
      </div>
    </header>
  );
}
