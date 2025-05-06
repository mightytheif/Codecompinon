import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Property, PropertyFeedback } from "@/types/property";
import { formatPrice } from "@/lib/format";
import { Bed, Bath, Ruler, MapPin, Home, ChevronDown, ChevronUp, Flag, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";


interface PropertyCardProps {
  property: Property;
  showActions?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function PropertyCard({
  property,
  showActions = false,
  onEdit,
  onDelete,
}: PropertyCardProps) {
  const [, navigate] = useLocation();
  const [showDescription, setShowDescription] = useState(false);
  const [propertyFeedback, setPropertyFeedback] = useState<PropertyFeedback[]>([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  // Format the price with commas for thousands
  const formattedPrice = formatPrice(property.price);

  // Get the first image or use a placeholder
  const mainImage =
    property.images && property.images.length > 0
      ? property.images[0]
      : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600' fill='none'%3E%3Crect width='800' height='600' fill='%23f0f0f0'/%3E%3Cpath d='M400 150L550 350H250L400 150Z' fill='%23e0e0e0'/%3E%3Crect x='300' y='350' width='200' height='100' fill='%23e0e0e0'/%3E%3Crect x='350' y='400' width='50' height='50' fill='%23f0f0f0'/%3E%3Ctext x='400' y='300' font-family='Arial' font-size='24' text-anchor='middle' fill='%23999999'%3ENo Image%3C/text%3E%3C/svg%3E";

  // If property.feedback is not available, fetch it from Firestore
  useEffect(() => {
    // Only fetch feedback if not already present
    if (!property.feedback && property.id) {
      const fetchFeedback = async () => {
        try {
          setLoadingFeedback(true);
          const feedbackRef = collection(db, 'properties', property.id, 'feedback');
          const feedbackSnapshot = await getDocs(feedbackRef);
          
          if (!feedbackSnapshot.empty) {
            const feedback: PropertyFeedback[] = [];
            feedbackSnapshot.forEach((doc) => {
              const data = doc.data();
              feedback.push({
                id: doc.id,
                reportId: data.reportId || '',
                propertyId: property.id,
                propertyTitle: property.title,
                adminNotes: data.adminNotes || '',
                reason: data.reason || '',
                status: data.status || 'pending',
                createdAt: data.createdAt,
                read: data.read === true
              });
            });
            setPropertyFeedback(feedback);
          }
        } catch (error) {
          console.error("Error fetching property feedback:", error);
        } finally {
          setLoadingFeedback(false);
        }
      };
      
      fetchFeedback();
    } else if (property.feedback) {
      // Use existing feedback data if already available
      setPropertyFeedback(property.feedback);
    }
  }, [property.id, property.feedback, property.title]);

  const handleClick = () => {
    navigate(`/property/${property.id}`);
  };
  
  const toggleDescription = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDescription(!showDescription);
  };
  
  // Check if there are any unresolved (pending) feedback items
  // Only show the Reported badge for pending reports, not for resolved ones
  const hasUnresolvedReports = 
    (property.feedback && property.feedback.some(item => item.status === 'pending')) ||
    propertyFeedback.some(item => item.status === 'pending');

  return (
    <div className="group overflow-hidden rounded-lg border bg-card shadow-sm transition-all hover:shadow-md">
      {/* Image container with relative position for badges and overlays */}
      <div className="relative">
        {/* Status overlay (only for non-approved and non-active statuses) */}
        {property.status && 
          property.status !== "active" && 
          property.status !== "approved" && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
            <span className="px-3 py-1 rounded-full text-sm font-bold text-white uppercase">
              {property.status}
            </span>
          </div>
        )}

        {/* Property image */}
        <div
          className="aspect-[4/3] w-full overflow-hidden cursor-pointer"
          onClick={handleClick}
        >
          <img
            src={mainImage}
            alt={property.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        </div>

        {/* Featured badge */}
        {property.featured && (
          <Badge className="absolute top-2 left-2 z-10 bg-yellow-500">
            Featured
          </Badge>
        )}

        {/* Reported badge - show only when there are pending/unresolved reports */}
        {hasUnresolvedReports && (
          <Badge 
            className="absolute top-2 right-2 z-20 bg-red-500 text-white px-2 py-1 flex items-center gap-1 shadow-md animate-pulse"
          >
            <Flag className="h-3 w-3" />
            <span>Reported</span>
          </Badge>
        )}

        {/* Sale/Rent badge */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 mt-10">
          {property.forSale && (
            <Badge variant="secondary" className="bg-blue-500 text-white">
              For Sale
            </Badge>
          )}
          {property.forRent && (
            <Badge variant="secondary" className="bg-green-500 text-white">
              For Rent
            </Badge>
          )}
        </div>
      </div>

      {/* Property info */}
      <div className="p-4">
        <div className="mb-2 flex items-start justify-between">
          <h3
            className="font-semibold text-lg line-clamp-1 cursor-pointer"
            onClick={handleClick}
          >
            {property.title}
          </h3>
          <span className="font-bold text-primary">{formattedPrice}</span>
        </div>

        <div className="flex items-center text-muted-foreground text-sm mb-3">
          <MapPin className="h-3.5 w-3.5 mr-1" />
          <span className="truncate">{property.location}</span>
        </div>
        
        {/* Description section with toggle */}
        {property.description && (
          <div className="mb-3">
            <div 
              className="flex items-center cursor-pointer text-sm text-muted-foreground hover:text-foreground mb-1"
              onClick={toggleDescription}
            >
              <span className="mr-1 font-medium">Description</span>
              {showDescription ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </div>
            
            {showDescription && (
              <div className="text-sm text-muted-foreground bg-muted/30 p-2 rounded-md mb-2 max-h-32 overflow-y-auto">
                <p>{property.description}</p>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center">
              <Bed className="h-4 w-4 mr-1 text-primary" />
              <span>{property.bedrooms}</span>
            </div>
            <div className="flex items-center">
              <Bath className="h-4 w-4 mr-1 text-primary" />
              <span>{property.bathrooms}</span>
            </div>
            <div className="flex items-center">
              <Ruler className="h-4 w-4 mr-1 text-primary" />
              <span>{property.area} m²</span>
            </div>
          </div>
          <div className="flex items-center text-xs">
            <Home className="h-3.5 w-3.5 mr-1 text-primary" />
            <span className="capitalize">{property.propertyType}</span>
          </div>
        </div>

        {/* Property owner/contact if available */}
        {property.ownerName && (
          <div className="flex items-center text-xs text-muted-foreground mb-3">
            <div className="flex items-center">
              <span>Listed by: {property.ownerName}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="grid grid-cols-2 gap-2 mt-4">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(property.id)}
              >
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(property.id)}
              >
                Delete
              </Button>
            )}
          </div>
        )}

        {!showActions && (
          <Button variant="default" size="sm" className="w-full" onClick={handleClick}>
            View Details
          </Button>
        )}
      </div>
    </div>
  );
}