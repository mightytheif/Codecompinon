import { Button } from "@/components/ui/button";
import { PropertyCard } from "@/components/ui/property-card";
import { useQuery } from "@tanstack/react-query";
import { Property } from "@/types/property";
import { Link } from "wouter";
import { Loader2 } from "lucide-react";

// Helper function to transform server properties to match the expected Property type
const mapToClientProperty = (property: any): Property => {
  return {
    id: property.id.toString(),
    title: property.title || "",
    description: property.description || "",
    price: property.price || 0,
    location: property.location || "",
    bedrooms: property.bedrooms || 0,
    bathrooms: property.bathrooms || 0,
    area: property.area || 0,
    propertyType: property.propertyType || "apartment", // Use propertyType directly from the API response
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
};

export default function Home() {
  // Get featured properties from server API (more reliable than Firebase)
  const { data: featuredPropertiesRaw, isLoading: featuredLoading } = useQuery<any[]>({
    queryKey: ["/api/properties/featured"],
  });
  
  // Map the raw properties to the expected client format
  const featuredProperties = featuredPropertiesRaw?.map(mapToClientProperty) || [];
  
  // Get recent properties 
  const { data: recentPropertiesRaw, isLoading: recentLoading } = useQuery<any[]>({
    queryKey: ["/api/properties"],
    queryFn: async () => {
      try {
        // Add a timestamp to prevent caching
        const response = await fetch(`/api/properties?limit=3&timestamp=${Date.now()}`);
        if (!response.ok) {
          throw new Error("Failed to fetch properties");
        }
        
        const data = await response.json();
        
        // Client-side filter to ONLY show approved properties
        return data.filter((property: any) => {
          // Properties must be verified=true AND have approved/active status
          const isVerified = property.verified === true;
          const hasApprovedStatus = property.status === "approved" || property.status === "active";
          
          // Log the filtering for debugging purposes
          console.log(`Filtering property ${property.id}: verified=${isVerified}, status=${property.status}`);
          
          // Only return properties that meet BOTH conditions
          return isVerified && hasApprovedStatus;
        });
      } catch (error) {
        console.error("Error fetching properties:", error);
        return [];
      }
    },
  });
  
  // Map the raw properties to the expected client format
  console.log("Properties data from API:", recentPropertiesRaw);
  const recentProperties = recentPropertiesRaw?.map(property => {
    // Log each property's status and verification for debugging
    console.log(`Processing property ${property.id} with status: ${property.status}`);
    console.log(`  - Property is ${property.verified ? 'verified' : 'not verified'}, ${property.published ? 'published' : 'not published'}`);
    
    // Apply client-side filtering to double-check
    if (property.verified !== true) {
      console.log(`  - Property is published but not verified, marking as pending`);
    }
    
    let finalStatus = property.status;
    // For user display, remap status "active" to "approved" if it's verified
    if (property.status === "active" && property.verified === true) {
      finalStatus = "approved";
    } else if (property.status === "active" && property.verified !== true) {
      finalStatus = "pending";
    }
    
    console.log(`  - Final status: ${finalStatus}`);
    
    return mapToClientProperty({
      ...property,
      status: finalStatus
    });
  }) || [];


  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-orange-50 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold mb-4">
              Find Your Perfect Home Match
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Discover properties tailored to your lifestyle and preferences
            </p>
            <div className="flex gap-4">
              <Button size="lg" asChild>
                <Link href="/search">Browse Properties</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/lifestyle">Take Lifestyle Quiz</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Properties */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-semibold mb-8">Featured Properties</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredLoading ? (
              <div className="col-span-3 flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : featuredProperties && featuredProperties.length > 0 ? (
              featuredProperties.map((property) => (
                <PropertyCard key={property.id} property={property} showActions={false} />
              ))
            ) : (
              <div className="col-span-3 text-center py-12">
                <p className="text-muted-foreground">No featured properties found</p>
                <Button className="mt-4" asChild>
                  <Link href="/search">Browse All Properties</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Recent Properties */}
      <section className="py-16 bg-slate-50">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-semibold mb-8">Recently Added</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentLoading ? (
              <div className="col-span-3 flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : recentProperties && recentProperties.length > 0 ? (
              recentProperties.map((property) => (
                <PropertyCard key={property.id} property={property} showActions={false} />
              ))
            ) : (
              <div className="col-span-3 text-center py-12">
                <p className="text-muted-foreground">No recent properties found</p>
              </div>
            )}
          </div>
          <div className="text-center mt-8">
            <Button variant="outline" size="lg" asChild>
              <Link href="/search">View All Properties</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}