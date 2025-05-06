export interface PropertyFeedback {
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

export interface Property {
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
  featured?: boolean;
  userId: string;
  userEmail: string;
  createdAt: any;
  updatedAt: any;
  images: string[];
  status: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  ownerName?: string;
  ownerPhotoURL?: string;
  sellerName?: string;
  sellerPhone?: string;
  sellerContact?: string;
  amenities?: string[];
  feedback?: PropertyFeedback[];
}