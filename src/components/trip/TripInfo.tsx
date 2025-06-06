
"use client";

import type React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { TripData, Member } from '@/lib/types';
import { InfoIcon, Home, CalendarDays, Plane, StickyNote, Save, Globe, Users2, PiggyBank, Phone } from 'lucide-react';
import { format } from 'date-fns';
import type { Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface TripInfoProps {
  tripData: TripData;
  onTripInfoChange: (field: keyof TripData, value: any) => void;
}

export function TripInfo({ tripData, onTripInfoChange }: TripInfoProps) {
  const [accommodationAddress, setAccommodationAddress] = useState('');
  const [tripStartDate, setTripStartDate] = useState<Date | undefined>(undefined);
  const [tripEndDate, setTripEndDate] = useState<Date | undefined>(undefined);
  const [flightDetails, setFlightDetails] = useState('');
  const [notes, setNotes] = useState('');
  const [destinationCity, setDestinationCity] = useState('');
  const [destinationCountry, setDestinationCountry] = useState('');
  const [budget, setBudget] = useState<string>('');
  const [memberContacts, setMemberContacts] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    setAccommodationAddress(tripData.accommodationAddress || '');
    
    const startDate = tripData.tripStartDate;
    setTripStartDate(startDate ? (startDate as Timestamp).toDate?.() || new Date(startDate as any) : undefined);
    
    const endDate = tripData.tripEndDate;
    setTripEndDate(endDate ? (endDate as Timestamp).toDate?.() || new Date(endDate as any) : undefined);

    setFlightDetails(tripData.flightDetails || '');
    setNotes(tripData.notes || '');
    setDestinationCity(tripData.destinationCity || '');
    setDestinationCountry(tripData.destinationCountry || '');
    setBudget(tripData.budget !== undefined && tripData.budget !== null ? String(tripData.budget) : '');

    const initialContacts: Record<string, string> = {};
    (tripData.members || []).forEach(member => {
      initialContacts[member.id] = member.contactInfo || '';
    });
    setMemberContacts(initialContacts);

  }, [tripData]);

  const handleSave = <K extends keyof TripData>(field: K, value: TripData[K] | null | number | Member[]) => {
    onTripInfoChange(field, value);
  };

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBudget(e.target.value);
  };

  const handleBudgetSave = () => {
    const numBudget = parseFloat(budget);
    handleSave('budget', budget === '' || isNaN(numBudget) ? null : numBudget);
  };

  const handleMemberContactChange = (memberId: string, newContactInfo: string) => {
    setMemberContacts(prev => ({ ...prev, [memberId]: newContactInfo }));
  };

  const handleMemberContactSave = (memberId: string) => {
    const updatedMembers = tripData.members.map(member => 
      member.id === memberId 
        ? { ...member, contactInfo: memberContacts[memberId] || '' } 
        : member
    );
    handleSave('members', updatedMembers);
    toast({ title: "Contact Info Updated", description: `Contact details for ${tripData.members.find(m=>m.id === memberId)?.name} saved.` });
  };


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
          <InfoIcon className="mr-2 h-6 w-6" /> Trip Information
        </CardTitle>
        <CardDescription>
          Central place for key details about your trip. Changes are saved automatically when you finish editing or move away from a field.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="destinationCity" className="flex items-center mb-1"><Globe className="mr-2 h-4 w-4" />Destination City</Label>
            <Input
              id="destinationCity"
              value={destinationCity}
              onChange={(e) => setDestinationCity(e.target.value)}
              onBlur={() => handleSave('destinationCity', destinationCity)}
              placeholder="e.g., Rome"
            />
          </div>
          <div>
            <Label htmlFor="destinationCountry" className="flex items-center mb-1"><Globe className="mr-2 h-4 w-4" />Destination Country</Label>
            <Input
              id="destinationCountry"
              value={destinationCountry}
              onChange={(e) => setDestinationCountry(e.target.value)}
              onBlur={() => handleSave('destinationCountry', destinationCountry)}
              placeholder="e.g., Italy"
            />
          </div>
        </div>

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
                    setTripStartDate(date); 
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
                     setTripEndDate(date); 
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
        
        <div className="space-y-3">
          <Label className="flex items-center mb-1 text-md font-semibold"><Users2 className="mr-2 h-5 w-5" />Member Contact Information</Label>
          {(tripData.members || []).length > 0 ? (
            <div className="space-y-2 rounded-md border p-3 bg-muted/30">
              {(tripData.members).map(member => (
                <div key={member.id} className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
                  <Label htmlFor={`contact-${member.id}`} className="w-full sm:w-1/3 mb-1 sm:mb-0 font-medium text-sm truncate">
                    {member.name}
                  </Label>
                  <div className="flex-grow relative">
                    <Phone className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      id={`contact-${member.id}`}
                      value={memberContacts[member.id] || ''}
                      onChange={(e) => handleMemberContactChange(member.id, e.target.value)}
                      onBlur={() => handleMemberContactSave(member.id)}
                      placeholder="Phone, email, or other note"
                      className="pl-8 text-sm h-9"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No members added to the trip yet.</p>
          )}
        </div>


        <div>
          <Label htmlFor="budget" className="flex items-center mb-1"><PiggyBank className="mr-2 h-4 w-4" />Overall Trip Budget ({tripData.currency})</Label>
          <Input
            id="budget"
            type="number"
            value={budget}
            onChange={handleBudgetChange}
            onBlur={handleBudgetSave}
            placeholder="e.g., 1500"
            min="0"
            step="0.01"
          />
        </div>

        <div>
          <Label htmlFor="tripNotes" className="flex items-center mb-1"><StickyNote className="mr-2 h-4 w-4" />Other Important Trip Notes</Label>
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
