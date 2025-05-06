import { useState } from "react";
import { Loader2, ArrowRight, ArrowLeft, CheckCircle, Home, Building, Palmtree, User, Users, Baby, Dog, Briefcase, Bike, Train, Car, DollarSign, Utensils, Dumbbell, Coffee, Music, BookOpen, Leaf, TreePine } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";

export interface QuizPreferences {
  residenceType: string;
  familyStatus: string;
  workStyle: string;
  outdoorSpace: number;
  budget: number;
  environment: string;
}

export interface LifestyleResult {
  completed: boolean;
  lifestyle: string;
  priorities: string[];
  preferences: QuizPreferences;
  lifestyleScore: {
    family: number;
    luxury: number;
    investment: number;
    urban: number;
    suburban: number;
    rural: number;
  };
}

interface LifestyleQuizProps {
  onComplete: (result: LifestyleResult) => void;
  onCancel: () => void;
}

export function LifestyleQuiz({ onComplete, onCancel }: LifestyleQuizProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 7;
  const [loading, setLoading] = useState(false);
  
  // Quiz answers
  const [preferences, setPreferences] = useState<QuizPreferences>({
    residenceType: "",
    familyStatus: "",
    workStyle: "",
    outdoorSpace: 3,
    budget: 500000,
    environment: ""
  });
  
  const handleChange = (key: keyof QuizPreferences, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  const handleArrayToggle = (key: keyof QuizPreferences, item: string) => {
    setPreferences(prev => {
      const currentArray = prev[key] as string[];
      const newArray = currentArray.includes(item)
        ? currentArray.filter(i => i !== item)
        : [...currentArray, item];
      
      return {
        ...prev,
        [key]: newArray
      };
    });
  };
  
  const nextStep = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      completeQuiz();
    }
  };
  
  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };
  
  const completeQuiz = () => {
    setLoading(true);
    
    // Calculate lifestyle scores based on answers
    const lifestyleScore = calculateLifestyleScore(preferences);
    
    // Determine primary lifestyle category
    const lifestyle = determinePrimaryLifestyle(lifestyleScore);
    
    // Compile priorities
    const priorities = determineTopPriorities(preferences);
    
    setTimeout(() => {
      setLoading(false);
      onComplete({
        completed: true,
        lifestyle,
        priorities,
        preferences,
        lifestyleScore
      });
    }, 1000);
  };
  
  const calculateLifestyleScore = (prefs: QuizPreferences) => {
    const scores = {
      family: 0,
      luxury: 0,
      investment: 0,
      urban: 0,
      suburban: 0,
      rural: 0
    };
    
    // Family score factors
    if (prefs.familyStatus === "couple_with_children") scores.family += 30;
    if (prefs.familyStatus === "couple_planning_children") scores.family += 20;
    if (prefs.pets) scores.family += 10;
    if (prefs.bedrooms >= 3) scores.family += 15;
    if (prefs.amenities.includes("parks")) scores.family += 10;
    if (prefs.amenities.includes("schools")) scores.family += 15;
    if (prefs.priorities.includes("space")) scores.family += 10;
    if (prefs.priorities.includes("safety")) scores.family += 10;
    
    // Luxury score factors
    if (prefs.budget > 750000) scores.luxury += 25;
    if (prefs.amenities.includes("gym")) scores.luxury += 10;
    if (prefs.amenities.includes("pool")) scores.luxury += 10;
    if (prefs.amenities.includes("restaurants")) scores.luxury += 10;
    if (prefs.priorities.includes("quality")) scores.luxury += 15;
    if (prefs.priorities.includes("prestige")) scores.luxury += 20;
    if (prefs.residenceType === "villa") scores.luxury += 10;
    
    // Investment score factors
    if (prefs.priorities.includes("investment")) scores.investment += 30;
    if (prefs.priorities.includes("value")) scores.investment += 20;
    if (prefs.residenceType === "apartment") scores.investment += 10;
    if (prefs.location === "growing") scores.investment += 15;
    if (prefs.workStyle === "rental") scores.investment += 25;
    
    // Urban score factors
    if (prefs.environment === "urban") scores.urban += 25;
    if (prefs.commute === "public_transport") scores.urban += 15;
    if (prefs.commute === "walking") scores.urban += 15;
    if (prefs.amenities.includes("restaurants")) scores.urban += 10;
    if (prefs.amenities.includes("cafes")) scores.urban += 10;
    if (prefs.amenities.includes("nightlife")) scores.urban += 15;
    if (prefs.amenities.includes("shopping")) scores.urban += 10;
    if (prefs.residenceType === "apartment") scores.urban += 10;
    if (prefs.outdoorSpace <= 2) scores.urban += 10;
    if (prefs.workStyle === "office") scores.urban += 10;
    
    // Suburban score factors
    if (prefs.environment === "suburban") scores.suburban += 25;
    if (prefs.commute === "car") scores.suburban += 15;
    if (prefs.residenceType === "house") scores.suburban += 15;
    if (prefs.familyStatus.includes("couple")) scores.suburban += 10;
    if (prefs.outdoorSpace >= 3 && prefs.outdoorSpace <= 4) scores.suburban += 15;
    if (prefs.amenities.includes("parks")) scores.suburban += 10;
    if (prefs.amenities.includes("shopping")) scores.suburban += 5;
    if (prefs.priorities.includes("community")) scores.suburban += 10;
    
    // Rural score factors
    if (prefs.environment === "rural") scores.rural += 30;
    if (prefs.commute === "car") scores.rural += 10;
    if (prefs.outdoorSpace >= 5) scores.rural += 20;
    if (prefs.residenceType === "house") scores.rural += 10;
    if (prefs.residenceType === "farm") scores.rural += 20;
    if (prefs.amenities.includes("nature")) scores.rural += 15;
    if (prefs.priorities.includes("space")) scores.rural += 15;
    if (prefs.priorities.includes("privacy")) scores.rural += 15;
    if (prefs.workStyle === "remote") scores.rural += 10;
    
    return scores;
  };
  
  const determinePrimaryLifestyle = (scores: LifestyleResult["lifestyleScore"]) => {
    const locationScores = {
      urban: scores.urban,
      suburban: scores.suburban,
      rural: scores.rural
    };
    
    // Find the location type with the highest score
    let primaryLocation = "urban";
    let maxLocationScore = 0;
    
    (Object.keys(locationScores) as Array<keyof typeof locationScores>).forEach(key => {
      if (locationScores[key] > maxLocationScore) {
        maxLocationScore = locationScores[key];
        primaryLocation = key;
      }
    });
    
    return primaryLocation;
  };
  
  const determineTopPriorities = (prefs: QuizPreferences) => {
    const priorities: string[] = [];
    
    // Add explicit priorities
    prefs.priorities.forEach(p => {
      if (!priorities.includes(p)) priorities.push(p);
    });
    
    // Add implicit priorities based on other preferences
    if (prefs.familyStatus === "couple_with_children" || prefs.familyStatus === "couple_planning_children") {
      if (!priorities.includes("family")) priorities.push("family");
    }
    
    if (prefs.budget > 750000 || prefs.residenceType === "villa") {
      if (!priorities.includes("luxury")) priorities.push("luxury");
    }
    
    if (prefs.workStyle === "rental" || prefs.priorities.includes("value")) {
      if (!priorities.includes("investment")) priorities.push("investment");
    }
    
    // Limit to top 3 priorities
    return priorities.slice(0, 3);
  };
  
  // Render the current step
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">What type of residence are you looking for?</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card 
                  className={`cursor-pointer transition-all hover:border-primary ${preferences.residenceType === "apartment" ? "border-primary bg-primary/5" : ""}`}
                  onClick={() => handleChange("residenceType", "apartment")}
                >
                  <CardContent className="pt-6 pb-4 text-center">
                    <Building className="h-8 w-8 mx-auto mb-3 text-primary" />
                    <h3 className="font-medium">Apartment</h3>
                    <p className="text-sm text-muted-foreground mt-1">Urban living with convenient amenities</p>
                  </CardContent>
                </Card>
                
                <Card 
                  className={`cursor-pointer transition-all hover:border-primary ${preferences.residenceType === "house" ? "border-primary bg-primary/5" : ""}`}
                  onClick={() => handleChange("residenceType", "house")}
                >
                  <CardContent className="pt-6 pb-4 text-center">
                    <Home className="h-8 w-8 mx-auto mb-3 text-primary" />
                    <h3 className="font-medium">House</h3>
                    <p className="text-sm text-muted-foreground mt-1">More space with private yard</p>
                  </CardContent>
                </Card>
                
                <Card 
                  className={`cursor-pointer transition-all hover:border-primary ${preferences.residenceType === "villa" ? "border-primary bg-primary/5" : ""}`}
                  onClick={() => handleChange("residenceType", "villa")}
                >
                  <CardContent className="pt-6 pb-4 text-center">
                    <Palmtree className="h-8 w-8 mx-auto mb-3 text-primary" />
                    <h3 className="font-medium">Villa</h3>
                    <p className="text-sm text-muted-foreground mt-1">Luxury living with premium amenities</p>
                  </CardContent>
                </Card>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">What's your current family status?</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <Card 
                  className={`cursor-pointer transition-all hover:border-primary ${preferences.familyStatus === "single" ? "border-primary bg-primary/5" : ""}`}
                  onClick={() => handleChange("familyStatus", "single")}
                >
                  <CardContent className="pt-6 pb-4 text-center">
                    <User className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <h3 className="font-medium">Single</h3>
                  </CardContent>
                </Card>
                
                <Card 
                  className={`cursor-pointer transition-all hover:border-primary ${preferences.familyStatus === "couple" ? "border-primary bg-primary/5" : ""}`}
                  onClick={() => handleChange("familyStatus", "couple")}
                >
                  <CardContent className="pt-6 pb-4 text-center">
                    <Users className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <h3 className="font-medium">Couple</h3>
                  </CardContent>
                </Card>
                
                <Card 
                  className={`cursor-pointer transition-all hover:border-primary ${preferences.familyStatus === "couple_planning_children" ? "border-primary bg-primary/5" : ""}`}
                  onClick={() => handleChange("familyStatus", "couple_planning_children")}
                >
                  <CardContent className="pt-6 pb-4 text-center">
                    <div className="flex justify-center items-center mb-2">
                      <Users className="h-6 w-6 text-primary" />
                      <ArrowRight className="h-4 w-4 mx-1" />
                      <Baby className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-medium">Planning Family</h3>
                  </CardContent>
                </Card>
                
                <Card 
                  className={`cursor-pointer transition-all hover:border-primary ${preferences.familyStatus === "couple_with_children" ? "border-primary bg-primary/5" : ""}`}
                  onClick={() => handleChange("familyStatus", "couple_with_children")}
                >
                  <CardContent className="pt-6 pb-4 text-center">
                    <div className="flex justify-center items-center mb-2">
                      <Users className="h-6 w-6 text-primary" />
                      <Baby className="h-5 w-5 ml-1 text-primary" />
                    </div>
                    <h3 className="font-medium">Family with Children</h3>
                  </CardContent>
                </Card>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Do you have pets or plan to have pets?</h3>
              <div className="flex gap-4">
                <Card 
                  className={`flex-1 cursor-pointer transition-all hover:border-primary ${preferences.pets ? "border-primary bg-primary/5" : ""}`}
                  onClick={() => handleChange("pets", true)}
                >
                  <CardContent className="pt-6 pb-4 text-center">
                    <Dog className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <h3 className="font-medium">Yes</h3>
                  </CardContent>
                </Card>
                
                <Card 
                  className={`flex-1 cursor-pointer transition-all hover:border-primary ${preferences.pets === false ? "border-primary bg-primary/5" : ""}`}
                  onClick={() => handleChange("pets", false)}
                >
                  <CardContent className="pt-6 pb-4 text-center">
                    <h3 className="font-medium">No</h3>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        );
        
      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">What's your work style?</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card 
                  className={`cursor-pointer transition-all hover:border-primary ${preferences.workStyle === "office" ? "border-primary bg-primary/5" : ""}`}
                  onClick={() => handleChange("workStyle", "office")}
                >
                  <CardContent className="pt-6 pb-4 text-center">
                    <Briefcase className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <h3 className="font-medium">Office Work</h3>
                    <p className="text-sm text-muted-foreground mt-1">I commute to work regularly</p>
                  </CardContent>
                </Card>
                
                <Card 
                  className={`cursor-pointer transition-all hover:border-primary ${preferences.workStyle === "remote" ? "border-primary bg-primary/5" : ""}`}
                  onClick={() => handleChange("workStyle", "remote")}
                >
                  <CardContent className="pt-6 pb-4 text-center">
                    <Home className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <h3 className="font-medium">Remote Work</h3>
                    <p className="text-sm text-muted-foreground mt-1">I work from home often</p>
                  </CardContent>
                </Card>
                
                <Card 
                  className={`cursor-pointer transition-all hover:border-primary ${preferences.workStyle === "rental" ? "border-primary bg-primary/5" : ""}`}
                  onClick={() => handleChange("workStyle", "rental")}
                >
                  <CardContent className="pt-6 pb-4 text-center">
                    <DollarSign className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <h3 className="font-medium">Investment Property</h3>
                    <p className="text-sm text-muted-foreground mt-1">For rental/investment purposes</p>
                  </CardContent>
                </Card>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">How do you prefer to commute?</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card 
                  className={`cursor-pointer transition-all hover:border-primary ${preferences.commute === "walking" ? "border-primary bg-primary/5" : ""}`}
                  onClick={() => handleChange("commute", "walking")}
                >
                  <CardContent className="pt-6 pb-4 text-center">
                    <User className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <h3 className="font-medium">Walking</h3>
                  </CardContent>
                </Card>
                
                <Card 
                  className={`cursor-pointer transition-all hover:border-primary ${preferences.commute === "cycling" ? "border-primary bg-primary/5" : ""}`}
                  onClick={() => handleChange("commute", "cycling")}
                >
                  <CardContent className="pt-6 pb-4 text-center">
                    <Bike className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <h3 className="font-medium">Cycling</h3>
                  </CardContent>
                </Card>
                
                <Card 
                  className={`cursor-pointer transition-all hover:border-primary ${preferences.commute === "public_transport" ? "border-primary bg-primary/5" : ""}`}
                  onClick={() => handleChange("commute", "public_transport")}
                >
                  <CardContent className="pt-6 pb-4 text-center">
                    <Train className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <h3 className="font-medium">Public Transport</h3>
                  </CardContent>
                </Card>
                
                <Card 
                  className={`cursor-pointer transition-all hover:border-primary ${preferences.commute === "car" ? "border-primary bg-primary/5" : ""}`}
                  onClick={() => handleChange("commute", "car")}
                >
                  <CardContent className="pt-6 pb-4 text-center">
                    <Car className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <h3 className="font-medium">Car</h3>
                  </CardContent>
                </Card>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">How important is outdoor space to you?</h3>
              <div className="px-4">
                <Slider
                  min={1}
                  max={5}
                  step={1}
                  value={[preferences.outdoorSpace]}
                  onValueChange={values => handleChange("outdoorSpace", values[0])}
                  className="my-6"
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Not important</span>
                  <span>Somewhat important</span>
                  <span>Very important</span>
                </div>
              </div>
              <div className="mt-4 bg-muted/30 p-3 rounded-md">
                <p className="text-sm">
                  {preferences.outdoorSpace === 1 && "A balcony or small outdoor area is sufficient for me."}
                  {preferences.outdoorSpace === 2 && "I'd like some outdoor space but it's not my top priority."}
                  {preferences.outdoorSpace === 3 && "I value having a decent outdoor area for relaxation."}
                  {preferences.outdoorSpace === 4 && "Outdoor space is very important to my lifestyle."}
                  {preferences.outdoorSpace === 5 && "Extensive outdoor space is essential for my happiness."}
                </p>
              </div>
            </div>
          </div>
        );
        
      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">What's your budget?</h3>
              <div className="px-4">
                <Slider
                  min={100000}
                  max={2000000}
                  step={50000}
                  value={[preferences.budget]}
                  onValueChange={values => handleChange("budget", values[0])}
                  className="my-6"
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>$100,000</span>
                  <span>$1,000,000</span>
                  <span>$2,000,000+</span>
                </div>
                <div className="text-center mt-4">
                  <span className="text-xl font-semibold">${preferences.budget.toLocaleString()}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">How many bedrooms do you need?</h3>
              <div className="grid grid-cols-5 gap-3">
                {[1, 2, 3, 4, 5].map(num => (
                  <Card 
                    key={num}
                    className={`cursor-pointer transition-all hover:border-primary ${preferences.bedrooms === num ? "border-primary bg-primary/5" : ""}`}
                    onClick={() => handleChange("bedrooms", num)}
                  >
                    <CardContent className="p-4 text-center">
                      <span className="text-xl font-semibold">{num}</span>
                      <p className="text-xs text-muted-foreground mt-1">
                        {num === 1 ? "Bedroom" : "Bedrooms"}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">What type of environment do you prefer?</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card 
                  className={`cursor-pointer transition-all hover:border-primary ${preferences.environment === "urban" ? "border-primary bg-primary/5" : ""}`}
                  onClick={() => handleChange("environment", "urban")}
                >
                  <CardContent className="pt-6 pb-4 text-center">
                    <Building className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <h3 className="font-medium">Urban</h3>
                    <p className="text-sm text-muted-foreground mt-1">City center with amenities nearby</p>
                  </CardContent>
                </Card>
                
                <Card 
                  className={`cursor-pointer transition-all hover:border-primary ${preferences.environment === "suburban" ? "border-primary bg-primary/5" : ""}`}
                  onClick={() => handleChange("environment", "suburban")}
                >
                  <CardContent className="pt-6 pb-4 text-center">
                    <Home className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <h3 className="font-medium">Suburban</h3>
                    <p className="text-sm text-muted-foreground mt-1">Residential areas with good facilities</p>
                  </CardContent>
                </Card>
                
                <Card 
                  className={`cursor-pointer transition-all hover:border-primary ${preferences.environment === "rural" ? "border-primary bg-primary/5" : ""}`}
                  onClick={() => handleChange("environment", "rural")}
                >
                  <CardContent className="pt-6 pb-4 text-center">
                    <Palmtree className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <h3 className="font-medium">Rural</h3>
                    <p className="text-sm text-muted-foreground mt-1">Countryside with peace and privacy</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        );
        
      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Which location trend interests you?</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card 
                  className={`cursor-pointer transition-all hover:border-primary ${preferences.location === "established" ? "border-primary bg-primary/5" : ""}`}
                  onClick={() => handleChange("location", "established")}
                >
                  <CardContent className="pt-6 pb-4 text-center">
                    <h3 className="font-medium">Established Areas</h3>
                    <p className="text-sm text-muted-foreground mt-2">Prestigious locations with stable property values</p>
                  </CardContent>
                </Card>
                
                <Card 
                  className={`cursor-pointer transition-all hover:border-primary ${preferences.location === "growing" ? "border-primary bg-primary/5" : ""}`}
                  onClick={() => handleChange("location", "growing")}
                >
                  <CardContent className="pt-6 pb-4 text-center">
                    <h3 className="font-medium">Up-and-Coming Areas</h3>
                    <p className="text-sm text-muted-foreground mt-2">Areas with growth potential and increasing desirability</p>
                  </CardContent>
                </Card>
                
                <Card 
                  className={`cursor-pointer transition-all hover:border-primary ${preferences.location === "convenience" ? "border-primary bg-primary/5" : ""}`}
                  onClick={() => handleChange("location", "convenience")}
                >
                  <CardContent className="pt-6 pb-4 text-center">
                    <h3 className="font-medium">Convenience-Focused</h3>
                    <p className="text-sm text-muted-foreground mt-2">Areas with excellent access to amenities and transportation</p>
                  </CardContent>
                </Card>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">What amenities are important to you?</h3>
              <p className="text-sm text-muted-foreground mb-4">Select all that apply</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { id: "parks", label: "Parks & Green Spaces", icon: <Leaf className="h-4 w-4 mr-2" /> },
                  { id: "schools", label: "Good Schools", icon: <BookOpen className="h-4 w-4 mr-2" /> },
                  { id: "shopping", label: "Shopping Centers", icon: <Shopping className="h-4 w-4 mr-2" /> },
                  { id: "restaurants", label: "Restaurants", icon: <Utensils className="h-4 w-4 mr-2" /> },
                  { id: "gym", label: "Fitness Centers", icon: <Dumbbell className="h-4 w-4 mr-2" /> },
                  { id: "cafes", label: "Cafés", icon: <Coffee className="h-4 w-4 mr-2" /> },
                  { id: "nightlife", label: "Nightlife", icon: <Music className="h-4 w-4 mr-2" /> },
                  { id: "nature", label: "Nature Access", icon: <TreePine className="h-4 w-4 mr-2" /> },
                ].map(amenity => (
                  <div 
                    key={amenity.id}
                    className={`flex items-center px-4 py-3 rounded-md cursor-pointer transition-all border ${
                      preferences.amenities.includes(amenity.id) 
                        ? "border-primary bg-primary/5" 
                        : "border-border"
                    }`}
                    onClick={() => handleArrayToggle("amenities", amenity.id)}
                  >
                    {amenity.icon}
                    <span>{amenity.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
        
      case 5:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">What are your most important priorities?</h3>
              <p className="text-sm text-muted-foreground mb-4">Select up to 3 priorities</p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { id: "space", label: "Space & Size" },
                  { id: "location", label: "Prime Location" },
                  { id: "quality", label: "Build Quality" },
                  { id: "community", label: "Community Feel" },
                  { id: "privacy", label: "Privacy" },
                  { id: "convenience", label: "Convenience" },
                  { id: "safety", label: "Safety & Security" },
                  { id: "investment", label: "Investment Value" },
                  { id: "prestige", label: "Status & Prestige" },
                  { id: "modern", label: "Modern Features" },
                  { id: "character", label: "Character & Charm" },
                  { id: "value", label: "Value for Money" }
                ].map(priority => (
                  <div 
                    key={priority.id}
                    className={`flex items-center justify-center px-4 py-3 rounded-md cursor-pointer transition-all border ${
                      preferences.priorities.includes(priority.id) 
                        ? "border-primary bg-primary/5" 
                        : "border-border"
                    } ${preferences.priorities.length >= 3 && !preferences.priorities.includes(priority.id) ? "opacity-50" : ""}`}
                    onClick={() => {
                      if (preferences.priorities.includes(priority.id) || preferences.priorities.length < 3) {
                        handleArrayToggle("priorities", priority.id);
                      }
                    }}
                  >
                    {preferences.priorities.includes(priority.id) && <CheckCircle className="h-4 w-4 mr-2 text-primary" />}
                    <span>{priority.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
        
      case 6:
        return (
          <div className="space-y-6">
            <div className="bg-muted/30 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4">Your Lifestyle Preferences Summary</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Residence Type</h4>
                    <p className="capitalize">{preferences.residenceType || "Not specified"}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Family Status</h4>
                    <p className="capitalize">{preferences.familyStatus.replace(/_/g, " ") || "Not specified"}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Work Style</h4>
                    <p className="capitalize">{preferences.workStyle || "Not specified"}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Commute Preference</h4>
                    <p className="capitalize">{preferences.commute.replace(/_/g, " ") || "Not specified"}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Budget</h4>
                    <p>${preferences.budget?.toLocaleString() || "Not specified"}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Bedrooms</h4>
                    <p>{preferences.bedrooms || "Not specified"}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Environment</h4>
                    <p className="capitalize">{preferences.environment || "Not specified"}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Outdoor Space Importance</h4>
                    <p>{preferences.outdoorSpace}/5</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Important Amenities</h4>
                  <div className="flex flex-wrap gap-2">
                    {preferences.amenities.length > 0 ? preferences.amenities.map(amenity => (
                      <Badge key={amenity} variant="secondary" className="capitalize">
                        {amenity.replace(/_/g, " ")}
                      </Badge>
                    )) : <p className="text-sm text-muted-foreground">None selected</p>}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Top Priorities</h4>
                  <div className="flex flex-wrap gap-2">
                    {preferences.priorities.length > 0 ? preferences.priorities.map(priority => (
                      <Badge key={priority} className="capitalize bg-primary text-white">
                        {priority.replace(/_/g, " ")}
                      </Badge>
                    )) : <p className="text-sm text-muted-foreground">None selected</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 7:
        return (
          <div className="text-center space-y-6">
            <div className="py-8">
              <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-semibold mb-2">Almost there!</h3>
              <p className="text-muted-foreground">
                We're ready to generate your personalized property recommendations based on your lifestyle preferences.
              </p>
            </div>
            <div className="bg-muted/30 p-6 rounded-lg text-left">
              <h3 className="font-medium mb-3">What happens next?</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-primary mt-0.5 mr-2 flex-shrink-0" />
                  <span>We'll analyze your preferences to understand your ideal lifestyle</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-primary mt-0.5 mr-2 flex-shrink-0" />
                  <span>Match you with properties that align with your lifestyle needs</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-primary mt-0.5 mr-2 flex-shrink-0" />
                  <span>Show you neighborhoods and communities that suit your preferences</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-primary mt-0.5 mr-2 flex-shrink-0" />
                  <span>You can refine your preferences at any time</span>
                </li>
              </ul>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Lifestyle Matcher Quiz</h2>
        <p className="text-muted-foreground">
          Help us understand your lifestyle preferences to find your perfect property match
        </p>
      </div>
      
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span>Step {step} of {totalSteps}</span>
          <span>{Math.round((step / totalSteps) * 100)}% Complete</span>
        </div>
        <Progress value={(step / totalSteps) * 100} className="h-2" />
      </div>
      
      <div className="min-h-[400px]">
        {renderStep()}
      </div>
      
      <div className="mt-8 flex justify-between">
        {step > 1 ? (
          <Button variant="outline" onClick={prevStep}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
        ) : (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        
        {step < totalSteps ? (
          <Button onClick={nextStep}>
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={completeQuiz} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Recommendations...
              </>
            ) : (
              <>
                Complete
                <CheckCircle className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

// Custom Shopping icon
function Shopping(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}