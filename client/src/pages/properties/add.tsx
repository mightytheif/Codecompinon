import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Building, AlertCircle, MapPin } from "lucide-react";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { sendEmailVerification } from "firebase/auth";
import { db } from "@/lib/firebase";
import { ImageUpload } from "@/components/ui/image-upload";
import { LocationPicker } from "@/components/ui/location-picker";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const propertySchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(100),
  description: z.string().min(20, "Description must be at least 20 characters"),
  price: z.coerce.number().positive("Price must be a positive number"),
  location: z.string().min(3, "Location must be at least 3 characters"),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number()
  }).nullable().refine(val => val !== null, {
    message: "Property location on map is required"
  }),
  bedrooms: z.coerce.number().int().min(0, "Bedrooms must be 0 or more"),
  bathrooms: z.coerce.number().int().min(0, "Bathrooms must be 0 or more"),
  area: z.coerce.number().positive("Area must be a positive number"),
  propertyType: z.enum(["apartment", "house", "villa", "land", "commercial"]),
  forSale: z.boolean().default(true),
  forRent: z.boolean().default(false),
  featured: z.boolean().default(false),
  sellerName: z.string().min(3, "Seller name is required"),
  sellerPhone: z.string().min(10, "Valid phone number is required"),
  sellerContact: z.string().email("Valid email is required"),
});

type PropertyFormValues = z.infer<typeof propertySchema>;

export default function AddProperty() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [isSendingVerification, setIsSendingVerification] = useState(false);

  // Early return if email is not verified
  if (user && !user.emailVerified) {
    const handleResendVerification = async () => {
      try {
        setIsSendingVerification(true);
        await sendEmailVerification(user);
        toast({
          title: "Verification email sent",
          description: "Please check your inbox and verify your email",
        });
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsSendingVerification(false);
      }
    };

    return (
      <div className="container max-w-3xl py-10">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Email Verification Required</AlertTitle>
          <AlertDescription>
            You need to verify your email before adding properties. Please check your inbox for the verification link.
          </AlertDescription>
        </Alert>
        <Button
          onClick={handleResendVerification}
          disabled={isSendingVerification}
          className="mt-4"
        >
          {isSendingVerification ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending verification email...
            </>
          ) : (
            "Resend verification email"
          )}
        </Button>
      </div>
    );
  }

  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      title: "",
      description: "",
      price: 0,
      location: "",
      coordinates: null as any, // Cast to any to bypass TypeScript error
      bedrooms: 0,
      bathrooms: 0,
      area: 0,
      propertyType: "apartment",
      forSale: true,
      forRent: false,
      featured: false,
      sellerContact: user?.email || "",
      sellerName: user?.displayName?.split("|")[0] || "",
      sellerPhone: "",
    },
  });

  const handleImageUpload = (url: string) => {
    setImages((prev) => [...prev, url]);
  };

  const handleImageRemove = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: PropertyFormValues) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to add a property",
        variant: "destructive",
      });
      return;
    }

    // Check if landlord and log user info for debugging
    console.log("User display name:", user?.displayName);
    const isLandlord = user?.displayName?.split("|").includes("landlord");
    console.log("Is landlord check:", isLandlord);

    if (!isLandlord) {
      toast({
        title: "Permission denied",
        description:
          "Only landlords can add properties. Your role appears to be: " +
          user?.displayName,
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
      // Make sure we have user.uid for ownerId
      if (!user.uid) {
        throw new Error("User ID is required to add a property");
      }

      const propertyCollection = collection(db, "properties");
      const newPropertyRef = doc(propertyCollection);

      await setDoc(newPropertyRef, {
        ...data,
        id: newPropertyRef.id,
        userId: user.uid,
        userEmail: user.email,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        verified: false,
        published: true,
        images: images,
        status: "active",
      });

      toast({
        title: "Success",
        description:
          "Your property has been successfully added. Redirecting to home page.",
      });

      // Change the redirection to home page
      setLocation("/");
    } catch (error: any) {
      console.error("Error adding property:", error);
      toast({
        title: "Error Adding Property",
        description: `Failed: ${error?.message || "Unknown error"}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container max-w-3xl py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Building className="h-6 w-6" />
            Add New Property
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property Title</FormLabel>
                    <FormControl>
                      <Input placeholder="3 Bedroom Apartment in Al Olaya" {...field} />
                    </FormControl>
                    <FormDescription>
                      A short, descriptive title for your property
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your property in detail..."
                        className="min-h-32"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Include important features, amenities, and other details
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (SAR)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="1000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="Riyadh, Al Olaya District" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="coordinates"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      Property Location on Map
                    </FormLabel>
                    <FormDescription>
                      Click on the map to set the exact location of your property
                    </FormDescription>
                    <FormControl>
                      <LocationPicker 
                        value={field.value as any} 
                        onChange={field.onChange}
                        height="350px"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="bedrooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bedrooms</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
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
                        <Input type="number" min="0" {...field} />
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
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
                        <SelectItem value="land">Land</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="forSale"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>For Sale</FormLabel>
                        <FormDescription>
                          This property is available for purchase
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="forRent"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>For Rent</FormLabel>
                        <FormDescription>
                          This property is available for rent
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="featured"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Featured</FormLabel>
                        <FormDescription>
                          Display as a featured property
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <FormLabel>Contact Information</FormLabel>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="sellerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
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
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+966 ..." {...field} />
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
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <FormLabel>Property Images</FormLabel>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {images.map((url, index) => (
                    <div key={index} className="relative aspect-square rounded-md overflow-hidden border">
                      <img
                        src={url}
                        alt={`Property image ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => handleImageRemove(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  {images.length < 5 && (
                    <ImageUpload
                      onUpload={handleImageUpload}
                      disabled={isSubmitting}
                    />
                  )}
                </div>
                <FormDescription>
                  Upload up to 5 high-quality images of your property (required)
                </FormDescription>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding Property...
                  </>
                ) : (
                  "Add Property"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}