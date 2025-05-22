
"use client";

import type React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { TripData } from '@/lib/types';
import { InfoIcon, Home, CalendarDays, Plane, StickyNote, Save } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface TripInfoProps {
  tripData: TripData;
  onTripInfoChange: (field: keyof TripData, value: any) => void;
}

export function TripInfo({ tripData, onTripInfoChange }: TripInfoProps) {
  const [accommodationAddress, setAccommodationAddress] = useState(tripData.accommodationAddress || '');
  const [tripStartDate, setTripStartDate] = useState<Date | undefined>(tripData.tripStartDate ? new Date(tripData.tripStartDate as any) : undefined);
  const [tripEndDate, setTripEndDate] = useState<Date | undefined>(tripData.tripEndDate ? new Date(tripData.tripEndDate as any) : undefined);
  const [flightDetails, setFlightDetails] = useState(tripData.flightDetails || '');
  const [notes, setNotes] = useState(tripData.notes || '');

  useEffect(() => {
    setAccommodationAddress(tripData.accommodationAddress || '');
    setTripStartDate(tripData.tripStartDate ? new Date(tripData.tripStartDate as any) : undefined);
    setTripEndDate(tripData.tripEndDate ? new Date(tripData.tripEndDate as any) : undefined);
    setFlightDetails(tripData.flightDetails || '');
    setNotes(tripData.notes || '');
  }, [tripData]);

  const handleSave = <K extends keyof TripData>(field: K, value: TripData[K] | null) => {
    onTripInfoChange(field, value);
  };


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
          <InfoIcon className="mr-2 h-6 w-6" /> Trip Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="accommodationAddress" className="flex items-center mb-1"><Home className="mr-2 h-4 w-4" />Accommodation Address</Label>
          <Input
            id="accommodationAddress"
            value={accommodationAddress}
            onChange={(e) => setAccommodationAddress(e.target.value)}
            onBlur={() => handleSave('accommodationAddress', accommodationAddress)}
            placeholder="e.g., 123 Main St, Anytown USA"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="tripStartDate" className="flex items-center mb-1"><CalendarDays className="mr-2 h-4 w-4" />Trip Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="tripStartDate"
                  variant={"outline"}
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {tripStartDate ? format(tripStartDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={tripStartDate}
                  onSelect={(date) => {
                    setTripStartDate(date); // date can be undefined if cleared
                    handleSave('tripStartDate', date === undefined ? null : date);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label htmlFor="tripEndDate" className="flex items-center mb-1"><CalendarDays className="mr-2 h-4 w-4" />Trip End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="tripEndDate"
                  variant={"outline"}
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {tripEndDate ? format(tripEndDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={tripEndDate}
                  onSelect={(date) => {
                     setTripEndDate(date); // date can be undefined if cleared
                     handleSave('tripEndDate', date === undefined ? null : date);
                  }}
                  disabled={(date) =>
                    tripStartDate ? date < tripStartDate : false
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div>
          <Label htmlFor="flightDetails" className="flex items-center mb-1"><Plane className="mr-2 h-4 w-4" />Flight Details</Label>
          <Textarea
            id="flightDetails"
            value={flightDetails}
            onChange={(e) => setFlightDetails(e.target.value)}
            onBlur={() => handleSave('flightDetails', flightDetails)}
            placeholder="e.g., UA 123, JFK -> LAX, Departs 10:00 AM"
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="tripNotes" className="flex items-center mb-1"><StickyNote className="mr-2 h-4 w-4" />Other Important Notes</Label>
          <Textarea
            id="tripNotes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => handleSave('notes', notes)}
            placeholder="e.g., Emergency contacts, visa info, packing list reminders"
            rows={4}
          />
        </div>
      </CardContent>
    </Card>
  );
}

    