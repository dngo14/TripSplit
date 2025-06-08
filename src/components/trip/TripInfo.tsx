
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
import { InfoIcon, Home, CalendarDays, Plane, StickyNote, Save, Globe, Users2, PiggyBank, Phone, PlaneTakeoff, PlaneLanding, Ticket, Edit } from 'lucide-react';
import { format, isValid, isDate } from 'date-fns';
import type { Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

interface TripInfoProps {
  tripData: TripData;
  onTripInfoChange: (field: keyof TripData, value: any) => void;
}

export function TripInfo({ tripData, onTripInfoChange }: TripInfoProps) {
  const [accommodationAddress, setAccommodationAddress] = useState('');
  const [tripStartDate, setTripStartDate] = useState<Date | undefined>(undefined);
  const [tripEndDate, setTripEndDate] = useState<Date | undefined>(undefined);
  
  // Flight Details State
  const [mainFlightDepartureAirline, setMainFlightDepartureAirline] = useState('');
  const [mainFlightDepartureNumber, setMainFlightDepartureNumber] = useState('');
  const [mainFlightDepartureAirport, setMainFlightDepartureAirport] = useState('');
  const [mainFlightDepartureDate, setMainFlightDepartureDate] = useState<Date | undefined>(undefined);
  const [mainFlightDepartureTime, setMainFlightDepartureTime] = useState('');
  
  const [mainFlightArrivalAirport, setMainFlightArrivalAirport] = useState('');
  const [mainFlightArrivalDate, setMainFlightArrivalDate] = useState<Date | undefined>(undefined);
  const [mainFlightArrivalTime, setMainFlightArrivalTime] = useState('');
  
  const [mainFlightConfirmation, setMainFlightConfirmation] = useState('');
  const [mainFlightNotes, setMainFlightNotes] = useState('');

  const [notes, setNotes] = useState(''); // General trip notes
  const [destinationCity, setDestinationCity] = useState('');
  const [destinationCountry, setDestinationCountry] = useState('');
  const [budget, setBudget] = useState<string>('');
  const [memberContacts, setMemberContacts] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const convertFirestoreTimestampToDate = (timestamp: Date | Timestamp | null | undefined): Date | undefined => {
    if (!timestamp) return undefined;
    if (timestamp instanceof Date) return timestamp;
    if (typeof (timestamp as Timestamp).toDate === 'function') return (timestamp as Timestamp).toDate();
    // Attempt to parse if it's a string or number, though ideally it's Date or Timestamp
    const d = new Date(timestamp as any);
    return isValid(d) ? d : undefined;
  };

  useEffect(() => {
    setAccommodationAddress(tripData.accommodationAddress || '');
    setTripStartDate(convertFirestoreTimestampToDate(tripData.tripStartDate));
    setTripEndDate(convertFirestoreTimestampToDate(tripData.tripEndDate));
    
    // Populate Flight Details
    setMainFlightDepartureAirline(tripData.mainFlightDepartureAirline || '');
    setMainFlightDepartureNumber(tripData.mainFlightDepartureNumber || '');
    setMainFlightDepartureAirport(tripData.mainFlightDepartureAirport || '');
    const depDateTime = convertFirestoreTimestampToDate(tripData.mainFlightDepartureDateTime);
    setMainFlightDepartureDate(depDateTime);
    setMainFlightDepartureTime(depDateTime ? format(depDateTime, "HH:mm") : '');

    setMainFlightArrivalAirport(tripData.mainFlightArrivalAirport || '');
    const arrDateTime = convertFirestoreTimestampToDate(tripData.mainFlightArrivalDateTime);
    setMainFlightArrivalDate(arrDateTime);
    setMainFlightArrivalTime(arrDateTime ? format(arrDateTime, "HH:mm") : '');

    setMainFlightConfirmation(tripData.mainFlightConfirmation || '');
    setMainFlightNotes(tripData.mainFlightNotes || '');

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

  const combineDateTime = (dateVal: Date | undefined, timeStr: string): Date | null => {
    if (!dateVal) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    const newDate = new Date(dateVal); // Important to create a new Date object
    if (!isNaN(hours) && !isNaN(minutes)) {
      newDate.setHours(hours, minutes, 0, 0); // Set seconds and ms to 0
      return newDate;
    }
    // if time is not set or invalid, but date is, save just the date (time will be 00:00:00 in local timezone)
    newDate.setHours(0,0,0,0);
    return newDate; 
  };

  const handleDateTimeFieldSave = (
    field: 'mainFlightDepartureDateTime' | 'mainFlightArrivalDateTime',
    dateValue: Date | undefined,
    timeValue: string
  ) => {
    const combined = combineDateTime(dateValue, timeValue);
    onTripInfoChange(field, combined);
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
        
        <Separator />
        
        {/* New Flight Details Section */}
        <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center"><Plane className="mr-2 h-5 w-5 text-primary"/>Main Flight Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                 {/* Departure Flight Info */}
                <div className="space-y-4 p-3 border rounded-md bg-muted/30">
                    <h4 className="font-medium text-md flex items-center"><PlaneTakeoff className="mr-2 h-5 w-5"/>Departure</h4>
                    <div>
                        <Label htmlFor="mainFlightDepartureAirline" className="text-xs">Airline</Label>
                        <Input id="mainFlightDepartureAirline" value={mainFlightDepartureAirline} onChange={e => setMainFlightDepartureAirline(e.target.value)} onBlur={() => handleSave('mainFlightDepartureAirline', mainFlightDepartureAirline)} placeholder="e.g., United" />
                    </div>
                    <div>
                        <Label htmlFor="mainFlightDepartureNumber" className="text-xs">Flight Number</Label>
                        <Input id="mainFlightDepartureNumber" value={mainFlightDepartureNumber} onChange={e => setMainFlightDepartureNumber(e.target.value)} onBlur={() => handleSave('mainFlightDepartureNumber', mainFlightDepartureNumber)} placeholder="e.g., UA 123" />
                    </div>
                    <div>
                        <Label htmlFor="mainFlightDepartureAirport" className="text-xs">Departure Airport</Label>
                        <Input id="mainFlightDepartureAirport" value={mainFlightDepartureAirport} onChange={e => setMainFlightDepartureAirport(e.target.value)} onBlur={() => handleSave('mainFlightDepartureAirport', mainFlightDepartureAirport)} placeholder="e.g., JFK - New York" />
                    </div>
                    <div>
                        <Label htmlFor="mainFlightDepartureDateTime" className="text-xs">Departure Date & Time</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button id="mainFlightDepartureDateTime" variant="outline" className="w-full justify-start text-left font-normal text-sm">
                                    <CalendarDays className="mr-2 h-4 w-4"/>
                                    {mainFlightDepartureDate ? `${format(mainFlightDepartureDate, "PPP")} ${mainFlightDepartureTime || '(Set Time)'}` : "Set Date & Time"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={mainFlightDepartureDate} onSelect={date => { setMainFlightDepartureDate(date); handleDateTimeFieldSave('mainFlightDepartureDateTime', date, mainFlightDepartureTime);}} initialFocus/>
                                <div className="p-2 border-t">
                                    <Input type="time" value={mainFlightDepartureTime} onChange={e => {setMainFlightDepartureTime(e.target.value); handleDateTimeFieldSave('mainFlightDepartureDateTime', mainFlightDepartureDate, e.target.value);}} />
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                {/* Arrival Flight Info */}
                 <div className="space-y-4 p-3 border rounded-md bg-muted/30">
                    <h4 className="font-medium text-md flex items-center"><PlaneLanding className="mr-2 h-5 w-5"/>Arrival</h4>
                     <div>
                        <Label htmlFor="mainFlightArrivalAirport" className="text-xs">Arrival Airport</Label>
                        <Input id="mainFlightArrivalAirport" value={mainFlightArrivalAirport} onChange={e => setMainFlightArrivalAirport(e.target.value)} onBlur={() => handleSave('mainFlightArrivalAirport', mainFlightArrivalAirport)} placeholder="e.g., LAX - Los Angeles" />
                    </div>
                    <div>
                        <Label htmlFor="mainFlightArrivalDateTime" className="text-xs">Arrival Date & Time</Label>
                         <Popover>
                            <PopoverTrigger asChild>
                                <Button id="mainFlightArrivalDateTime" variant="outline" className="w-full justify-start text-left font-normal text-sm">
                                    <CalendarDays className="mr-2 h-4 w-4"/>
                                    {mainFlightArrivalDate ? `${format(mainFlightArrivalDate, "PPP")} ${mainFlightArrivalTime || '(Set Time)'}` : "Set Date & Time"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={mainFlightArrivalDate} onSelect={date => {setMainFlightArrivalDate(date); handleDateTimeFieldSave('mainFlightArrivalDateTime', date, mainFlightArrivalTime);}} disabled={(date) => mainFlightDepartureDate ? date < mainFlightDepartureDate : false} initialFocus/>
                                <div className="p-2 border-t">
                                    <Input type="time" value={mainFlightArrivalTime} onChange={e => {setMainFlightArrivalTime(e.target.value); handleDateTimeFieldSave('mainFlightArrivalDateTime', mainFlightArrivalDate, e.target.value);}} />
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 items-end">
                <div>
                    <Label htmlFor="mainFlightConfirmation" className="flex items-center mb-1"><Ticket className="mr-2 h-4 w-4" />Booking Reference / PNR</Label>
                    <Input id="mainFlightConfirmation" value={mainFlightConfirmation} onChange={e => setMainFlightConfirmation(e.target.value)} onBlur={() => handleSave('mainFlightConfirmation', mainFlightConfirmation)} placeholder="e.g., ABC123XYZ"/>
                </div>
            </div>
             <div>
                <Label htmlFor="mainFlightNotes" className="flex items-center mb-1"><Edit className="mr-2 h-4 w-4" />Flight Notes</Label>
                <Textarea id="mainFlightNotes" value={mainFlightNotes} onChange={e => setMainFlightNotes(e.target.value)} onBlur={() => handleSave('mainFlightNotes', mainFlightNotes)} placeholder="e.g., Seat numbers, baggage allowance, layover info" rows={2}/>
            </div>
        </div>
        
        <Separator />
        
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
            id="tripNotes" // This refers to the general tripData.notes
            value={notes} // Uses the 'notes' state variable meant for general trip notes
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
