import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Building, Home, Sparkles, Map, ListFilter, RefreshCcw } from 'lucide-react';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../firebase';
import type { Property } from '@/types/property';
import { PropertyCard } from '@/components/ui/property-card';
import { PropertyMap } from '@/components/ui/property-map';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SimplifiedLifestyleQuiz, type SimpleQuizResult } from '@/components/ui/simplified-lifestyle-quiz';

export default function LifestylePage() {
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [showQuiz, setShowQuiz] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  
  // User preferences for manual filtering
  const [userPreferences, setUserPreferences] = useState({
    propertyType: "",
    budget: 0,
    bedrooms: 0,
    location: "",
  });
  
  // User quiz results
  const [quizResults, setQuizResults] = useState<SimpleQuizResult | null>(null);
  
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        // First try to use the API endpoint to get properties
        try {
          console.log("Trying to fetch properties from API...");
          // Add timestamp to prevent caching
          const response = await fetch(`/api/properties?timestamp=${Date.now()}`);
          if (response.ok) {
            const data = await response.json();
            console.log(`Fetched ${data.length} properties from API before filtering`);
            
            // Apply client-side filtering to ensure only approved properties are displayed
            const filteredData = data.filter((property: any) => {
              // Only show properties that are both verified=true AND have approved status
              const isVerified = property.verified === true;
              const hasApprovedStatus = property.status === "approved" || property.status === "active";
              
              // Log the filtering for debugging
              console.log(`Filtering property ${property.id}: verified=${isVerified}, status=${property.status}`);
              
              // Must meet BOTH conditions to be displayed
              return isVerified && hasApprovedStatus;
            });
            
            console.log(`Filtered from ${data.length} to ${filteredData.length} properties`);
            
            setProperties(filteredData);
            setFilteredProperties(filteredData); // Initially show all approved properties
            setLoading(false);
            return; // Exit early if successful
          }
        } catch (apiError) {
          console.error("Error fetching from API, falling back to Firebase:", apiError);
        }
        
        // Fallback to Firebase if API fails
        console.log("Falling back to Firebase direct access...");
        const propertiesRef = collection(db, "properties");
        const q = query(propertiesRef, limit(50));
        
        const querySnapshot = await getDocs(q);
        const propertiesList: Property[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data() as Property;
          
          // Only include properties that are both verified AND approved/active
          const isVerified = data.verified === true;
          const hasApprovedStatus = data.status === "approved" || data.status === "active";
          
          // Skip properties that don't meet our criteria
          if (!isVerified || !hasApprovedStatus) {
            console.log(`Skipping unapproved property from Firebase: ${doc.id}`);
            return;
          }
          
          propertiesList.push({
            ...data,
            id: doc.id
          });
        });
        
        console.log(`Fetched ${propertiesList.length} approved properties from Firebase directly`);
        setProperties(propertiesList);
        setFilteredProperties(propertiesList); // Initially show only approved properties
      } catch (error) {
        console.error("Error fetching properties:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProperties();
  }, []);
  
  // Apply strict filters based on the simplified quiz results
  const applyQuizFilters = (properties: Property[], quizResults: SimpleQuizResult) => {
    if (!quizResults?.completed || !quizResults.preferences) {
      return properties;
    }
    
    console.log("Applying strict quiz filters:", quizResults.preferences);
    
    let filtered = [...properties];
    
    // Filter 1: Property Type (exact match)
    if (quizResults.preferences.residenceType) {
      filtered = filtered.filter(property => 
        property.propertyType.toLowerCase() === quizResults.preferences.residenceType.toLowerCase()
      );
      console.log(`After property type filter (${quizResults.preferences.residenceType}): ${filtered.length} properties`);
    }
    
    // Filter 2: Family Status affects bedroom count
    if (quizResults.preferences.familyStatus) {
      if (quizResults.preferences.familyStatus === 'family_with_children') {
        // Family with children needs 2+ bedrooms
        filtered = filtered.filter(property => property.bedrooms >= 2);
        console.log(`After family status filter (family_with_children): ${filtered.length} properties`);
      } else if (quizResults.preferences.familyStatus === 'single' || quizResults.preferences.familyStatus === 'married') {
        // Single or married individuals need exactly 1 bedroom
        filtered = filtered.filter(property => property.bedrooms === 1);
        console.log(`After family status filter (single/married): ${filtered.length} properties`);
      }
    }
    
    // Filter 3: Budget (strict match - must be within budget)
    if (quizResults.preferences.budget > 0) {
      filtered = filtered.filter(property => property.price <= quizResults.preferences.budget);
      console.log(`After budget filter (${quizResults.preferences.budget}): ${filtered.length} properties`);
    }
    
    return filtered;
  };
  
  // Handle quiz completion
  const handleQuizComplete = (result: SimpleQuizResult) => {
    setQuizResults(result);
    setShowQuiz(false);
    
    // Apply filters based on quiz results
    if (result.completed && result.preferences) {
      const filteredResults = applyQuizFilters(properties, result);
      setFilteredProperties(filteredResults);
      
      // Update user preferences to match quiz results for synchronization
      setUserPreferences({
        propertyType: result.preferences.residenceType || "",
        budget: result.preferences.budget || 0,
        bedrooms: result.preferences.familyStatus === 'family_with_children' ? 2 : 1,
        location: "",
      });
    }
  };
  
  // Handle manual filter changes
  const handlePreferenceChange = (key: keyof typeof userPreferences, value: any) => {
    setUserPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // Apply manual filters
  const applyManualFilters = () => {
    let filtered = [...properties];
    
    // Property Type filter (exact match)
    if (userPreferences.propertyType) {
      filtered = filtered.filter(p => 
        p.propertyType.toLowerCase() === userPreferences.propertyType.toLowerCase()
      );
    }
    
    // Bedrooms filter
    if (userPreferences.bedrooms > 0) {
      if (userPreferences.bedrooms === 1) {
        // Exactly 1 bedroom (for Single/Married)
        filtered = filtered.filter(p => p.bedrooms === 1);
      } else {
        // 2+ bedrooms (for family with children)
        filtered = filtered.filter(p => p.bedrooms >= userPreferences.bedrooms);
      }
    }
    
    // Budget filter (strict match - must be within budget)
    if (userPreferences.budget > 0) {
      filtered = filtered.filter(p => p.price <= userPreferences.budget);
    }
    
    // Location filter
    if (userPreferences.location) {
      filtered = filtered.filter(p => 
        p.location.toLowerCase().includes(userPreferences.location.toLowerCase())
      );
    }
    
    setFilteredProperties(filtered);
    
    // Clear quiz results when manually filtering
    setQuizResults(null);
  };
  
  // Reset all filters
  const resetFilters = () => {
    setUserPreferences({
      propertyType: "",
      budget: 0,
      bedrooms: 0,
      location: "",
    });
    
    setQuizResults(null);
    setFilteredProperties(properties);
  };
  
  if (loading) {
    return (
      <div className="container py-10 flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="container py-8">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold mb-4">Find Your Ideal Property</h1>
        <p className="text-muted-foreground max-w-3xl mx-auto mb-6">
          Take our simple quiz to find properties that match your specific needs.
          Our property matching system uses three exact filters to show you perfect matches.
        </p>
        
        <Button 
          size="lg" 
          onClick={() => setShowQuiz(true)}
          className="bg-primary hover:bg-primary/90"
        >
          <Sparkles className="mr-2 h-5 w-5" />
          Take Property Quiz
        </Button>
      </div>
      
      {/* Simplified Lifestyle Quiz Modal */}
      {showQuiz && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl overflow-hidden">
            <SimplifiedLifestyleQuiz
              onComplete={handleQuizComplete}
              onCancel={() => setShowQuiz(false)}
            />
          </div>
        </div>
      )}
      
      {/* Quiz Results Summary */}
      {quizResults?.completed && (
        <div className="mb-8 p-6 rounded-lg bg-muted/30">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Your Property Preferences</h2>
            <Button variant="outline" size="sm" onClick={() => setShowQuiz(true)}>
              <Sparkles className="mr-2 h-4 w-4" />
              Retake Quiz
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {quizResults.preferences.residenceType && (
              <Badge variant="secondary" className="capitalize">
                {quizResults.preferences.residenceType} Type
              </Badge>
            )}
            
            {quizResults.preferences.familyStatus && (
              <Badge variant="secondary">
                {quizResults.preferences.familyStatus === "single" ? "Single (1 bedroom)" :
                 quizResults.preferences.familyStatus === "married" ? "Married (1 bedroom)" :
                 quizResults.preferences.familyStatus === "family_with_children" ? "Family with Children (2+ bedrooms)" : ""}
              </Badge>
            )}
            
            {quizResults.preferences.budget > 0 && (
              <Badge variant="secondary">
                Budget: {quizResults.preferences.budget.toLocaleString()} SAR
              </Badge>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground">
            Showing properties that match <strong>all</strong> of your selected criteria. The system is 
            filtering for exact property type matches, appropriate bedroom count based on your family status, 
            and properties within your budget.
          </p>
        </div>
      )}
      
      {/* Manual Filter Section */}
      <div className="mb-8 p-6 border rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Filter Properties</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={resetFilters}
            className="text-muted-foreground"
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <Label htmlFor="propertyType" className="mb-2 block">Property Type</Label>
            <Select 
              value={userPreferences.propertyType} 
              onValueChange={(value) => handlePreferenceChange('propertyType', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="apartment">Apartment</SelectItem>
                <SelectItem value="house">House</SelectItem>
                <SelectItem value="villa">Villa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="bedrooms" className="mb-2 block">Bedrooms</Label>
            <Select 
              value={userPreferences.bedrooms.toString()} 
              onValueChange={(value) => handlePreferenceChange('bedrooms', parseInt(value) || 0)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Any</SelectItem>
                <SelectItem value="1">1 bedroom</SelectItem>
                <SelectItem value="2">2+ bedrooms</SelectItem>
                <SelectItem value="3">3+ bedrooms</SelectItem>
                <SelectItem value="4">4+ bedrooms</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="budget" className="mb-2 block">Max Budget (SAR)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">SAR</span>
              <Input
                id="budget"
                type="number"
                placeholder="e.g. 500000"
                value={userPreferences.budget || ''}
                onChange={(e) => handlePreferenceChange('budget', parseFloat(e.target.value) || 0)}
                className="pl-14"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="location" className="mb-2 block">Location</Label>
            <Input
              id="location"
              placeholder="e.g. Riyadh, Jeddah"
              value={userPreferences.location}
              onChange={(e) => handlePreferenceChange('location', e.target.value)}
            />
          </div>
        </div>
        
        <Button onClick={applyManualFilters}>Apply Filters</Button>
      </div>
      
      {/* Toggle view type */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">
          {filteredProperties.length > 0 
            ? `${filteredProperties.length} Properties Found` 
            : "No Properties Found"}
        </h2>
        <div className="flex space-x-2">
          <Button 
            variant={viewMode === 'list' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <ListFilter className="h-4 w-4 mr-2" />
            List View
          </Button>
          <Button 
            variant={viewMode === 'map' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setViewMode('map')}
          >
            <Map className="h-4 w-4 mr-2" />
            Map View
          </Button>
        </div>
      </div>
      
      {/* No properties found message */}
      {filteredProperties.length === 0 && (
        <div className="text-center py-16 border rounded-lg bg-muted/10">
          <p className="text-muted-foreground mb-4">
            No properties found matching your criteria. Try adjusting your filters for more results.
          </p>
          <Button variant="outline" onClick={resetFilters}>Reset Filters</Button>
        </div>
      )}
      
      {/* Properties grid (List View) */}
      {viewMode === 'list' && filteredProperties.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map(property => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
      
      {/* Map view */}
      {viewMode === 'map' && filteredProperties.length > 0 && (
        <div className="h-[70vh] w-full rounded-lg overflow-hidden border">
          <PropertyMap 
            properties={filteredProperties}
            height="70vh"
          />
        </div>
      )}
    </div>
  );
}