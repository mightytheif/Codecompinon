
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { doc, setDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
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
import { ImageUpload } from "@/components/ui/image-upload";
import { Loader2 } from "lucide-react";

const propertySchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(100),
  description: z.string().min(20, "Description must be at least 20 characters"),
  price: z.coerce.number().positive("Price must be a positive number"),
  location: z.string().min(3, "Location must be at least 3 characters"),
  bedrooms: z.coerce.number().int().min(0, "Bedrooms must be 0 or more"),
  bathrooms: z.coerce.number().int().min(0, "Bathrooms must be 0 or more"),
  area: z.coerce.number().positive("Area must be a positive number"),
  propertyType: z.enum(["apartment", "house", "villa", "land", "commercial"]),
  forSale: z.boolean().default(true),
  forRent: z.boolean().default(false),
  featured: z.boolean().default(false),
});

type PropertyFormValues = z.infer<typeof propertySchema>;

export default function AddProperty() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<string[]>([]);

  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      title: "",
      description: "",
      price: 0,
      location: "",
      bedrooms: 0,
      bathrooms: 0,
      area: 0,
      propertyType: "apartment",
      forSale: true,
      forRent: false,
      featured: false,
      availabilityDate: new Date(),
      sellerContact: user?.email || "",
      sellerName: "",
      sellerPhone: "",
    },
  });

  const onSubmit = async (data: PropertyFormValues) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to add a property",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const propertyCollection = collection(db, "properties");
      const newPropertyRef = doc(propertyCollection);

      await setDoc(newPropertyRef, {
        ...data,
        id: newPropertyRef.id,
        userId: user.uid,
        userEmail: user.email,
        ownerId: user.uid, // Add the owner ID as required by security rules
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        images: images,
        status: "active", // active, sold, rented, inactive
      });

      toast({
        title: "Property Added",
        description: "Your property has been added successfully",
      });

      setLocation("/properties");
    } catch (error: any) {
      console.error("Error adding property:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add property",
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

  if (!user) {
    return (
      <div className="container py-10 text-center">
        <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
        <p className="mb-4">You must be logged in to add a property.</p>
        <Button onClick={() => setLocation("/login")}>Go to Login</Button>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold mb-6">Add New Property</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
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
                    <Input type="number" {...field} />
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
                  <Textarea placeholder="Describe the property" rows={4} {...field} />
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
                  <Input placeholder="Property location" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
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

          <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
            <FormField
              control={form.control}
              name="forSale"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>For Sale</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="forRent"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>For Rent</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="featured"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Featured Property</FormLabel>
                  </div>
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">Property Images</h3>
              <p className="text-sm text-gray-500 mb-4">
                Upload images of your property (max 5 images)
              </p>
            </div>

            <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
              {images.map((url, index) => (
                <div key={index} className="relative">
                  <ImageUpload
                    onUpload={() => {}}
                    onRemove={() => handleImageRemove(index)}
                    currentImageUrl={url}
                    disabled={isSubmitting}
                  />
                </div>
              ))}

              {images.length < 5 && (
                <ImageUpload
                  onUpload={handleImageUpload}
                  disabled={isSubmitting}
                />
              )}
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting}>
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
    </div>
  );
}
