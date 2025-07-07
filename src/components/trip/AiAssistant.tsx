"use client";

import type React from 'react';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  Wand2,
  MapPin,
  UtensilsCrossed,
  Calendar,
  DollarSign,
  TrendingUp,
  Loader2,
  AlertCircle,
  Sparkles,
  Clock
} from 'lucide-react';

import { suggestTripIdeas, type SuggestTripIdeasInput } from '@/ai/flows/suggest-trip-ideas';
import { generateItinerary, type GenerateItineraryInput, type GenerateItineraryOutput } from '@/ai/flows/generate-itinerary';
import { optimizeExpenses, type OptimizeExpensesInput, type OptimizeExpensesOutput } from '@/ai/flows/optimize-expenses';
import { getRestaurantRecommendations, type RestaurantRecommendationsInput, type RestaurantRecommendationsOutput } from '@/ai/flows/restaurant-recommendations';
import type { TripData } from '@/lib/types';

interface AiAssistantProps {
  tripData?: TripData;
}

export function AiAssistant({ tripData }: AiAssistantProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFeature, setActiveFeature] = useState<string>('trip-ideas');
  const { toast } = useToast();

  // Trip Ideas States
  const [tripIdeasForm, setTripIdeasForm] = useState({
    destination: '',
    interests: '',
    durationDays: 7,
    budgetPreference: '',
  });
  const [tripIdeasResult, setTripIdeasResult] = useState<any>(null);

  // Itinerary States  
  const [itineraryForm, setItineraryForm] = useState({
    destination: tripData?.destinationCity || '',
    durationDays: 5,
    interests: '',
    budgetPreference: '',
    travelStyle: '',
  });
  const [itineraryResult, setItineraryResult] = useState<GenerateItineraryOutput | null>(null);

  // Restaurant States
  const [restaurantForm, setRestaurantForm] = useState({
    destination: tripData?.destinationCity || '',
    cuisinePreferences: '',
    budgetPreference: '',
    dietaryRestrictions: '',
  });
  const [restaurantResult, setRestaurantResult] = useState<RestaurantRecommendationsOutput | null>(null);

  // Expense Analysis States
  const [expenseResult, setExpenseResult] = useState<OptimizeExpensesOutput | null>(null);

  const handleTripIdeas = async () => {
    if (!tripIdeasForm.destination.trim() || !tripIdeasForm.interests.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please provide both destination and interests.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const input: SuggestTripIdeasInput = {
        destination: tripIdeasForm.destination,
        interests: tripIdeasForm.interests,
        durationDays: tripIdeasForm.durationDays,
        budgetPreference: tripIdeasForm.budgetPreference || undefined,
      };
      const result = await suggestTripIdeas(input);
      setTripIdeasResult(result);
      toast({ title: 'Success!', description: 'AI trip ideas generated successfully.' });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate trip ideas';
      setError(errorMessage);
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateItinerary = async () => {
    if (!itineraryForm.destination.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please provide a destination.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const input: GenerateItineraryInput = {
        destination: itineraryForm.destination,
        durationDays: itineraryForm.durationDays,
        interests: itineraryForm.interests || 'general sightseeing',
        budgetPreference: itineraryForm.budgetPreference || undefined,
        travelStyle: itineraryForm.travelStyle || undefined,
      };
      const result = await generateItinerary(input);
      setItineraryResult(result);
      toast({ title: 'Success!', description: 'Itinerary generated successfully.' });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate itinerary';
      setError(errorMessage);
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestaurantRecommendations = async () => {
    if (!restaurantForm.destination.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please provide a destination.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const input: RestaurantRecommendationsInput = {
        destination: restaurantForm.destination,
        cuisinePreferences: restaurantForm.cuisinePreferences || undefined,
        budgetPreference: restaurantForm.budgetPreference || undefined,
        dietaryRestrictions: restaurantForm.dietaryRestrictions || undefined,
      };
      const result = await getRestaurantRecommendations(input);
      setRestaurantResult(result);
      toast({ title: 'Success!', description: 'Restaurant recommendations generated successfully.' });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get restaurant recommendations';
      setError(errorMessage);
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExpenseAnalysis = async () => {
    if (!tripData?.expenses || tripData.expenses.length === 0) {
      toast({
        title: 'No Expenses',
        description: 'Add some expenses to your trip to get AI analysis.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const expenses = tripData.expenses
        .filter(e => e.category !== 'Settlement Payment')
        .map(e => ({
          description: e.description,
          amount: e.amount,
          category: e.category || 'Other',
          paidBy: tripData.members.find(m => m.id === e.paidById)?.name || 'Unknown',
        }));

      const input: OptimizeExpensesInput = {
        expenses,
        budget: tripData.budget || undefined,
        currency: tripData.currency,
      };
      const result = await optimizeExpenses(input);
      setExpenseResult(result);
      toast({ title: 'Success!', description: 'Expense analysis completed successfully.' });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze expenses';
      setError(errorMessage);
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <Sparkles className="mr-3 h-7 w-7 text-primary" />
            AI Travel Assistant
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeFeature} onValueChange={setActiveFeature}>
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
              <TabsTrigger value="trip-ideas" className="flex items-center">
                <MapPin className="mr-2 h-4 w-4" />
                Trip Ideas
              </TabsTrigger>
              <TabsTrigger value="itinerary" className="flex items-center">
                <Calendar className="mr-2 h-4 w-4" />
                Itinerary
              </TabsTrigger>
              <TabsTrigger value="restaurants" className="flex items-center">
                <UtensilsCrossed className="mr-2 h-4 w-4" />
                Restaurants
              </TabsTrigger>
              <TabsTrigger value="expenses" className="flex items-center">
                <TrendingUp className="mr-2 h-4 w-4" />
                Expense Analysis
              </TabsTrigger>
            </TabsList>

            {error && (
              <Alert variant="destructive" className="mt-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <TabsContent value="trip-ideas" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="trip-destination">Destination</Label>
                  <Input
                    id="trip-destination"
                    value={tripIdeasForm.destination}
                    onChange={(e) => setTripIdeasForm({ ...tripIdeasForm, destination: e.target.value })}
                    placeholder="e.g., Tokyo, Japan"
                  />
                </div>
                <div>
                  <Label htmlFor="trip-duration">Duration (days)</Label>
                  <Input
                    id="trip-duration"
                    type="number"
                    value={tripIdeasForm.durationDays}
                    onChange={(e) => setTripIdeasForm({ ...tripIdeasForm, durationDays: parseInt(e.target.value) || 7 })}
                    min="1"
                    max="30"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="trip-interests">Interests</Label>
                <Textarea
                  id="trip-interests"
                  value={tripIdeasForm.interests}
                  onChange={(e) => setTripIdeasForm({ ...tripIdeasForm, interests: e.target.value })}
                  placeholder="e.g., culture, food, history, nature"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="trip-budget">Budget Preference (optional)</Label>
                <Input
                  id="trip-budget"
                  value={tripIdeasForm.budgetPreference}
                  onChange={(e) => setTripIdeasForm({ ...tripIdeasForm, budgetPreference: e.target.value })}
                  placeholder="e.g., budget-friendly, moderate, luxury"
                />
              </div>
              <Button onClick={handleTripIdeas} disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Ideas...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Get Trip Ideas
                  </>
                )}
              </Button>

              {tripIdeasResult && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>{tripIdeasResult.suggestedTitle}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground italic mb-4">{tripIdeasResult.tripTheme}</p>
                    <h4 className="font-semibold mb-2">Suggested Activities:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {tripIdeasResult.activitySuggestions.map((activity: string, index: number) => (
                        <li key={index} className="text-sm">{activity}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="itinerary" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="itinerary-destination">Destination</Label>
                  <Input
                    id="itinerary-destination"
                    value={itineraryForm.destination}
                    onChange={(e) => setItineraryForm({ ...itineraryForm, destination: e.target.value })}
                    placeholder="e.g., Barcelona, Spain"
                  />
                </div>
                <div>
                  <Label htmlFor="itinerary-duration">Duration (days)</Label>
                  <Input
                    id="itinerary-duration"
                    type="number"
                    value={itineraryForm.durationDays}
                    onChange={(e) => setItineraryForm({ ...itineraryForm, durationDays: parseInt(e.target.value) || 5 })}
                    min="1"
                    max="14"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="itinerary-interests">Interests & Preferences</Label>
                <Textarea
                  id="itinerary-interests"
                  value={itineraryForm.interests}
                  onChange={(e) => setItineraryForm({ ...itineraryForm, interests: e.target.value })}
                  placeholder="e.g., art museums, local cuisine, nightlife, outdoor activities"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="itinerary-budget">Budget Preference</Label>
                  <Input
                    id="itinerary-budget"
                    value={itineraryForm.budgetPreference}
                    onChange={(e) => setItineraryForm({ ...itineraryForm, budgetPreference: e.target.value })}
                    placeholder="e.g., budget, moderate, luxury"
                  />
                </div>
                <div>
                  <Label htmlFor="itinerary-style">Travel Style</Label>
                  <Input
                    id="itinerary-style"
                    value={itineraryForm.travelStyle}
                    onChange={(e) => setItineraryForm({ ...itineraryForm, travelStyle: e.target.value })}
                    placeholder="e.g., relaxed, active, cultural"
                  />
                </div>
              </div>
              <Button onClick={handleGenerateItinerary} disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Itinerary...
                  </>
                ) : (
                  <>
                    <Calendar className="mr-2 h-4 w-4" />
                    Generate Itinerary
                  </>
                )}
              </Button>

              {itineraryResult && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>{itineraryResult.destination} Itinerary</CardTitle>
                    <p className="text-muted-foreground">{itineraryResult.overview}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-secondary/20 rounded-lg">
                      <div>
                        <strong>Total Cost:</strong> {itineraryResult.totalEstimatedCost}
                      </div>
                      <div>
                        <strong>Best Time:</strong> {itineraryResult.bestTimeToVisit}
                      </div>
                    </div>
                    
                    {itineraryResult.days.map((day) => (
                      <Card key={day.day} className="border-l-4 border-l-primary">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">Day {day.day}: {day.theme}</CardTitle>
                          <p className="text-sm text-muted-foreground">Budget: {day.dailyBudget}</p>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {day.activities.map((activity, idx) => (
                              <div key={idx} className="border-l-2 border-l-secondary pl-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h5 className="font-medium flex items-center">
                                      <Clock className="mr-2 h-4 w-4 text-primary" />
                                      {activity.time} - {activity.activity}
                                    </h5>
                                    <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                                    {activity.tips && (
                                      <p className="text-xs text-primary mt-1">💡 {activity.tips}</p>
                                    )}
                                  </div>
                                  <div className="text-sm font-medium text-right ml-4">
                                    {activity.estimatedCost}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {itineraryResult.generalTips.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Travel Tips</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            {itineraryResult.generalTips.map((tip, idx) => (
                              <li key={idx}>{tip}</li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="restaurants" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="restaurant-destination">Destination</Label>
                  <Input
                    id="restaurant-destination"
                    value={restaurantForm.destination}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, destination: e.target.value })}
                    placeholder="e.g., Paris, France"
                  />
                </div>
                <div>
                  <Label htmlFor="restaurant-budget">Budget Preference</Label>
                  <Input
                    id="restaurant-budget"
                    value={restaurantForm.budgetPreference}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, budgetPreference: e.target.value })}
                    placeholder="e.g., budget, moderate, upscale"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="restaurant-cuisine">Cuisine Preferences</Label>
                <Input
                  id="restaurant-cuisine"
                  value={restaurantForm.cuisinePreferences}
                  onChange={(e) => setRestaurantForm({ ...restaurantForm, cuisinePreferences: e.target.value })}
                  placeholder="e.g., local specialties, Italian, vegetarian"
                />
              </div>
              <div>
                <Label htmlFor="restaurant-dietary">Dietary Restrictions</Label>
                <Input
                  id="restaurant-dietary"
                  value={restaurantForm.dietaryRestrictions}
                  onChange={(e) => setRestaurantForm({ ...restaurantForm, dietaryRestrictions: e.target.value })}
                  placeholder="e.g., vegetarian, gluten-free, halal"
                />
              </div>
              <Button onClick={handleRestaurantRecommendations} disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Finding Restaurants...
                  </>
                ) : (
                  <>
                    <UtensilsCrossed className="mr-2 h-4 w-4" />
                    Get Restaurant Recommendations
                  </>
                )}
              </Button>

              {restaurantResult && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {restaurantResult.recommendations.map((restaurant, idx) => (
                      <Card key={idx} className="h-full">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center justify-between">
                            {restaurant.name}
                            <span className="text-sm font-normal text-primary">{restaurant.priceRange}</span>
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">{restaurant.cuisine} • {restaurant.location}</p>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm mb-3">{restaurant.description}</p>
                          <div className="bg-secondary/20 p-3 rounded-lg mb-3">
                            <p className="text-sm font-medium">Must Try:</p>
                            <p className="text-sm text-muted-foreground">{restaurant.mustTry}</p>
                          </div>
                          {restaurant.tips && (
                            <p className="text-xs text-primary">💡 {restaurant.tips}</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {restaurantResult.localFoodTips.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Local Food Tips</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {restaurantResult.localFoodTips.map((tip, idx) => (
                            <li key={idx}>{tip}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="expenses" className="space-y-6">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  Analyze your trip expenses and get AI-powered optimization suggestions.
                </p>
                {tripData?.expenses && tripData.expenses.length > 0 ? (
                  <div className="bg-secondary/20 p-4 rounded-lg mb-4">
                    <p className="text-sm">
                      <strong>{tripData.expenses.filter(e => e.category !== 'Settlement Payment').length}</strong> expenses found
                      {tripData.budget && (
                        <> • Budget: {tripData.currency} {tripData.budget}</>
                      )}
                    </p>
                  </div>
                ) : (
                  <Alert className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Add some expenses to your trip to enable AI expense analysis.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              
              <Button 
                onClick={handleExpenseAnalysis} 
                disabled={isLoading || !tripData?.expenses || tripData.expenses.length === 0} 
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing Expenses...
                  </>
                ) : (
                  <>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Analyze Trip Expenses
                  </>
                )}
              </Button>

              {expenseResult && (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center">
                        <DollarSign className="mr-2 h-5 w-5 text-green-600" />
                        Optimization Suggestions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg mb-4">
                        <p className="font-medium text-green-800 dark:text-green-200">
                          Potential Savings: {expenseResult.totalSavings}
                        </p>
                      </div>
                      <ul className="space-y-2">
                        {expenseResult.suggestions.map((suggestion, idx) => (
                          <li key={idx} className="text-sm border-l-2 border-l-primary pl-3">
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Category Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {expenseResult.categoryAnalysis.map((category, idx) => (
                          <div key={idx} className="border rounded-lg p-3">
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="font-medium">{category.category}</h4>
                              <span className="text-sm font-medium">
                                {tripData?.currency} {category.totalSpent.toFixed(2)}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">{category.suggestion}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {expenseResult.budgetAnalysis && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Budget Analysis</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">{expenseResult.budgetAnalysis}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}