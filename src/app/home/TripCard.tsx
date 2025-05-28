
"use client";

import type React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import type { TripData } from '@/lib/types';
import { format, formatDistanceToNow, isValid, isDate } from 'date-fns';
import { Users, CalendarDays, MapPin, ArrowRight } from 'lucide-react';
import type { Timestamp } from 'firebase/firestore';

interface TripCardProps {
  trip: TripData;
}

export function TripCard({ trip }: TripCardProps) {
  const lastUpdatedDate = trip.lastUpdatedAt instanceof Date ? trip.lastUpdatedAt : (trip.lastUpdatedAt as Timestamp)?.toDate?.();
  const memberCount = trip.members?.length || 0;

  const formatTripDate = (dateValue: Date | Timestamp | null | undefined): Date | null => {
    if (!dateValue) return null;
    if (dateValue instanceof Date) return dateValue;
    if (typeof (dateValue as Timestamp)?.toDate === 'function') return (dateValue as Timestamp).toDate();
    return null;
  };

  const startDate = formatTripDate(trip.tripStartDate);
  const endDate = formatTripDate(trip.tripEndDate);

  let tripDateDisplay = null;
  if (startDate && isValid(startDate) && endDate && isValid(endDate)) {
    if (format(startDate, 'yyyy-MM-dd') === format(endDate, 'yyyy-MM-dd')) {
      tripDateDisplay = format(startDate, 'MMM d, yyyy');
    } else {
      tripDateDisplay = `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;
    }
  } else if (startDate && isValid(startDate)) {
    tripDateDisplay = `Starts: ${format(startDate, 'MMM d, yyyy')}`;
  } else if (endDate && isValid(endDate)) {
    tripDateDisplay = `Ends: ${format(endDate, 'MMM d, yyyy')}`;
  }


  const destinationDisplay = [trip.destinationCity, trip.destinationCountry].filter(Boolean).join(', ');

  return (
    <Link href={`/trip/${trip.id}`} passHref legacyBehavior>
      <a className="block group">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-200 h-full flex flex-col bg-card/80 hover:bg-card/95 cursor-pointer">
          <CardHeader>
            <CardTitle className="text-lg group-hover:text-primary transition-colors">{trip.tripName}</CardTitle>
            {lastUpdatedDate && isValid(lastUpdatedDate) && (
              <CardDescription className="text-xs">
                Last updated: {formatDistanceToNow(lastUpdatedDate, { addSuffix: true })}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="flex-grow space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center">
              <Users className="mr-2 h-4 w-4 flex-shrink-0" />
              <span>{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
            </div>
            {destinationDisplay && (
                <div className="flex items-center">
                    <MapPin className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span>{destinationDisplay}</span>
                </div>
            )}
            {tripDateDisplay && (
                <div className="flex items-center">
                    <CalendarDays className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span>{tripDateDisplay}</span>
                </div>
            )}
          </CardContent>
          <div className="p-4 pt-2 flex justify-end items-center text-primary group-hover:underline">
            View Trip <ArrowRight className="ml-1 h-4 w-4" />
          </div>
        </Card>
      </a>
    </Link>
  );
}
