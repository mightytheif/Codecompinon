import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Property } from "@/types/property";
import { PropertyCard } from "@/components/ui/property-card";
import { SearchFilters } from "@/components/ui/search-filters";
import { PropertyMap } from "@/components/ui/property-map";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { List, MapPin, Loader2, SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Helper function to transform server properties to match the expected Property type
const mapToClientProperty = (property: any): Property => {
  const mappedProperty: Property = {
    id: property.id?.toString() || "",
    title: property.title || "",
    description: property.description || "",
    price: property.price || 0,
    location: property.location || "",
    bedrooms: property.bedrooms || 0,
    bathrooms: property.bathrooms || 0,
    area: property.area || 0,
    propertyType: property.propertyType || "apartment", // Prioritize direct propertyType field
    forSale: property.forSale !== undefined ? property.forSale : true,
    forRent: property.forRent !== undefined ? property.forRent : false,
    featured: !!property.featured,
    userId: property.userId?.toString() || "1",
    userEmail: property.userEmail || "info@sakany.com",
    createdAt: property.createdAt || new Date(),
    updatedAt: property.updatedAt || new Date(),
    images: property.images || [],
    status: property.status || "active",
    amenities: property.amenities || property.features || []
  };
  
  // Explicitly preserve coordinates if they exist in source data
  if (property.coordinates && 
      typeof property.coordinates.lat === 'number' && 
      typeof property.coordinates.lng === 'number') {
    mappedProperty.coordinates = {
      lat: property.coordinates.lat,
      lng: property.coordinates.lng
    };
    console.log(`Mapped property with coordinates: ${property.title}, lat: ${property.coordinates.lat}, lng: ${property.coordinates.lng}`);
  }
  
  return mappedProperty;
};

// Define the interface for filter state
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

export default function Search() {
  const [filters, setFilters] = useState<FilterState>({
    location: "",
    minPrice: 0,
    maxPrice: 1000000,
    propertyType: "all",
    bedrooms: 0,
    bathrooms: 0,
    minArea: 0,
    amenities: [],
    forSale: undefined,
    forRent: undefined
  });
  
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState<"list" | "map">("list");
  
  const { data: propertiesRaw, isLoading, error } = useQuery<any[]>({
    queryKey: ["/api/properties", filters],
    queryFn: async () => {
      try {
        console.log("Fetching properties with filters:", filters);
        // Add timestamp to prevent caching
        const response = await fetch(`/api/properties?timestamp=${Date.now()}`);
        if (!response.ok) {
          throw new Error("Failed to fetch properties");
        }
        const data = await response.json();
        console.log("Search API success, received properties:", data);
        
        // Apply additional client-side filtering to ensure only approved properties are displayed
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
        return filteredData;
      } catch (error) {
        console.error("Error fetching properties:", error);
        throw error;
      }
    }
  });
  
  // Log data received from API
  console.log("Properties data from API:", propertiesRaw)
  
  // Map the raw properties to the expected client format
  const properties = propertiesRaw?.map(mapToClientProperty) || [];
  console.log("Mapped properties:", properties);

  // Log active filters for debugging
  useEffect(() => {
    console.log("Active filters:", {
      searchQuery,
      location: filters.location,
      priceRange: [filters.minPrice, filters.maxPrice],
      propertyType: filters.propertyType,
      bedrooms: filters.bedrooms,
      bathrooms: filters.bathrooms,
      minArea: filters.minArea,
      forSale: filters.forSale,
      forRent: filters.forRent,
      amenities: filters.amenities
    });
  }, [searchQuery, filters]);
  
  // Filter properties based on all criteria: search query + filters
  const filteredProperties = properties?.filter(property => {
    // Text search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        property.title.toLowerCase().includes(query) ||
        property.description.toLowerCase().includes(query) ||
        property.location.toLowerCase().includes(query) ||
        property.propertyType.toLowerCase().includes(query);
      
      if (!matchesSearch) return false;
    }
    
    // Location filter
    if (filters.location && filters.location.trim() !== "") {
      if (!property.location || !property.location.toLowerCase().includes(filters.location.toLowerCase())) {
        return false;
      }
    }
    
    // Price range filter
    if (property.price < filters.minPrice || property.price > filters.maxPrice) {
      return false;
    }
    
    // Property type filter
    if (filters.propertyType !== 'all') {
      if (!property.propertyType || property.propertyType.toLowerCase() !== filters.propertyType.toLowerCase()) {
        return false;
      }
    }
    
    // Bedrooms filter (using >= comparison to find properties with at least this many bedrooms)
    if (filters.bedrooms > 0) {
      if (typeof property.bedrooms !== 'number' || property.bedrooms < filters.bedrooms) {
        return false;
      }
    }
    
    // Bathrooms filter (using >= comparison to find properties with at least this many bathrooms)
    if (filters.bathrooms && filters.bathrooms > 0) {
      if (typeof property.bathrooms !== 'number' || property.bathrooms < filters.bathrooms) {
        return false;
      }
    }
    
    // Area filter (using >= comparison to find properties with at least this much area)
    if (filters.minArea && filters.minArea > 0) {
      if (typeof property.area !== 'number' || property.area < filters.minArea) {
        return false;
      }
    }
    
    // For Sale filter - only include properties that are for sale if this filter is active
    if (filters.forSale === true && property.forSale !== true) {
      return false;
    }
    
    // For Rent filter - only include properties that are for rent if this filter is active
    if (filters.forRent === true && property.forRent !== true) {
      return false;
    }
    
    // Amenities filter
    if (filters.amenities && filters.amenities.length > 0) {
      // If property has no amenities array, filter it out
      if (!property.amenities || !Array.isArray(property.amenities)) return false;
      
      // Check if all required amenities are included in the property
      for (const requiredAmenity of filters.amenities) {
        if (!property.amenities.includes(requiredAmenity)) {
          return false;
        }
      }
    }
    
    // If it passed all filters, include this property
    return true;
  });
  
  // Log filtered results counts for debugging
  useEffect(() => {
    if (properties && filteredProperties) {
      console.log(`Showing ${filteredProperties.length} of ${properties.length} total properties after filtering`);
    }
  }, [properties, filteredProperties]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // The filtering is already handled by the filteredProperties computed value
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Find Your Perfect Property</h1>
      
      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input 
            type="text"
            placeholder="Search properties by name, location, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button type="submit">Search</Button>
      </form>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1">
          <div className="sticky top-4">
            <SearchFilters onFilter={setFilters} />
          </div>
        </div>
        
        <div className="lg:col-span-3">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold">
                {filteredProperties ? `${filteredProperties.length} Properties` : 'Properties'}
              </h2>
            </div>
            
            <Tabs value={view} onValueChange={(v) => setView(v as "list" | "map")} className="w-auto">
              <TabsList>
                <TabsTrigger value="list" className="px-3">
                  <List className="h-4 w-4 mr-2" />
                  List
                </TabsTrigger>
                <TabsTrigger value="map" className="px-3">
                  <MapPin className="h-4 w-4 mr-2" />
                  Map
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {view === "list" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredProperties?.length ? (
                    filteredProperties.map((property) => (
                      <PropertyCard key={property.id} property={property} showActions={false} />
                    ))
                  ) : (
                    <div className="col-span-2 text-center py-12">
                      <p className="text-muted-foreground">No properties found matching your criteria.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <PropertyMap 
                    properties={filteredProperties || []} 
                    height="600px" 
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
