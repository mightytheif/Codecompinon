import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp,
  DocumentData
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useLocation } from "wouter";

/**
 * Interface for messaging API
 */
interface MessagingApi {
  startConversation: (
    recipientId: string, 
    recipientName: string, 
    propertyId?: string, 
    propertyTitle?: string
  ) => Promise<boolean>;
  isProcessing: boolean;
}

/**
 * Custom hook for handling messaging functionality
 */
export function useMessaging(): MessagingApi {
  // All hooks must be called on every render, so they can't be inside conditionals
  const { user } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [, setLocation] = useLocation();
  
  // Use useMemo to create an object that contains all the messaging functionality
  return useMemo(() => ({
    async startConversation(
      recipientId: string, 
      recipientName: string, 
      propertyId?: string, 
      propertyTitle?: string
    ): Promise<boolean> {
      if (!user) {
        toast({
          title: "Login Required",
          description: "You need to be logged in to contact the seller",
          variant: "destructive",
        });
        return false;
      }

      setIsProcessing(true);
      
      try {
        // Don't create conversation with self
        if (recipientId === user.uid) {
          toast({
            title: "Cannot message yourself",
            description: "You cannot start a conversation with yourself",
            variant: "destructive",
          });
          setIsProcessing(false);
          return false;
        }
        
        // Check if conversation already exists
        const conversationsRef = collection(db, "conversations");
        const q = query(
          conversationsRef,
          where("participants", "array-contains", user.uid)
        );
        
        const querySnapshot = await getDocs(q);
        let existingConversationId: string | null = null;
        
        querySnapshot.forEach((doc: DocumentData) => {
          const data = doc.data();
          if (data.participants && data.participants.includes(recipientId)) {
            existingConversationId = doc.id;
          }
        });
        
        // If conversation exists, navigate to it
        if (existingConversationId) {
          setLocation(`/messages?selected=${existingConversationId}`);
          setIsProcessing(false);
          return true;
        } 
        
        // Create new conversation with simpler structure to match security rules
        const newConversation = {
          participants: [user.uid, recipientId],
          participantNames: {
            [user.uid]: user.displayName || user.email || "You",
            [recipientId]: recipientName || "User",
          },
          lastMessage: "New conversation started",
          lastMessageTime: serverTimestamp(),
          createdAt: serverTimestamp(),
          propertyId: propertyId || null,
          propertyTitle: propertyTitle || null,
          unreadBy: {
            [user.uid]: 0,
            [recipientId]: 0,
          },
        };
        
        const docRef = await addDoc(conversationsRef, newConversation);
        
        // Navigate to the messages page with the new conversation selected
        setLocation(`/messages?selected=${docRef.id}`);
        setIsProcessing(false);
        return true;
      } catch (error: any) {
        console.error("Error creating conversation:", error);
        
        // Check for specific Firebase error codes
        if (error.code === "permission-denied") {
          toast({
            title: "Permission Error",
            description: "You don't have permission to create conversations. Please check Firebase security rules.",
            variant: "destructive",
          });
        } else if (error.code === "resource-exhausted") {
          toast({
            title: "Index Error",
            description: "The database requires an index for this operation. Please contact the administrator.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: error.message || "Failed to create conversation",
            variant: "destructive",
          });
        }
        
        setIsProcessing(false);
        return false;
      }
    },
    isProcessing
  }), [user, toast, isProcessing, setLocation]);
}