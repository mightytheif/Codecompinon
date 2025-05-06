import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Home, Building, Castle, Users, DollarSign, X } from 'lucide-react';

export type SimpleQuizPreferences = {
  residenceType: 'apartment' | 'house' | 'villa' | '';
  familyStatus: 'single' | 'married' | 'family_with_children' | '';
  budget: number;
};

export type SimpleQuizResult = {
  completed: boolean;
  preferences: SimpleQuizPreferences;
};

interface SimplifiedLifestyleQuizProps {
  onComplete: (result: SimpleQuizResult) => void;
  onCancel: () => void;
}

export function SimplifiedLifestyleQuiz({ onComplete, onCancel }: SimplifiedLifestyleQuizProps) {
  const [step, setStep] = useState(1);
  const [preferences, setPreferences] = useState<SimpleQuizPreferences>({
    residenceType: '',
    familyStatus: '',
    budget: 0,
  });
  
  const handlePropertyTypeChange = (value: string) => {
    setPreferences(prev => ({
      ...prev,
      residenceType: value as SimpleQuizPreferences['residenceType'],
    }));
  };
  
  const handleFamilyStatusChange = (value: string) => {
    setPreferences(prev => ({
      ...prev,
      familyStatus: value as SimpleQuizPreferences['familyStatus'],
    }));
  };
  
  const handleBudgetChange = (value: string) => {
    setPreferences(prev => ({
      ...prev,
      budget: parseInt(value) || 0,
    }));
  };
  
  const nextStep = () => setStep(prev => prev + 1);
  
  const prevStep = () => setStep(prev => Math.max(1, prev - 1));
  
  const handleComplete = () => {
    onComplete({
      completed: true,
      preferences,
    });
  };
  
  return (
    <Card className="w-full max-w-4xl bg-white shadow-lg">
      <CardHeader className="relative">
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute right-2 top-2"
          onClick={onCancel}
        >
          <X className="h-4 w-4" />
        </Button>
        <CardTitle className="text-2xl">Find Your Perfect Property</CardTitle>
        <CardDescription>
          Answer these 3 simple questions to help us find properties that match your needs.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {/* Step 1: Property Type */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-lg font-medium">What type of property are you looking for?</div>
            <p className="text-sm text-muted-foreground mb-4">
              Choose the property type that best fits your lifestyle.
            </p>
            
            <RadioGroup 
              value={preferences.residenceType} 
              onValueChange={handlePropertyTypeChange}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              <Label 
                htmlFor="apartment" 
                className={`flex flex-col items-center justify-between rounded-md border-2 p-4 hover:bg-muted/50 cursor-pointer ${
                  preferences.residenceType === 'apartment' ? 'border-primary' : 'border-muted'
                }`}
              >
                <RadioGroupItem value="apartment" id="apartment" className="sr-only" />
                <Building className="h-10 w-10 mb-3 text-primary" />
                <div className="text-center">
                  <div className="font-medium">Apartment</div>
                  <div className="text-sm text-muted-foreground">Modern living spaces in multi-unit buildings</div>
                </div>
              </Label>
              
              <Label 
                htmlFor="house" 
                className={`flex flex-col items-center justify-between rounded-md border-2 p-4 hover:bg-muted/50 cursor-pointer ${
                  preferences.residenceType === 'house' ? 'border-primary' : 'border-muted'
                }`}
              >
                <RadioGroupItem value="house" id="house" className="sr-only" />
                <Home className="h-10 w-10 mb-3 text-primary" />
                <div className="text-center">
                  <div className="font-medium">House</div>
                  <div className="text-sm text-muted-foreground">Single family homes with private space</div>
                </div>
              </Label>
              
              <Label 
                htmlFor="villa" 
                className={`flex flex-col items-center justify-between rounded-md border-2 p-4 hover:bg-muted/50 cursor-pointer ${
                  preferences.residenceType === 'villa' ? 'border-primary' : 'border-muted'
                }`}
              >
                <RadioGroupItem value="villa" id="villa" className="sr-only" />
                <Castle className="h-10 w-10 mb-3 text-primary" />
                <div className="text-center">
                  <div className="font-medium">Villa</div>
                  <div className="text-sm text-muted-foreground">Luxury homes with premium amenities</div>
                </div>
              </Label>
            </RadioGroup>
          </div>
        )}
        
        {/* Step 2: Family Status */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-lg font-medium">What is your family status?</div>
            <p className="text-sm text-muted-foreground mb-4">
              This helps us determine the right size property for your needs.
            </p>
            
            <RadioGroup 
              value={preferences.familyStatus} 
              onValueChange={handleFamilyStatusChange}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              <Label 
                htmlFor="single" 
                className={`flex flex-col items-center justify-between rounded-md border-2 p-4 hover:bg-muted/50 cursor-pointer ${
                  preferences.familyStatus === 'single' ? 'border-primary' : 'border-muted'
                }`}
              >
                <RadioGroupItem value="single" id="single" className="sr-only" />
                <Users className="h-10 w-10 mb-3 text-primary" />
                <div className="text-center">
                  <div className="font-medium">Single</div>
                  <div className="text-sm text-muted-foreground">Living alone or with roommates</div>
                </div>
              </Label>
              
              <Label 
                htmlFor="married" 
                className={`flex flex-col items-center justify-between rounded-md border-2 p-4 hover:bg-muted/50 cursor-pointer ${
                  preferences.familyStatus === 'married' ? 'border-primary' : 'border-muted'
                }`}
              >
                <RadioGroupItem value="married" id="married" className="sr-only" />
                <Users className="h-10 w-10 mb-3 text-primary" />
                <div className="text-center">
                  <div className="font-medium">Married</div>
                  <div className="text-sm text-muted-foreground">Couple without children</div>
                </div>
              </Label>
              
              <Label 
                htmlFor="family_with_children" 
                className={`flex flex-col items-center justify-between rounded-md border-2 p-4 hover:bg-muted/50 cursor-pointer ${
                  preferences.familyStatus === 'family_with_children' ? 'border-primary' : 'border-muted'
                }`}
              >
                <RadioGroupItem value="family_with_children" id="family_with_children" className="sr-only" />
                <Users className="h-10 w-10 mb-3 text-primary" />
                <div className="text-center">
                  <div className="font-medium">Family with Children</div>
                  <div className="text-sm text-muted-foreground">Families needing extra space</div>
                </div>
              </Label>
            </RadioGroup>
          </div>
        )}
        
        {/* Step 3: Budget */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-lg font-medium">What's your budget?</div>
            <p className="text-sm text-muted-foreground mb-4">
              Enter your maximum budget for the property.
            </p>
            
            <div className="space-y-4">
              <Label htmlFor="budget">Maximum Budget (SAR)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">SAR</span>
                <Input
                  id="budget"
                  type="number"
                  placeholder="e.g. 500000"
                  value={preferences.budget || ''}
                  onChange={(e) => handleBudgetChange(e.target.value)}
                  className="pl-14"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2 mt-4">
                <Button variant="outline" onClick={() => handleBudgetChange('200000')}>
                  Under 200,000 SAR
                </Button>
                <Button variant="outline" onClick={() => handleBudgetChange('500000')}>
                  Under 500,000 SAR
                </Button>
                <Button variant="outline" onClick={() => handleBudgetChange('1000000')}>
                  Under 1,000,000 SAR
                </Button>
                <Button variant="outline" onClick={() => handleBudgetChange('2000000')}>
                  Under 2,000,000 SAR
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Success/Result Step */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="text-lg font-medium">Great! Here's your property criteria:</div>
            
            <div className="space-y-4">
              <div className="p-4 rounded-md bg-muted/50">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-sm font-medium">Property Type</p>
                    <p className="capitalize">{preferences.residenceType || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Family Status</p>
                    <p className="capitalize">{
                      preferences.familyStatus === 'single' ? 'Single (1 bedroom)' :
                      preferences.familyStatus === 'married' ? 'Married (1 bedroom)' :
                      preferences.familyStatus === 'family_with_children' ? 'Family with Children (2+ bedrooms)' :
                      'Not specified'
                    }</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Maximum Budget</p>
                    <p>{preferences.budget ? `${preferences.budget.toLocaleString()} SAR` : 'Not specified'}</p>
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground">
                We'll show you properties that match ALL of these criteria - exact property type, appropriate bedrooms for your family status, and within your budget.
              </p>
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        {step > 1 && step < 4 && (
          <Button variant="outline" onClick={prevStep}>
            Back
          </Button>
        )}
        
        {step === 1 && (
          <div className="flex justify-end w-full">
            <Button 
              onClick={nextStep} 
              disabled={!preferences.residenceType}
            >
              Next
            </Button>
          </div>
        )}
        
        {step === 2 && (
          <Button 
            onClick={nextStep} 
            disabled={!preferences.familyStatus}
          >
            Next
          </Button>
        )}
        
        {step === 3 && (
          <Button 
            onClick={nextStep} 
            disabled={!preferences.budget || preferences.budget <= 0}
          >
            Next
          </Button>
        )}
        
        {step === 4 && (
          <div className="flex gap-2 w-full justify-end">
            <Button variant="outline" onClick={prevStep}>
              Back
            </Button>
            <Button 
              onClick={handleComplete}
            >
              Find Properties
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}