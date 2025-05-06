import { useState, useEffect } from "react";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface FilterState {
  location: string;
  minPrice: number;
  maxPrice: number;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  minArea: number;
  amenities: string[];
  forSale: boolean | undefined;
  forRent: boolean | undefined;
}

interface SearchFiltersProps {
  onFilter: (filters: FilterState) => void;
}

const propertyTypes = [
  { value: "all", label: "All Types" },
  { value: "apartment", label: "Apartment" },
  { value: "house", label: "House" },
  { value: "villa", label: "Villa" },
  { value: "office", label: "Office" },
  { value: "land", label: "Land" },
  { value: "commercial", label: "Commercial" },
];

const amenitiesList = [
  "Parking",
  "Swimming Pool",
  "Garden",
  "Gym",
  "Elevator",
  "Security",
  "Balcony",
  "Air Conditioning",
  "Furnished",
  "Pets Allowed",
];

export function SearchFilters({ onFilter }: SearchFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    location: "",
    minPrice: 0,
    maxPrice: 10000000,
    propertyType: "all",
    bedrooms: 0,
    bathrooms: 0,
    minArea: 0,
    amenities: [],
    forSale: undefined,
    forRent: undefined,
  });

  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000000]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  useEffect(() => {
    // Notify parent component of filter changes
    onFilter(filters);
  }, [filters, onFilter]);

  const handleFilterChange = (name: keyof FilterState, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePriceRangeChange = (value: number[]) => {
    setPriceRange([value[0], value[1]]);
    
    setFilters((prev) => ({
      ...prev,
      minPrice: value[0],
      maxPrice: value[1],
    }));
  };

  const toggleAmenity = (amenity: string) => {
    const newAmenities = selectedAmenities.includes(amenity)
      ? selectedAmenities.filter((a) => a !== amenity)
      : [...selectedAmenities, amenity];
    
    setSelectedAmenities(newAmenities);
    
    setFilters((prev) => ({
      ...prev,
      amenities: newAmenities,
    }));
  };

  const clearFilters = () => {
    setFilters({
      location: "",
      minPrice: 0,
      maxPrice: 10000000,
      propertyType: "all",
      bedrooms: 0,
      bathrooms: 0,
      minArea: 0,
      amenities: [],
      forSale: undefined,
      forRent: undefined,
    });
    setPriceRange([0, 1000000]);
    setSelectedAmenities([]);
  };

  return (
    <div className="bg-card border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Filters</h2>
        <Button
          variant="ghost" 
          size="sm"
          onClick={clearFilters}
          className="text-xs"
        >
          Clear all
        </Button>
      </div>

      {selectedAmenities.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {selectedAmenities.map((amenity) => (
            <Badge key={amenity} variant="secondary" className="flex items-center gap-1">
              {amenity}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => toggleAmenity(amenity)}
              />
            </Badge>
          ))}
        </div>
      )}

      <Accordion type="single" collapsible defaultValue="location" className="w-full">
        {/* Location Filter */}
        <AccordionItem value="location">
          <AccordionTrigger className="text-base font-medium">Location</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="location">City or Neighborhood</Label>
                <Input
                  id="location"
                  placeholder="e.g., Riyadh, Jeddah, etc."
                  value={filters.location}
                  onChange={(e) => handleFilterChange("location", e.target.value)}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Price Range Filter */}
        <AccordionItem value="price">
          <AccordionTrigger className="text-base font-medium">Price Range</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm">
                  SAR {priceRange[0].toLocaleString()}
                </span>
                <span className="text-sm">
                  SAR {priceRange[1].toLocaleString()}
                </span>
              </div>
              <Slider
                defaultValue={[0, 1000000]}
                min={0}
                max={10000000}
                step={50000}
                value={priceRange}
                onValueChange={handlePriceRangeChange}
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minPrice">Min Price</Label>
                  <Input
                    id="minPrice"
                    type="number"
                    value={priceRange[0]}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      handlePriceRangeChange([value, priceRange[1]]);
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="maxPrice">Max Price</Label>
                  <Input
                    id="maxPrice"
                    type="number"
                    value={priceRange[1]}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      handlePriceRangeChange([priceRange[0], value]);
                    }}
                  />
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Property Type Filter */}
        <AccordionItem value="propertyType">
          <AccordionTrigger className="text-base font-medium">Property Type</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <Select
                value={filters.propertyType}
                onValueChange={(value) => handleFilterChange("propertyType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select property type" />
                </SelectTrigger>
                <SelectContent>
                  {propertyTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Bedrooms & Bathrooms Filter */}
        <AccordionItem value="rooms">
          <AccordionTrigger className="text-base font-medium">Rooms</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="bedrooms">Minimum Bedrooms</Label>
                <Select
                  value={filters.bedrooms.toString()}
                  onValueChange={(value) => handleFilterChange("bedrooms", Number(value))}
                >
                  <SelectTrigger id="bedrooms">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Any</SelectItem>
                    <SelectItem value="1">1+</SelectItem>
                    <SelectItem value="2">2+</SelectItem>
                    <SelectItem value="3">3+</SelectItem>
                    <SelectItem value="4">4+</SelectItem>
                    <SelectItem value="5">5+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="bathrooms">Minimum Bathrooms</Label>
                <Select
                  value={filters.bathrooms?.toString() || "0"}
                  onValueChange={(value) => handleFilterChange("bathrooms", Number(value))}
                >
                  <SelectTrigger id="bathrooms">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Any</SelectItem>
                    <SelectItem value="1">1+</SelectItem>
                    <SelectItem value="2">2+</SelectItem>
                    <SelectItem value="3">3+</SelectItem>
                    <SelectItem value="4">4+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Area Filter */}
        <AccordionItem value="area">
          <AccordionTrigger className="text-base font-medium">Area</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="minArea">Minimum Area (sqm)</Label>
                <Input
                  id="minArea"
                  type="number"
                  min="0"
                  value={filters.minArea}
                  onChange={(e) => handleFilterChange("minArea", Number(e.target.value))}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Listing Type */}
        <AccordionItem value="listingType">
          <AccordionTrigger className="text-base font-medium">Listing Type</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="for-sale"
                  checked={filters.forSale === true}
                  onCheckedChange={(checked) => 
                    handleFilterChange("forSale", checked ? true : undefined)
                  }
                />
                <Label htmlFor="for-sale" className="cursor-pointer">For Sale</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="for-rent"
                  checked={filters.forRent === true}
                  onCheckedChange={(checked) => 
                    handleFilterChange("forRent", checked ? true : undefined)
                  }
                />
                <Label htmlFor="for-rent" className="cursor-pointer">For Rent</Label>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Button className="w-full mt-4" onClick={() => onFilter(filters)}>
        Apply Filters
      </Button>
    </div>
  );
}