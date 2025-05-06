import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Edit, Trash2, Home, MapPin, Bath, Bed, Ruler, Bell, AlertCircle, AlertTriangle, Info, Flag } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { useQuery } from "@tanstack/react-query";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";

interface PropertyFeedback {
  id: string;
  reportId: string;
  propertyId: string;
  propertyTitle: string;
  adminNotes: string;
  reason: string;
  status: 'pending' | 'resolved';
  createdAt: any;
  read: boolean;
}

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
  forSale: boolean;
  forRent: boolean;
  featured: boolean;
  userId: string;
  userEmail: string;
  createdAt: any;
  updatedAt: any;
  images: string[];
  status: string;
  verified?: boolean;
  published?: boolean;
  ownerId?: string; // Added to match Firebase structure
  feedback?: PropertyFeedback[]; // Feedback notifications from admins
}

export default function MyPropertiesPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<PropertyFeedback | null>(null);
  const [loadingFeedback, setLoadingFeedback] = useState<string | null>(null);

  // Get user properties (only show properties owned by the current user)
  const { data: properties, isLoading, error, refetch } = useQuery<Property[]>({
    queryKey: ['/api/properties/user', user?.uid],
    queryFn: async () => {
      if (!user || !user.uid) {
        console.error('Cannot fetch properties: No user logged in');
        return [];
      }
      
      console.log('Attempting to fetch properties for user:', user.uid);
      
      // Get the current Firebase auth token for authentication
      let token;
      try {
        token = await user.getIdToken(true);  // Force refresh the token
        console.log('Got auth token');
      } catch (err) {
        console.error('Failed to get auth token:', err);
        throw new Error('Authentication error');
      }
      
      try {
        // First try the Firebase-specific endpoint which filters by user ID
        console.log('Fetching properties using Firebase UID:', user.uid);
        
        let data = [];
        try {
          const userProperties = await fetch('/api/properties/firebase-user', {
            headers: {
              'Authorization': token ? `Bearer ${token}` : '',
              'Content-Type': 'application/json',
              'X-Firebase-UID': user.uid
            }
          });
          
          if (userProperties.ok) {
            data = await userProperties.json();
            console.log('Successfully fetched properties from Firebase:', data);
            
            // Verify the data only contains properties owned by this user
            data = data.filter((property: Property) => 
              property.userId === user.uid || 
              property.ownerId === user.uid
            );
            
            console.log(`Filtered to ${data.length} properties owned by ${user.uid}`);
          }
        } catch (firebaseError) {
          console.error('Failed to fetch from Firebase directly:', firebaseError);
        }
        
        // If we didn't get any properties through Firebase, fall back to the server API
        if (!data || data.length === 0) {
          console.log('No properties found via Firebase UID, falling back to server API');
          const res = await fetch('/api/properties/user', {
            headers: {
              'Authorization': token ? `Bearer ${token}` : '',
              'Content-Type': 'application/json',
              'X-User-Email': user.email || ''  // Add email as a header for easier lookup
            }
          });
          
          if (!res.ok) {
            const errorText = await res.text();
            console.error('Failed to fetch properties:', errorText);
            throw new Error(`Failed to fetch properties: ${res.status} ${errorText}`);
          }
          
          const allProperties = await res.json();
          console.log('Fetched properties from server API:', allProperties);
          
          // Filter to ensure we only show properties owned by this user
          data = allProperties.filter((property: Property) => 
            property.userId === user.uid || 
            (property as any).ownerId === user.uid
          );
          
          console.log(`Filtered to ${data.length} properties owned by ${user.uid}`);
        }
        
        // Log the properties for this user
        console.log(`Displaying ${data.length} properties for user ${user.uid}:`, 
          data.map((p: Property) => ({ id: p.id, title: p.title, userId: p.userId, ownerId: p.ownerId }))
        );
        
        // Map status values to ensure consistency
        return data.map((property: Property) => {
          console.log(`Processing property ${property.id} with status: ${property.status}`);
          
          // Ensure this property belongs to the current user
          if (property.userId !== user.uid && property.ownerId !== user.uid) {
            console.log(`⚠️ Property ${property.id} does not belong to current user ${user.uid} - skipping`);
            return null; // This will be filtered out later
          }
          
          // If status is missing, default to 'pending'
          if (!property.status) {
            console.log('  - Status missing, defaulting to pending');
            property.status = 'pending';
          }
          
          // Check for property.verified - only truly admin-approved properties 
          // should show as "Approved"
          if (property.status === 'active' && property.verified === true) {
            console.log('  - Property is active and verified, marking as approved');
            property.status = 'approved';
          }
          
          // Honor the "rejected" status - if it's already rejected, don't change it
          if (property.status === 'rejected') {
            console.log('  - Property is rejected, honoring this status');
            return property;
          }
          
          // If property is published but not verified, and not rejected, mark as "pending"
          if (property.published === true && property.verified !== true) {
            console.log('  - Property is published but not verified, marking as pending');
            property.status = 'pending';
          }
          
          console.log(`  - Final status: ${property.status}`);
          return property;
        }).filter((property: Property | null): property is Property => property !== null);
      } catch (err) {
        console.error('Error in fetch:', err);
        throw err;
      }
    },
    enabled: !!user
  });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
    
    // Check if user is a landlord
    const displayName = user?.displayName || "";
    const userType = displayName.split("|")[1] || "user";
    if (userType !== "landlord") {
      navigate("/");
      toast({
        title: "Access Denied",
        description: "Only landlords can access this page",
        variant: "destructive"
      });
    }
  }, [user, navigate, toast]);
  
  // Fetch feedback for all properties when they're loaded
  useEffect(() => {
    const loadFeedbackForProperties = async () => {
      if (!properties || properties.length === 0 || !user) return;
      
      let unreadFeedbackCount = 0;
      
      // Only load feedback for properties that don't already have it
      for (const property of properties) {
        if (!property.feedback) {
          const feedback = await fetchPropertyFeedback(property.id, false); // Don't show dialog, just load data
          if (feedback && feedback.some((f: PropertyFeedback) => !f.read)) {
            unreadFeedbackCount += feedback.filter((f: PropertyFeedback) => !f.read).length;
          }
        } else if (property.feedback.some((f: PropertyFeedback) => !f.read)) {
          unreadFeedbackCount += property.feedback.filter((f: PropertyFeedback) => !f.read).length;
        }
      }

      // Show notification if there are unread feedback items
      if (unreadFeedbackCount > 0) {
        toast({
          title: "⚠️ Admin Feedback Requires Attention",
          description: `You have ${unreadFeedbackCount} unread feedback item${unreadFeedbackCount > 1 ? 's' : ''} from administrators that need your attention.`,
          variant: "destructive",
          duration: 10000, // Show for 10 seconds
        });
      }
    };
    
    loadFeedbackForProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties, user]);

  const handleDeleteProperty = async (propertyId: string) => {
    try {
      setDeleting(propertyId);
      
      // Get the current Firebase auth token for authentication
      const token = await user?.getIdToken();
      
      const response = await fetch(`/api/properties/${propertyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        }
      });

      if (response.ok) {
        toast({
          title: "Property Deleted",
          description: "The property has been successfully deleted",
        });
        refetch();
        navigate("/"); // Redirect to home page after deletion
      } else {
        console.error('Failed to delete property:', await response.text());
        throw new Error('Failed to delete property');
      }
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setDeleting(null);
    }
  };
  
  // Function to fetch feedback for a property
  const fetchPropertyFeedback = async (propertyId: string, showDialog: boolean = true) => {
    if (!user) return;
    
    try {
      setLoadingFeedback(propertyId);
      
      // Get the current Firebase auth token for authentication
      const token = await user.getIdToken();
      
      // If showing dialog, mark as read, otherwise just fetch
      const markAsReadParam = showDialog ? '?markAsRead=true' : '';
      
      const response = await fetch(`/api/properties/${propertyId}/feedback${markAsReadParam}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch feedback: ${response.status}`);
      }
      
      const feedbackData = await response.json();
      console.log(`Fetched ${feedbackData.length} feedback items for property ${propertyId}`, feedbackData);
      
      // Update the property with feedback data in our local state
      const updatedProperties = properties?.map(property => {
        if (property.id === propertyId) {
          return { ...property, feedback: feedbackData };
        }
        return property;
      });
      
      // If showing dialog, show it when there's feedback
      if (showDialog) {
        if (feedbackData.length > 0) {
          setSelectedFeedback(feedbackData[0]); // Show the most recent feedback
        } else {
          toast({
            title: "No Feedback",
            description: "There is no feedback for this property yet."
          });
        }
      }
      
      return feedbackData;
    } catch (error: any) {
      console.error("Error fetching feedback:", error);
      toast({
        title: "Error",
        description: `Failed to fetch feedback: ${error.message}`,
        variant: "destructive"
      });
      return [];
    } finally {
      setLoadingFeedback(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Error</h2>
          <p className="text-muted-foreground mb-4">Failed to load your properties. Please try again.</p>
          <Button onClick={() => refetch()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Properties</h1>
        <Button onClick={() => navigate("/properties/add")}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Property
        </Button>
      </div>

      {properties && properties.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <Home className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Properties Listed</h2>
          <p className="text-muted-foreground mb-6">You haven't added any properties yet.</p>
          <Button onClick={() => navigate("/properties/add")}>
            <Plus className="h-4 w-4 mr-2" />
            List Your First Property
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties?.map((property) => (
            <Card 
              key={property.id} 
              className={`overflow-hidden ${
                property.feedback && property.feedback.some((f: PropertyFeedback) => !f.read)
                  ? 'bg-red-50 shadow-lg shadow-red-200 transform hover:scale-[1.01] transition-all'
                  : property.feedback && property.feedback.length > 0
                    ? 'bg-amber-50'
                    : ''
              }`}
            >
              <div className={`h-48 overflow-hidden relative ${property.feedback && property.feedback.length > 0 ? (property.feedback.some((f: PropertyFeedback) => !f.read) ? 'border-4 border-red-500' : 'border-4 border-amber-400') : ''}`}>
                {/* SUPER NOTICEABLE FEEDBACK ALERT */}
                {property.feedback && property.feedback.some((f: PropertyFeedback) => !f.read) && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-red-600 text-white font-bold p-4 rounded-lg flex flex-col items-center animate-pulse shadow-xl border-2 border-white">
                      <AlertTriangle className="h-10 w-10 mb-2" />
                      <div className="text-center">ACTION REQUIRED!</div>
                      <div className="text-sm mt-1">This property has admin feedback</div>
                    </div>
                  </div>
                )}
                
                {/* Admin Feedback Alert Banner */}
                {property.feedback && property.feedback.length > 0 && (
                  <div className={`absolute top-0 left-0 right-0 z-10 ${property.feedback.some((f: PropertyFeedback) => !f.read) ? 'bg-red-500' : 'bg-amber-400'} text-white py-1 px-2 text-center font-semibold text-sm flex items-center justify-center`}>
                    <AlertTriangle className="h-4 w-4 mr-1 animate-pulse" />
                    {property.feedback.some((f: PropertyFeedback) => !f.read) ? 'Action Required: Admin Feedback' : 'Property Has Admin Feedback'}
                  </div>
                )}
                
                {/* Reported badge - show only for properties with pending reports, placed at top-center for visibility */}
                {property.feedback && property.feedback.some(item => item.status === 'pending') && (
                  <Badge 
                    className="absolute top-20 right-2 z-50 bg-red-500 text-white px-3 py-1 flex items-center gap-1 shadow-lg border border-white animate-pulse"
                  >
                    <Flag className="h-4 w-4" />
                    <span className="font-bold">Reported</span>
                  </Badge>
                )}
                
                {property.images && property.images.length > 0 ? (
                  <img 
                    src={property.images[0]} 
                    alt={property.title} 
                    className={`w-full h-full object-cover ${property.feedback && property.feedback.length > 0 ? 'mt-7' : ''}`}
                  />
                ) : (
                  <div className={`w-full h-full bg-muted flex items-center justify-center ${property.feedback && property.feedback.length > 0 ? 'mt-7' : ''}`}>
                    <Home className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1">
                  {property.forSale && (
                    <Badge variant="default">For Sale</Badge>
                  )}
                  {property.forRent && (
                    <Badge variant="secondary">For Rent</Badge>
                  )}
                  {property.featured && (
                    <Badge variant="outline" className="bg-white/80">Featured</Badge>
                  )}
                </div>

                {/* Property approval status badges */}
                <div className="absolute top-2 left-2">
                  {property.status === 'pending' && (
                    <Badge variant="outline" className="bg-amber-500 text-white border-none">
                      ⏳ Pending Approval
                    </Badge>
                  )}
                  {property.status === 'approved' && (
                    <Badge variant="outline" className="bg-green-500 text-white border-none">
                      ✅ Approved
                    </Badge>
                  )}
                  {property.status === 'rejected' && (
                    <Badge variant="outline" className="bg-red-500 text-white border-none">
                      ❌ Rejected
                    </Badge>
                  )}
                  {property.status === 'active' && (
                    <Badge variant="outline" className="bg-blue-500 text-white border-none">
                      ✓ Active
                    </Badge>
                  )}
                </div>
                
                {/* Feedback Counter Badge - More Visible */}
                {property.feedback && property.feedback.length > 0 && (
                  <div className={`absolute -bottom-3 right-2 ${property.feedback.some((f: PropertyFeedback) => !f.read) ? 'bg-red-500 animate-bounce' : 'bg-amber-400'} text-white py-1 px-3 rounded-full font-bold text-sm flex items-center shadow-lg border-2 border-white`}>
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {property.feedback.length} Feedback
                    {property.feedback.some((f: PropertyFeedback) => !f.read) && (
                      <span className="ml-1 bg-white text-red-500 px-1 text-xs rounded-full">
                        {property.feedback.filter((f: PropertyFeedback) => !f.read).length} unread
                      </span>
                    )}
                  </div>
                )}
              </div>

              <CardHeader className="relative pb-2">
                <div className="absolute top-2 right-2">
                  {/* Admin Feedback Button */}
                  <Button 
                    variant={property.feedback && property.feedback.length > 0 ? (property.feedback.some((f: PropertyFeedback) => !f.read) ? "secondary" : "outline") : "ghost"}
                    size="sm"
                    className={`px-2 py-1 h-auto ${
                      property.feedback && property.feedback.length > 0 
                        ? (property.feedback.some((f: PropertyFeedback) => !f.read) 
                          ? 'bg-amber-100 hover:bg-amber-200 border-amber-300' 
                          : 'bg-blue-50 hover:bg-blue-100 border-blue-200')
                        : ''
                    }`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      fetchPropertyFeedback(property.id);
                    }}
                    disabled={loadingFeedback === property.id}
                  >
                    {loadingFeedback === property.id ? (
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    ) : (
                      <div className="relative flex items-center">
                        <Bell 
                          className={`h-6 w-6 transition-colors ${
                            property.feedback && property.feedback.length > 0
                              ? (property.feedback.some((f: PropertyFeedback) => !f.read)
                                ? 'text-amber-500 animate-pulse'
                                : 'text-blue-500')
                              : 'text-muted-foreground hover:text-primary'
                          }`} 
                        />
                        {property.feedback && property.feedback.length > 0 && (
                          <div className={`absolute -top-3 -right-3 flex items-center justify-center min-w-[20px] h-[20px] px-1 ${
                            property.feedback.some((f: PropertyFeedback) => !f.read) 
                              ? 'bg-red-500' 
                              : 'bg-blue-500'
                          } text-[11px] font-bold text-white rounded-full border-2 border-background`}>
                            {property.feedback.length}
                          </div>
                        )}
                      </div>
                    )}
                  </Button>
                </div>

                <div className="flex items-center gap-2 mb-1">
                  {property.feedback && property.feedback.some((f: PropertyFeedback) => !f.read) ? (
                    <div className="flex items-center gap-2 w-full">
                      <CardTitle className="text-red-600 flex items-center gap-2">
                        <AlertTriangle className="h-6 w-6 text-red-600 animate-pulse" />
                        {property.title}
                      </CardTitle>
                      <Badge variant="destructive" className="animate-pulse text-sm font-bold">
                        ⚠️ ACTION REQUIRED!
                      </Badge>
                    </div>
                  ) : (
                    <CardTitle>{property.title}</CardTitle>
                  )}
                </div>
                {property.feedback && property.feedback.length > 0 && (
                  <div className={`mb-2 flex items-center gap-1 ${property.feedback.some((f: PropertyFeedback) => !f.read) ? 'text-red-600' : 'text-blue-600'}`}>
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {property.feedback.some((f: PropertyFeedback) => !f.read) 
                        ? 'ACTION NEEDED: This property has unread feedback' 
                        : 'This property has admin feedback'}
                    </span>
                  </div>
                )}
                <CardDescription className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {property.location}
                </CardDescription>
                
                {/* Display most recent unread feedback directly on the card */}
                {property.feedback && property.feedback.some((f: PropertyFeedback) => !f.read) && (
                  <div className="mt-2 bg-red-50 border-2 border-red-300 rounded-md p-2 text-sm shadow-md animate-pulse-slow">
                    <div className="font-bold flex items-center text-red-800 gap-1 mb-1 border-b pb-1 border-red-200">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      ADMIN FEEDBACK REQUIRES ACTION
                    </div>
                    <div className="text-red-700 font-medium my-2 text-[13px]">
                      "{property.feedback.filter((f: PropertyFeedback) => !f.read)[0].adminNotes}"
                    </div>
                    <div className="mt-2 flex justify-between items-center bg-red-100 p-1 rounded-md border border-red-200">
                      <Badge variant={property.feedback.filter((f: PropertyFeedback) => !f.read)[0].status === 'resolved' ? "outline" : "destructive"} 
                        className={property.feedback.filter((f: PropertyFeedback) => !f.read)[0].status === 'resolved' 
                          ? "bg-green-100 text-green-800 border-green-300 hover:bg-green-200" 
                          : ""}>
                        {property.feedback.filter((f: PropertyFeedback) => !f.read)[0].status === 'resolved' ? '✓ Resolved' : '⚠️ Action Needed'}
                      </Badge>
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="h-7 px-2 text-xs font-semibold bg-red-200 hover:bg-red-300 text-red-800"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          fetchPropertyFeedback(property.id);
                        }}
                      >
                        View All Feedback
                      </Button>
                    </div>
                  </div>
                )}
              </CardHeader>

              <CardContent>
                <div className="flex justify-between items-center mb-4">
                  <div className="text-xl font-bold text-primary">
                    {formatPrice(property.price)}
                  </div>
                </div>

                <p className="text-muted-foreground text-sm line-clamp-2 mb-4">
                  {property.description}
                </p>

                <div className="flex justify-between">
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
              </CardContent>

              <CardFooter className="flex justify-between gap-2 border-t p-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate(`/property/${property.id}`)}
                >
                  View
                </Button>
                
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate(`/properties/edit/${property.id}`)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="flex-1">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this property?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the property listing.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteProperty(property.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={deleting === property.id}
                      >
                        {deleting === property.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          "Delete"
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      
      {/* Feedback Dialog */}
      <Dialog open={!!selectedFeedback} onOpenChange={(open) => !open && setSelectedFeedback(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Property Feedback
            </DialogTitle>
            <DialogDescription>
              The admin has left feedback on your property listing.
            </DialogDescription>
          </DialogHeader>
          
          {selectedFeedback && (
            <div className="space-y-4 my-2">
              <div className="bg-muted p-4 rounded-md">
                <div className="font-medium mb-1">Property</div>
                <div>{selectedFeedback.propertyTitle}</div>
              </div>
              
              <div>
                <div className="font-medium mb-1 flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  Report Reason
                </div>
                <div className="text-muted-foreground">
                  {selectedFeedback.reason || 'Not specified'}
                </div>
              </div>
              
              <div>
                <div className="font-medium mb-1 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  Admin Notes
                </div>
                <div className="bg-accent p-3 rounded-md">
                  {selectedFeedback.adminNotes}
                </div>
              </div>
              
              <div className="flex items-center justify-between border-t pt-4 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant={selectedFeedback.status === 'resolved' ? 'default' : 'outline'}>
                    {selectedFeedback.status === 'resolved' ? 'Resolved' : 'Pending'}
                  </Badge>
                  {selectedFeedback.createdAt && (
                    <span className="text-muted-foreground">
                      {typeof selectedFeedback.createdAt === 'object' && 'seconds' in selectedFeedback.createdAt
                        ? new Date(selectedFeedback.createdAt.seconds * 1000).toLocaleDateString()
                        : new Date(selectedFeedback.createdAt).toLocaleDateString()
                      }
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end">
            <DialogClose asChild>
              <Button>Close</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}