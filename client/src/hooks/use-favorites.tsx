import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, orderBy, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Favorite, UserFavorites } from '@/types/favorite';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Property } from '@/types/property';

interface FavoritesContextType {
  favorites: Favorite[];
  favoriteProperties: Property[];
  loading: boolean;
  error: string | null;
  addFavorite: (propertyId: string) => Promise<void>;
  removeFavorite: (propertyId: string) => Promise<void>;
  isFavorite: (propertyId: string) => boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const FavoritesProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [favoriteProperties, setFavoriteProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all user favorites
  useEffect(() => {
    if (!user) {
      setFavorites([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // Set up manual listener to avoid index requirements
    const getFavoritesWithoutIndex = async () => {
      try {
        // Use getDocs which doesn't require indexes instead of real-time listener
        const favoritesRef = collection(db, 'favorites');
        const q = query(
          favoritesRef,
          where('userId', '==', user.uid)
        );
        
        const querySnapshot = await getDocs(q);
        const userFavorites: Favorite[] = [];
        querySnapshot.forEach((doc) => {
          userFavorites.push({
            id: doc.id,
            ...doc.data(),
          } as Favorite);
        });
        
        // Sort locally
        userFavorites.sort((a, b) => {
          if (!a.createdAt) return 1;
          if (!b.createdAt) return -1;
          
          const aDate = a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const bDate = b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          
          return bDate.getTime() - aDate.getTime(); // desc order
        });
        
        setFavorites(userFavorites);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching favorites:', error);
        setError('Failed to load favorites');
        setLoading(false);
      }
    };
    
    getFavoritesWithoutIndex();
    
    // Manual polling every 10 seconds as a fallback instead of real-time
    const intervalId = setInterval(() => {
      if (user) {
        getFavoritesWithoutIndex();
      }
    }, 10000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [user]);

  // Fetch property details for all favorites
  useEffect(() => {
    const fetchFavoriteProperties = async () => {
      if (!favorites.length) {
        setFavoriteProperties([]);
        return;
      }

      try {
        const propertyIds = favorites.map(fav => fav.propertyId);
        const properties: Property[] = [];

        // Firestore doesn't support 'in' with many values, so we'll batch them
        const batchSize = 10;
        for (let i = 0; i < propertyIds.length; i += batchSize) {
          const batch = propertyIds.slice(i, i + batchSize);
          
          const propertiesRef = collection(db, 'properties');
          const q = query(propertiesRef, where('__name__', 'in', batch));
          const querySnapshot = await getDocs(q);
          
          querySnapshot.forEach(doc => {
            properties.push({
              id: doc.id,
              ...doc.data()
            } as Property);
          });
        }

        setFavoriteProperties(properties);
      } catch (error) {
        console.error('Error fetching favorite properties:', error);
        setError('Failed to load favorite properties');
      }
    };

    fetchFavoriteProperties();
  }, [favorites]);

  // Add a property to favorites
  const addFavorite = async (propertyId: string) => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to save favorites',
        variant: 'destructive',
      });
      return;
    }

    try {
      await addDoc(collection(db, 'favorites'), {
        userId: user.uid,
        propertyId,
        createdAt: serverTimestamp(),
      });

      toast({
        title: 'Property added to favorites',
        description: 'You can view it in your favorites list',
      });
    } catch (error) {
      console.error('Error adding favorite:', error);
      toast({
        title: 'Failed to add favorite',
        description: 'Please try again later',
        variant: 'destructive',
      });
    }
  };

  // Remove a property from favorites
  const removeFavorite = async (propertyId: string) => {
    if (!user) return;

    try {
      const favorite = favorites.find(f => f.propertyId === propertyId);
      if (!favorite) return;

      await deleteDoc(doc(db, 'favorites', favorite.id));
      
      toast({
        title: 'Property removed from favorites',
        description: 'Property has been removed from your favorites',
      });
    } catch (error) {
      console.error('Error removing favorite:', error);
      toast({
        title: 'Failed to remove favorite',
        description: 'Please try again later',
        variant: 'destructive',
      });
    }
  };

  // Check if a property is in favorites
  const isFavorite = (propertyId: string) => {
    return favorites.some(f => f.propertyId === propertyId);
  };

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        favoriteProperties,
        loading,
        error,
        addFavorite,
        removeFavorite,
        isFavorite,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};