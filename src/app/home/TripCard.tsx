
"use client";

import type React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import type { TripData } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { Users, CalendarDays, ArrowRight } from 'lucide-react';
import type { Timestamp } from 'firebase/firestore';

interface TripCardProps {
  trip: TripData;
}

export function TripCard({ trip }: TripCardProps) {
  const lastUpdatedDate = trip.lastUpdatedAt ? (trip.lastUpdatedAt as Timestamp).toDate() : null;
  const memberCount = trip.members?.length || 0;

  return (
    <Link href={`/trip/${trip.id}`} passHref legacyBehavior>
      <a className="block group">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-200 h-full flex flex-col bg-card/80 hover:bg-card/95 cursor-pointer">
          <CardHeader>
            <CardTitle className="text-lg group-hover:text-primary transition-colors">{trip.tripName}</CardTitle>
            {lastUpdatedDate && (
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
            {trip.destinationCity && (
                <div className="flex items-center">
                    <CalendarDays className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span>{trip.destinationCity}{trip.destinationCountry ? `, ${trip.destinationCountry}` : ''}</span>
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

    