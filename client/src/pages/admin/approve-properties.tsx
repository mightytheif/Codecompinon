
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { AlertCircle, CheckCircle, XCircle, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  location: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  propertyType: string;
  forSale?: boolean;
  forRent?: boolean;
  featured?: boolean;
  userId?: string;
  userEmail?: string;
  sellerName?: string;
  sellerPhone?: string;
  sellerContact?: string;
  images?: string[];
  status?: string;
  verified?: boolean;
  published?: boolean;
}

export default function ApproveProperties() {
  const [, navigate] = useLocation();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      navigate("/");
      return;
    }

    const fetchPendingProperties = async () => {
      try {
        setError(null);
        // Get all non-featured properties
        const propertiesQuery = query(
          collection(db, "properties"),
          where("featured", "==", false)
        );
        
        const snapshot = await getDocs(propertiesQuery);
        const propertiesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Property[];
        
        // Filter out properties that have already been rejected
        const pendingProperties = propertiesData.filter(property => 
          property.status !== "rejected"
        );
        
        console.log(`Found ${propertiesData.length} non-featured properties, ${pendingProperties.length} are pending approval`);
        
        setProperties(pendingProperties);
      } catch (error) {
        console.error("Error fetching properties:", error);
        setError("Failed to fetch properties for approval");
        toast({
          title: "Error",
          description: "Failed to fetch properties for approval",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPendingProperties();
  }, [isAdmin, navigate, toast]);

  const handleApproveProperty = async (propertyId: string) => {
    try {
      setProcessingId(propertyId);
      const propertyRef = doc(db, "properties", propertyId);
      await updateDoc(propertyRef, {
        featured: true,
        verified: true,
        status: "active" // Update status to active
      });

      // Update local state
      setProperties(properties.filter(property => property.id !== propertyId));
      
      toast({
        title: "Success",
        description: "Property has been approved and featured",
      });
    } catch (error) {
      console.error("Error approving property:", error);
      toast({
        title: "Error",
        description: "Failed to approve property",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectProperty = async (propertyId: string) => {
    try {
      setProcessingId(propertyId);
      const propertyRef = doc(db, "properties", propertyId);
      
      // Instead of deleting, update the property status to "rejected"
      await updateDoc(propertyRef, {
        status: "rejected",
        verified: false,
        // Keep the property in the system but mark it clearly as rejected
      });

      // Update local state - remove from the admin approval list
      setProperties(properties.filter(property => property.id !== propertyId));
      
      toast({
        title: "Success",
        description: "Property has been rejected",
      });
    } catch (error) {
      console.error("Error rejecting property:", error);
      toast({
        title: "Error",
        description: "Failed to reject property",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-2 p-4 rounded-md bg-destructive/10 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Approve Properties</h1>
      
      {properties.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No properties waiting for approval</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => (
            <Card key={property.id} className="overflow-hidden">
              <div className="h-48 overflow-hidden relative">
                {/* Status badge */}
                <div className="absolute top-2 left-2 z-10">
                  {property.status === 'pending' && (
                    <span className="px-2 py-1 bg-amber-500 text-white text-xs font-medium rounded-full">
                      Pending
                    </span>
                  )}
                  {!property.status && (
                    <span className="px-2 py-1 bg-amber-500 text-white text-xs font-medium rounded-full">
                      Pending
                    </span>
                  )}
                  {property.status === 'active' && (
                    <span className="px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded-full">
                      Active
                    </span>
                  )}
                  {property.status === 'inactive' && (
                    <span className="px-2 py-1 bg-gray-500 text-white text-xs font-medium rounded-full">
                      Inactive
                    </span>
                  )}
                </div>
                
                {property.images && property.images.length > 0 ? (
                  <img
                    src={property.images[0]}
                    alt={property.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <p className="text-muted-foreground">No image</p>
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <h2 className="text-xl font-semibold mb-2">{property.title}</h2>
                <p className="text-muted-foreground mb-2">{property.location}</p>
                <p className="text-lg font-bold mb-2">{property.price} SAR</p>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Beds: </span>
                    {property.bedrooms}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Baths: </span>
                    {property.bathrooms}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Area: </span>
                    {property.area} m²
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-muted-foreground">
                    Owner: {property.sellerName || property.userEmail}
                  </p>
                </div>
              </CardContent>
              <CardFooter className="p-4 pt-0 flex gap-2 justify-between">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate(`/property/${property.id}`)}
                >
                  View Details
                </Button>
                <Button
                  variant="default"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => handleApproveProperty(property.id)}
                  disabled={processingId === property.id}
                >
                  {processingId === property.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Approve
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      disabled={processingId === property.id}
                    >
                      {processingId === property.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <XCircle className="h-4 w-4 mr-2" />
                      )}
                      Reject
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reject Property</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to reject this property? The property will be marked as rejected and will remain visible to the landlord.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleRejectProperty(property.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Reject
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
