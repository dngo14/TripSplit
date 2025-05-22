"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CURRENCIES } from '@/lib/constants';
import { Settings, Edit3,DollarSignIcon } from 'lucide-react';

interface TripSettingsProps {
  tripName: string;
  onTripNameChange: (name: string) => void;
  currency: string;
  onCurrencyChange: (currency: string) => void;
}

export function TripSettings({ tripName, onTripNameChange, currency, onCurrencyChange }: TripSettingsProps) {
  return (
    <Card className="shadow-lg mb-6">
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
          <Settings className="mr-2 h-6 w-6" /> Trip Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="tripName" className="flex items-center mb-1"><Edit3 className="mr-2 h-4 w-4" />Trip Name</Label>
          <Input
            id="tripName"
            type="text"
            value={tripName}
            onChange={(e) => onTripNameChange(e.target.value)}
            placeholder="Enter trip name"
          />
        </div>
        <div>
          <Label htmlFor="currency" className="flex items-center mb-1"><DollarSignIcon className="mr-2 h-4 w-4" />Currency</Label>
          <Select value={currency} onValueChange={onCurrencyChange}>
            <SelectTrigger id="currency">
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((curr) => (
                <SelectItem key={curr} value={curr}>
                  {curr}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
