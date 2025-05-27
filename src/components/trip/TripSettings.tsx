
"use client";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CURRENCIES } from '@/lib/constants';
import { Settings, Edit3, DollarSignIcon, Trash2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface TripSettingsProps {
  tripName: string;
  onTripNameChange: (name: string) => void;
  currency: string;
  onCurrencyChange: (currency: string) => void;
  onDeleteTrip: () => void;
  isCreator: boolean;
}

export function TripSettings({ 
  tripName, 
  onTripNameChange, 
  currency, 
  onCurrencyChange, 
  onDeleteTrip,
  isCreator 
}: TripSettingsProps) {
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
      <CardFooter className="border-t pt-4">
        <TooltipProvider>
          <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
              {/* Button is wrapped for Tooltip when disabled */}
              <div className="w-full sm:w-auto"> 
                <Button 
                  variant="destructive" 
                  onClick={onDeleteTrip} 
                  className="w-full"
                  disabled={!isCreator}
                  aria-disabled={!isCreator}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete This Trip
                </Button>
              </div>
            </TooltipTrigger>
            {!isCreator && (
              <TooltipContent>
                <p>Only the trip creator can delete the trip.</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </CardFooter>
    </Card>
  );
}
