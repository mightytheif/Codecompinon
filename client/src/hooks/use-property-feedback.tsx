import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';

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

interface PropertyFeedbackContextType {
  unreadFeedback: PropertyFeedback[];
  totalUnread: number;
  loading: boolean;
  error: string | null;
  refreshFeedback: () => Promise<void>;
}

const PropertyFeedbackContext = createContext<PropertyFeedbackContextType | undefined>(undefined);

export const PropertyFeedbackProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [unreadFeedback, setUnreadFeedback] = useState<PropertyFeedback[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUnreadFeedback = async () => {
    if (!user) {
      setUnreadFeedback([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Get auth token
      const token = await user.getIdToken();

      // First, get all properties for the user
      const userPropertiesResponse = await fetch('/api/properties/firebase-user', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Firebase-UID': user.uid
        }
      });

      if (!userPropertiesResponse.ok) {
        throw new Error(`Failed to fetch user properties: ${userPropertiesResponse.status}`);
      }

      const userProperties = await userPropertiesResponse.json();
      
      // If no properties, there's no feedback to fetch
      if (!userProperties || userProperties.length === 0) {
        setUnreadFeedback([]);
        setLoading(false);
        return;
      }

      // Get property IDs
      const propertyIds = userProperties.map((property: any) => property.id);
      
      // Fetch all feedback for user's properties directly from Firestore
      const allFeedback: PropertyFeedback[] = [];
      
      // In Firestore, feedback is stored as a subcollection under each property document
      console.log(`Checking feedback for ${propertyIds.length} properties`);
      
      // We need to query each property's feedback subcollection individually
      for (const propertyId of propertyIds) {
        try {
          // First get the property to get its title
          const propertyDoc = await getDocs(
            query(collection(db, 'properties'), where('id', '==', propertyId))
          );
          
          let propertyTitle = 'Unknown Property';
          if (!propertyDoc.empty) {
            propertyTitle = propertyDoc.docs[0].data().title || 'Untitled Property';
          }
          
          // Now get the feedback subcollection for this property
          const feedbackRef = collection(db, 'properties', propertyId, 'feedback');
          const feedbackSnapshot = await getDocs(feedbackRef);
          
          console.log(`Found ${feedbackSnapshot.size} feedback items for property ${propertyId} (${propertyTitle})`);
          
          feedbackSnapshot.forEach((doc) => {
            const feedbackData = doc.data() as Omit<PropertyFeedback, 'id'>;
            // Explicitly convert the read property to boolean if it's undefined
            const read = typeof feedbackData.read === 'boolean' ? feedbackData.read : false;
            
            allFeedback.push({
              ...feedbackData,
              id: doc.id,
              propertyId, // Ensure propertyId is set
              propertyTitle, // Add property title for display
              read: read // Ensure read property is a boolean
            });
          });
        } catch (error) {
          console.error(`Error fetching feedback for property ${propertyId}:`, error);
          // Continue with other properties even if one fails
        }
      }
      
      // Filter for unread feedback
      const unread = allFeedback.filter(feedback => feedback.read === false);
      
      // Debug to ensure we're detecting unread feedback correctly
      console.log(`Found ${unread.length} unread feedback items out of ${allFeedback.length} total`);
      
      setUnreadFeedback(unread);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching property feedback:', error);
      setError('Failed to load property feedback');
      setLoading(false);
    }
  };

  // Fetch unread feedback when user changes or component mounts
  useEffect(() => {
    fetchUnreadFeedback();
    
    // Set up a polling interval for refreshing feedback
    const intervalId = setInterval(() => {
      if (user) {
        fetchUnreadFeedback();
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(intervalId);
  }, [user]);

  return (
    <PropertyFeedbackContext.Provider
      value={{
        unreadFeedback,
        totalUnread: unreadFeedback.length,
        loading,
        error,
        refreshFeedback: fetchUnreadFeedback
      }}
    >
      {children}
    </PropertyFeedbackContext.Provider>
  );
};

export const usePropertyFeedback = () => {
  const context = useContext(PropertyFeedbackContext);
  if (context === undefined) {
    throw new Error('usePropertyFeedback must be used within a PropertyFeedbackProvider');
  }
  return context;
};