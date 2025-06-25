
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
        <Card className="relative overflow-hidden bg-gradient-to-br from-card to-card/80 shadow-lg hover:shadow-2xl transition-all duration-300 h-full flex flex-col cursor-pointer border border-border/50 hover:border-primary/30 group-hover:scale-[1.02] transform-gpu">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <CardHeader className="relative z-10 pb-4">
            <div className="flex items-start justify-between gap-3">
              <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors duration-200 leading-tight">
                {trip.tripName}
              </CardTitle>
              {lastUpdatedDate && isValid(lastUpdatedDate) && (
                <div className="flex-shrink-0 px-2 py-1 bg-secondary/50 rounded-full">
                  <CardDescription className="text-xs font-medium">
                    {formatDistanceToNow(lastUpdatedDate, { addSuffix: true })}
                  </CardDescription>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="relative z-10 flex-grow space-y-4 pb-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-foreground/80">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <span className="font-medium">{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
              </div>
              {destinationDisplay && (
                <div className="flex items-center gap-3 text-sm text-foreground/80">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-medium truncate">{destinationDisplay}</span>
                </div>
              )}
              {tripDateDisplay && (
                <div className="flex items-center gap-3 text-sm text-foreground/80">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <CalendarDays className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-medium">{tripDateDisplay}</span>
                </div>
              )}
            </div>
          </CardContent>
          <div className="relative z-10 border-t border-border/30 bg-secondary/20 px-6 py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground/70">View Details</span>
              <div className="flex items-center gap-2 text-primary group-hover:gap-3 transition-all duration-200">
                <span className="text-sm font-semibold">Open Trip</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
              </div>
            </div>
          </div>
        </Card>
      </a>
    </Link>
  );
}
