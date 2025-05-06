import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useFavorites } from '@/hooks/use-favorites';
import { useAuth } from '@/hooks/use-auth';
import { Heart, Bed, Bath, Ruler, MapPin, Loader2, ArrowUpDown, HeartOff } from 'lucide-react';
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Card } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 0,
  }).format(price);
};

export default function FavoritesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { favoriteProperties, loading, error, removeFavorite } = useFavorites();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Favorite Properties</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <div className="h-52 bg-muted animate-pulse" />
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-1/3 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-4" />
                <div className="flex justify-between">
                  <Skeleton className="h-6 w-1/4" />
                  <Skeleton className="h-6 w-1/4" />
                  <Skeleton className="h-6 w-1/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login page
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Favorite Properties</h1>
        {loading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      </div>

      {loading && favoriteProperties.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <div className="h-52 bg-muted animate-pulse" />
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-1/3 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-4" />
                <div className="flex justify-between">
                  <Skeleton className="h-6 w-1/4" />
                  <Skeleton className="h-6 w-1/4" />
                  <Skeleton className="h-6 w-1/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : favoriteProperties.length === 0 ? (
        <Alert className="mb-6">
          <HeartOff className="h-4 w-4 mr-2" />
          <AlertTitle>No favorites yet</AlertTitle>
          <AlertDescription>
            You haven't added any properties to your favorites. Browse properties and click the heart icon to add them to your favorites.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favoriteProperties.map((property) => (
            <Card key={property.id} className="overflow-hidden transition-shadow hover:shadow-md">
              <div className="relative h-52 bg-muted">
                {property.images && property.images.length > 0 ? (
                  <img
                    src={property.images[0]}
                    alt={property.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    No image available
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="rounded-full bg-background/80 backdrop-blur-sm hover:bg-background/90"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFavorite(property.id);
                    }}
                  >
                    <Heart className="h-4 w-4 fill-destructive text-destructive" />
                  </Button>
                </div>
                {property.featured && (
                  <Badge className="absolute top-2 left-2" variant="secondary">
                    Featured
                  </Badge>
                )}
              </div>

              <CardHeader className="pb-2">
                <CardTitle>{property.title}</CardTitle>
                <CardDescription className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {property.location}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="flex justify-between items-center mb-4">
                  <div className="text-xl font-bold text-primary">
                    {formatPrice(property.price)}
                  </div>
                  <Badge variant={property.forSale ? "default" : "outline"}>
                    {property.forSale ? "For Sale" : "For Rent"}
                  </Badge>
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

              <CardFooter className="flex justify-between border-t p-4">
                <Button
                  variant="default"
                  className="w-full"
                  onClick={() => navigate(`/property/${property.id}`)}
                >
                  View Details
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}