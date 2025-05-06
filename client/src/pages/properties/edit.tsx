import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { collection, doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Loader2, MapPin } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/ui/image-upload";
import { LocationPicker } from "@/components/ui/location-picker";

// Property schema for validation
const propertySchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(100),
  description: z.string().min(20, "Description must be at least 20 characters"),
  price: z.coerce.number().positive("Price must be a positive number"),
  location: z.string().min(3, "Location must be at least 3 characters"),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number()
  }),
  bedrooms: z.coerce.number().int().min(0, "Bedrooms must be 0 or more"),
  bathrooms: z.coerce.number().int().min(0, "Bathrooms must be 0 or more"),
  area: z.coerce.number().positive("Area must be a positive number"),
  propertyType: z.enum(["apartment", "house", "villa", "land", "commercial", "studio"]),
  forSale: z.boolean().default(true),
  forRent: z.boolean().default(false),
  featured: z.boolean().default(false),
  sellerName: z.string().min(3, "Seller name is required"),
  sellerPhone: z.string().min(10, "Valid phone number is required"),
  sellerContact: z.string().email("Valid email is required"),
});

type PropertyFormValues = z.infer<typeof propertySchema>;

interface PropertyData {
  id: string;
  title: string;
  description: string;
  price: number;
  location: string;
  coordinates?: {
    lat: number;
    lng: number;
  } | null;
  bedrooms: number;
  bathrooms: number;
  area: number;
  propertyType: string;
  forSale: boolean;
  forRent: boolean;
  featured: boolean;
  userId: string;
  ownerId: string;
  userEmail: string;
  images: string[];
  status: string;
  sellerName: string;
  sellerPhone: string;
  sellerContact: string;
  createdAt: any;
  updatedAt: any;
}

export default function EditPropertyPage() {
  const [, params] = useRoute<{ id: string }>("/properties/edit/:id");
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState<string[]>([]);
  const [property, setProperty] = useState<PropertyData | null>(null);

  // Get property ID from route params
  const propertyId = params?.id;

  // Set up form with schema validation
  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      title: "",
      description: "",
      price: 0,
      location: "",
      coordinates: { lat: 24.7136, lng: 46.6753 }, // Default to Riyadh
      bedrooms: 0,
      bathrooms: 0,
      area: 0,
      propertyType: "apartment",
      forSale: true,
      forRent: false,
      featured: false,
      sellerName: "",
      sellerPhone: "",
      sellerContact: user?.email || "",
    },
  });

  // Fetch property data to pre-fill the form
  useEffect(() => {
    const fetchProperty = async () => {
      if (!propertyId) {
        setLoading(false);
        return;
      }

      try {
        const propertiesCollection = collection(db, "properties");
        const propertyRef = doc(propertiesCollection, propertyId);
        const propertySnap = await getDoc(propertyRef);

        if (propertySnap.exists()) {
          const data = propertySnap.data() as PropertyData;
          data.id = propertySnap.id; // Ensure ID is set

          // Check if user is the owner or admin
          if (user?.uid !== data.userId && user?.uid !== data.ownerId) {
            toast({
              title: "Access Denied",
              description: "You don't have permission to edit this property",
              variant: "destructive",
            });
            navigate("/my-properties");
            return;
          }

          setProperty(data);
          setImages(data.images || []);

          // Pre-fill form with property data
          form.reset({
            title: data.title,
            description: data.description,
            price: data.price,
            location: data.location,
            coordinates: data.coordinates || { lat: 24.7136, lng: 46.6753 }, // Use default if not available
            bedrooms: data.bedrooms,
            bathrooms: data.bathrooms,
            area: data.area,
            propertyType: data.propertyType as any,
            forSale: data.forSale,
            forRent: data.forRent,
            featured: data.featured,
            sellerName: data.sellerName,
            sellerPhone: data.sellerPhone,
            sellerContact: data.sellerContact || data.userEmail,
          });
        } else {
          toast({
            title: "Property not found",
            description: "The property you're trying to edit doesn't exist",
            variant: "destructive",
          });
          navigate("/my-properties");
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

    if (user) {
      fetchProperty();
    } else {
      navigate("/login");
    }
  }, [propertyId, user, navigate, toast, form]);

  const onSubmit = async (data: PropertyFormValues) => {
    if (!user || !property) {
      toast({
        title: "Error",
        description: "You must be logged in and property must exist to update",
        variant: "destructive",
      });
      return;
    }

    // Validate user permissions
    if (user.uid !== property.userId && user.uid !== property.ownerId) {
      toast({
        title: "Permission denied",
        description: "You don't have permission to edit this property",
        variant: "destructive",
      });
      return;
    }

    if (images.length === 0) {
      toast({
        title: "Images required",
        description: "Please upload at least one image",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (!propertyId) {
        throw new Error("Property ID is missing");
      }
      
      // Make sure to use the proper syntax for doc reference
      const propertiesCollection = collection(db, "properties");
      const propertyRef = doc(propertiesCollection, propertyId);
      
      await updateDoc(propertyRef, {
        ...data,
        images: images,
        updatedAt: serverTimestamp(),
      });

      toast({
        title: "Property Updated",
        description: "Your property has been updated successfully",
      });

      navigate("/my-properties");
    } catch (error: any) {
      console.error("Error updating property:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update property",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = (url: string) => {
    setImages((prev) => [...prev, url]);
  };

  const handleImageRemove = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="container py-10 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container py-10 text-center">
        <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
        <p className="mb-4">You must be logged in to edit a property.</p>
        <Button onClick={() => navigate("/login")}>Go to Login</Button>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold mb-6">Edit Property</h1>

      <Card>
        <CardHeader>
          <CardTitle>Update Property Details</CardTitle>
          <CardDescription>
            Make changes to your property listing information below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Property title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (SAR)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter price in SAR"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Detailed description of the property"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <div className="flex items-center">
                          <MapPin className="mr-2 h-4 w-4 text-primary" />
                          <Input placeholder="Property location" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="propertyType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select property type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="apartment">Apartment</SelectItem>
                          <SelectItem value="house">House</SelectItem>
                          <SelectItem value="villa">Villa</SelectItem>
                          <SelectItem value="studio">Studio</SelectItem>
                          <SelectItem value="land">Land</SelectItem>
                          <SelectItem value="commercial">Commercial</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="bedrooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bedrooms</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bathrooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bathrooms</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="area"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Area (sqm)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="forSale"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>For Sale</FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="forRent"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>For Rent</FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="coordinates"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Map Location</FormLabel>
                    <FormControl>
                      <LocationPicker
                        value={field.value as any}
                        onChange={field.onChange}
                        height="350px"
                      />
                    </FormControl>
                    <FormDescription>
                      Click on the map to select the property location
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <Label>Property Images</Label>
                <div className="flex flex-wrap gap-2">
                  {images.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={image}
                        alt={`Property ${index + 1}`}
                        className="w-24 h-24 object-cover rounded-md"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={() => handleImageRemove(index)}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
                <ImageUpload onUpload={handleImageUpload} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="sellerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seller Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sellerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Your phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sellerContact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Your email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating Property...
                  </>
                ) : (
                  "Update Property"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}