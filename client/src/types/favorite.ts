export interface Favorite {
  id: string;
  userId: string;
  propertyId: string;
  createdAt: any;
}

export interface UserFavorites {
  favorites: Favorite[];
  loading: boolean;
  error: string | null;
}