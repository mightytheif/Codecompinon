import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { collection, doc, getDoc, updateDoc, deleteDoc, serverTimestamp, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMessaging } from "@/hooks/use-messaging";
import { useFavorites } from "@/hooks/use-favorites";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

// Report schema for property reporting
const reportSchema = z.object({
  propertyId: z.string(),
  propertyTitle: z.string(),
  reportedBy: z.string(),
  reporterEmail: z.string().email(),
  reason: z.string().min(1, "Please select a reason"),
  details: z.string().min(10, "Please provide more details").max(500, "Details too long"),
  status: z.enum(["pending", "reviewed", "resolved", "dismissed"]).default("pending"),
  createdAt: z.any(),
  updatedAt: z.any(),
  adminNotes: z.string().optional(),
  reviewedBy: z.string().optional(),
});
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bed, Bath, Grid, MapPin, Tag, Ruler, Calendar, User, Phone, Mail, Edit, Trash2, Flag, CheckCircle, Home, DollarSign, Loader2, Building2, Heart, Map } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { PropertyMap } from "@/components/ui/property-map";

interface PropertyData {
  id: string;
  title: string;
  description: string;
  price: number;
  location: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  propertyType: string;
  forSale: boolean;
  forRent: boolean;
  featured: boolean;
  userId: string;
  userEmail: string;
  createdAt: any;
  updatedAt: any;
  images: string[];
  status: string;
  sellerName?: string;
  sellerPhone?: string;
  sellerContact?: string;
}

interface PropertyPageProps {
  id?: string;
}

export default function PropertyPage({ id: propId }: PropertyPageProps) {
  // Hooks must be called in the same order in every render
  const [, params] = useRoute<{ id: string }>("/property/:id");
  const [, setLocation] = useLocation();
  const { user, isAdmin } = useAuth(); // Get user and isAdmin from auth context
  const { toast } = useToast();
  const { startConversation, isProcessing: isMessageProcessing } = useMessaging();
  const { addFavorite, removeFavorite, isFavorite } = useFavorites();
  
  // All state variables defined unconditionally
  const [property, setProperty] = useState<PropertyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);

  // Set up form early with default empty values
  const reportForm = useForm({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      propertyId: "",
      propertyTitle: "",
      reportedBy: user?.uid || "",
      reporterEmail: user?.email || "",
      reason: "",
      details: "",
      status: "pending",
      createdAt: null,
      updatedAt: null,
    },
  });
  
  // Property ID (from props or route)
  const id = propId || params?.id;

  // Fetch property data
  useEffect(() => {
    const fetchProperty = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const propertyRef = doc(db, "properties", id);
        const propertySnap = await getDoc(propertyRef);

        if (propertySnap.exists()) {
          const data = propertySnap.data() as PropertyData;
          data.id = propertySnap.id; // Ensure ID is set

          // Update the form with property details
          reportForm.setValue("propertyId", data.id);
          reportForm.setValue("propertyTitle", data.title);
          
          setProperty(data);
          if (data.images && data.images.length > 0) {
            setActiveImage(data.images[0]);
          }
        } else {
          toast({
            title: "Property not found",
            description: "The property you're looking for doesn't exist",
            variant: "destructive",
          });
          setLocation("/properties");
        }
      } catch (error: any) {
        console.error("Error fetching property:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to load property",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [id, setLocation, toast, reportForm]);

  // Handler functions defined using useCallback to prevent re-creation
  const handleReportSubmit = async (data: any) => {
    if (!user || !property) {
      toast({
        title: "Action Required",
        description: !user 
          ? "You need to be logged in to report a property" 
          : "Property information is missing",
        variant: "destructive",
      });
      setReportDialogOpen(false);
      return;
    }
    
    setReportSubmitting(true);
    
    try {
      // Ensure property data is included
      const reportData = {
        ...data,
        propertyId: property.id,
        propertyTitle: property.title,
        reportedBy: user.uid,
        reporterEmail: user.email || "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      // Save report to Firestore
      const reportsRef = collection(db, "reports");
      await addDoc(reportsRef, reportData);
      
      // Show success message
      toast({
        title: "Report Submitted",
        description: "Thank you for your report. Our team will review it shortly.",
      });
      
      // Close the dialog
      setReportDialogOpen(false);
      reportForm.reset();
    } catch (error: any) {
      console.error("Error submitting report:", error);
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit your report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleMarkAsSold = async () => {
    handleStatusChange("sold");
  };

  const handleMarkAsRented = async () => {
    handleStatusChange("rented");
  };

  const handleStatusChange = async (newStatus: string) => {
    // Determine if user can edit using the user and isAdmin from the top-level scope
    // We don't need to call useAuth() here as it's already done at the component level
    const localIsOwner = Boolean(user && property && user.uid === property.userId);
    const localCanEdit = localIsOwner || isAdmin;

    if (!localCanEdit || !property) return;

    setIsSubmitting(true);
    try {
      const propertyRef = doc(db, "properties", property.id);
      await updateDoc(propertyRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      setProperty({
        ...property,
        status: newStatus,
      });

      toast({
        title: "Status Updated",
        description: `Property is now marked as ${newStatus}`,
      });
    } catch (error) {
      console.error("Error updating property status:", error);
      toast({
        title: "Update Failed",
        description: "There was a problem updating the property status",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProperty = async () => {
    if (!property) return;

    setIsSubmitting(true);
    try {
      const propertyRef = doc(db, "properties", property.id);
      await deleteDoc(propertyRef);

      toast({
        title: "Property Deleted",
        description: "The property has been permanently deleted",
      });

      // Redirect to home page
      setLocation("/");
    } catch (error: any) {
      console.error("Error deleting property:", error);
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete property",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const startMessageConversation = async () => {
    if (!user || !property) {
      toast({
        title: "Login Required",
        description: "You need to be logged in to contact the seller",
        variant: "destructive",
      });
      return;
    }
    
    const sellerId = property.userId;
    const sellerName = property.sellerName || property.userEmail || "Property Owner";
    
    // Use messaging hook to create or find conversation
    await startConversation(
      sellerId, 
      sellerName, 
      property.id, 
      property.title
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="container py-10 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading property details...</p>
        </div>
      </div>
    );
  }
  
  // No property found
  if (!property) {
    return (
      <div className="container py-10">
        <div className="rounded-lg border p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Property Not Found</h2>
          <p className="text-muted-foreground mb-4">The property you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => setLocation("/properties")}>
            Browse Properties
          </Button>
        </div>
      </div>
    );
  }
  
  // Compute derived values
  const formattedPrice = new Intl.NumberFormat("en-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 0,
  }).format(property.price);
  
  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(date);
    } catch (e) {
      return "Invalid date";
    }
  };
  
  // Permission checks
  const isOwner = Boolean(user && property && user.uid === property.userId);
  const canEdit = isOwner || isAdmin; // isAdmin was destructured from useAuth() at the top of component
  
  return (
    <div className="container py-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Property Images */}
        <div className="md:col-span-2 space-y-4">
          {/* Main Image */}
          <div className="relative aspect-video rounded-lg overflow-hidden border border-border">
            {property.status !== "active" && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
                <span className="px-4 py-2 rounded-full text-lg font-bold text-white uppercase">
                  {property.status}
                </span>
              </div>
            )}

            <img
              src={activeImage || "https://placehold.co/800x600?text=No+Image"}
              alt={property.title}
              className="w-full h-full object-cover"
            />

            {property.featured && (
              <Badge className="absolute top-4 left-4 z-10 bg-yellow-500">
                Featured
              </Badge>
            )}
          </div>

          {/* Image Thumbnails */}
          {property.images && property.images.length > 0 && (
            <div className="grid grid-cols-5 gap-2">
              {property.images.map((image, index) => (
                <div
                  key={index}
                  className={`cursor-pointer aspect-square rounded-md overflow-hidden border-2 ${
                    activeImage === image ? "border-primary" : "border-border"
                  }`}
                  onClick={() => setActiveImage(image)}
                >
                  <img
                    src={image}
                    alt={`Property ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Property Details Tabs */}
          <Tabs defaultValue="details">
            <TabsList className="grid grid-cols-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
              <TabsTrigger value="location">
                <Map className="h-4 w-4 mr-1" />
                Location
              </TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="py-4">
              <h2 className="text-xl font-semibold mb-4">About This Property</h2>
              <p className="text-muted-foreground whitespace-pre-line">
                {property.description}
              </p>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Listed on</p>
                    <p className="font-medium">{formatDate(property.createdAt)}</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <Tag className="h-5 w-5 mr-2 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Property Type</p>
                    <p className="font-medium capitalize">{property.propertyType}</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="features" className="py-4">
              <h2 className="text-xl font-semibold mb-4">Property Features</h2>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex items-center p-3 border rounded-md">
                  <Bed className="h-5 w-5 mr-2 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Bedrooms</p>
                    <p className="font-medium">{property.bedrooms}</p>
                  </div>
                </div>

                <div className="flex items-center p-3 border rounded-md">
                  <Bath className="h-5 w-5 mr-2 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Bathrooms</p>
                    <p className="font-medium">{property.bathrooms}</p>
                  </div>
                </div>

                <div className="flex items-center p-3 border rounded-md">
                  <Ruler className="h-5 w-5 mr-2 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Area</p>
                    <p className="font-medium">{property.area} sqm</p>
                  </div>
                </div>

                <div className="flex items-center p-3 border rounded-md">
                  <Home className="h-5 w-5 mr-2 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Property Type</p>
                    <p className="font-medium capitalize">{property.propertyType}</p>
                  </div>
                </div>

                <div className="flex items-center p-3 border rounded-md">
                  <DollarSign className="h-5 w-5 mr-2 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">For Sale</p>
                    <p className="font-medium">{property.forSale ? "Yes" : "No"}</p>
                  </div>
                </div>

                <div className="flex items-center p-3 border rounded-md">
                  <DollarSign className="h-5 w-5 mr-2 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">For Rent</p>
                    <p className="font-medium">{property.forRent ? "Yes" : "No"}</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="location" className="py-4">
              <h2 className="text-xl font-semibold mb-4">Property Location</h2>
              <div className="mb-4 flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-primary" />
                <span className="text-lg">{property.location}</span>
              </div>
              <div className="h-[400px] w-full rounded-lg overflow-hidden border">
                <PropertyMap 
                  properties={[property]} 
                  height="400px"
                  defaultZoom={14}
                />
              </div>
            </TabsContent>

            <TabsContent value="contact" className="py-4">
              <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium">Owner/Agent Email:</h3>
                  <p className="text-muted-foreground">{property.userEmail}</p>
                </div>

                {property.sellerName && (
                  <div>
                    <h3 className="font-medium">Contact Person:</h3>
                    <p className="text-muted-foreground">{property.sellerName}</p>
                  </div>
                )}

                {property.sellerPhone && (
                  <div>
                    <h3 className="font-medium">Phone Number:</h3>
                    <p className="text-muted-foreground">{property.sellerPhone}</p>
                  </div>
                )}

                {property.sellerContact && property.sellerContact !== property.userEmail && (
                  <div>
                    <h3 className="font-medium">Alternative Email:</h3>
                    <p className="text-muted-foreground">{property.sellerContact}</p>
                  </div>
                )}

                {user && property.userId !== user.uid && (
                  <div className="mt-6">
                    <Button 
                      className="w-full"
                      onClick={() => startMessageConversation()}
                      disabled={isMessageProcessing}
                    >
                      {isMessageProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Starting Conversation...
                        </>
                      ) : "Contact Seller"}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Send a message directly to the property owner
                    </p>
                  </div>
                )}

                {property.forSale && (
                  <div className="p-4 bg-blue-50 rounded-lg mt-6">
                    <h3 className="font-medium text-blue-800 mb-2">
                      This property is for sale
                    </h3>
                    <p className="text-blue-700 text-sm">
                      Contact the seller for more information about purchasing this property.
                    </p>
                  </div>
                )}

                {property.forRent && (
                  <div className="p-4 bg-green-50 rounded-lg mt-2">
                    <h3 className="font-medium text-green-800 mb-2">
                      This property is available for rent
                    </h3>
                    <p className="text-green-700 text-sm">
                      Contact the owner for rental terms and viewing appointments.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Property Summary */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-2xl">{property.title}</CardTitle>
                <CardDescription className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span>{property.location}</span>
                </CardDescription>
              </div>
              {user && !isOwner && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="flex-shrink-0 ml-2"
                  onClick={() => isFavorite(property.id) ? removeFavorite(property.id) : addFavorite(property.id)}
                >
                  <Heart 
                    className={`h-5 w-5 ${isFavorite(property.id) ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} 
                  />
                </Button>
              )}
            </CardHeader>

            <CardContent>
              <div className="text-3xl font-bold text-primary mb-4">
                {formattedPrice}
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline" className="flex items-center gap-1">
                  <Bed className="h-3 w-3" />
                  {property.bedrooms} Beds
                </Badge>

                <Badge variant="outline" className="flex items-center gap-1">
                  <Bath className="h-3 w-3" />
                  {property.bathrooms} Baths
                </Badge>

                <Badge variant="outline" className="flex items-center gap-1">
                  <Ruler className="h-3 w-3" />
                  {property.area} sqm
                </Badge>
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>ID: {property.id.substring(0, 8)}</span>
                <span>Updated: {formatDate(property.updatedAt)}</span>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-2">
              <Button 
                className="w-full" 
                onClick={() => startMessageConversation()}
                disabled={isOwner || !user || isMessageProcessing}
              >
                {isMessageProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting Conversation...
                  </>
                ) : "Contact Seller"}
              </Button>
              
              {/* Report Button - only show if user is logged in and not the owner */}
              {user && !isOwner && (
                <Button 
                  variant="outline" 
                  className="w-full mt-2" 
                  onClick={() => setReportDialogOpen(true)}
                >
                  <Flag className="h-4 w-4 mr-2" />
                  Report Listing
                </Button>
              )}

              {canEdit && (
                <div className="w-full grid grid-cols-2 gap-2 mt-2">
                  <Button variant="outline" onClick={() => setLocation(`/edit-property/${property.id}`)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the property
                          and remove the data from the servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteProperty}
                          disabled={isSubmitting}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            "Delete"
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}

              {canEdit && (
                <div className="w-full grid grid-cols-2 gap-2 mt-2">
                  <div className="flex items-center">
                    <Building2 className="h-5 w-5 mr-2 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <p className="font-medium capitalize">{property.status}</p>
                    </div>
                  </div>
                  <div className="col-span-2 mt-4 p-4 bg-muted rounded-lg">
                    <h3 className="font-medium mb-2">Manage Property Status</h3>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant={property.status === "active" ? "default" : "outline"}
                        onClick={() => handleStatusChange("active")}
                        disabled={isSubmitting || property.status === "active"}
                      >
                        Active
                      </Button>
                      <Button
                        size="sm"
                        variant={property.status === "sold" ? "default" : "outline"}
                        onClick={() => handleStatusChange("sold")}
                        disabled={isSubmitting || property.status === "sold" || !property.forSale}
                      >
                        Sold
                      </Button>
                      <Button
                        size="sm"
                        variant={property.status === "rented" ? "default" : "outline"}
                        onClick={() => handleStatusChange("rented")}
                        disabled={isSubmitting || property.status === "rented" || !property.forRent}
                      >
                        Rented
                      </Button>
                      <Button
                        size="sm"
                        variant={property.status === "inactive" ? "default" : "outline"}
                        onClick={() => handleStatusChange("inactive")}
                        disabled={isSubmitting || property.status === "inactive"}
                      >
                        Inactive
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Report Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Report this property</DialogTitle>
            <DialogDescription>
              Report inappropriate content or misleading information about this property.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...reportForm}>
            <form onSubmit={reportForm.handleSubmit(handleReportSubmit)} className="space-y-6">
              <FormField
                control={reportForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for reporting</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a reason" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="inappropriate">Inappropriate content</SelectItem>
                        <SelectItem value="fraud">Fraudulent listing</SelectItem>
                        <SelectItem value="duplicate">Duplicate listing</SelectItem>
                        <SelectItem value="incorrect">Incorrect information</SelectItem>
                        <SelectItem value="spam">Spam</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={reportForm.control}
                name="details"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Details</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Please provide additional details about your report"
                        {...field}
                        rows={4}
                      />
                    </FormControl>
                    <FormDescription>
                      Provide specific details that help us understand the issue
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={reportSubmitting || !user}
                >
                  {reportSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : "Submit Report"}
                </Button>
              </DialogFooter>
              
              {!user && (
                <div className="text-center text-sm text-red-500 mt-2">
                  You must be logged in to report a property
                </div>
              )}
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}