import { Property, InsertProperty, User, InsertUser, UpdateUser, Message, InsertMessage, Conversation } from "@shared/schema";
import { db } from './firebase';
import session from "express-session";
import MemoryStore from "memorystore";
import { FieldValue } from 'firebase-admin/firestore';

export class FirebaseStorage {
  public sessionStore: session.Store;
  
  constructor() {
    const MemoryStoreClass = MemoryStore(session);
    this.sessionStore = new MemoryStoreClass({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
  }

  // Property methods using Firebase Admin SDK
  async getAllProperties(): Promise<Property[]> {
    try {
      console.log("Getting all properties from Firebase Admin SDK - without filters");
      const propertiesRef = db.collection("properties");
      // Get all properties without any filters
      const snapshot = await propertiesRef.get();
      
      if (snapshot.empty) {
        console.log("No properties found in Firebase");
        return [];
      }
      
      const properties = snapshot.docs.map(doc => {
        const data = doc.data();
        const property = {
          ...data,
          id: doc.id,
          userEmail: data.userEmail || data.sellerContact || "Unknown",
        } as unknown as Property;
        
        console.log(`Found property: ID: ${property.id}, Title: ${property.title || 'No title'}`);
        return property;
      });
      
      console.log(`Found ${properties.length} properties in Firebase`);
      return properties;
    } catch (error) {
      console.error("Error fetching properties from Firebase:", error);
      return [];
    }
  }

  async getFeaturedProperties(): Promise<Property[]> {
    try {
      console.log("Getting featured properties from Firebase Admin SDK");
      
      // Since we need more complex filtering than Firebase query can provide,
      // we'll get all properties and filter them manually
      const allProperties = await this.getAllProperties();
      
      // Filter for properties that are approved (not rejected or pending) and featured
      const featuredProperties = allProperties.filter(prop => {
        // Must be featured
        if (prop.featured !== true) return false;
        
        // Only include properties that are published
        if (prop.published !== true) return false;
        
        // ONLY show properties that are verified=true AND status is active/approved
        const isVerified = prop.verified === true; 
        const hasApprovedStatus = prop.status === "approved" || prop.status === "active";
        
        // Must meet ALL conditions to be displayed
        return isVerified && hasApprovedStatus;
      });
      
      // Limit to 6 properties
      const limitedProperties = featuredProperties.slice(0, 6);
      
      console.log(`Found ${limitedProperties.length} featured approved properties in Firebase`);
      return limitedProperties;
    } catch (error) {
      console.error("Error fetching featured properties from Firebase:", error);
      return [];
    }
  }

  async getRecentProperties(): Promise<Property[]> {
    try {
      console.log("Getting recent properties from Firebase Admin SDK");
      
      // Since we need more complex filtering than Firebase query can provide,
      // we'll get all properties and filter them manually
      const allProperties = await this.getAllProperties();
      
      console.log("Before filtering recent properties:", allProperties.map(p => ({
        id: p.id, 
        title: p.title, 
        status: p.status,
        verified: p.verified === true ? "true" : "false"
      })));
      
      // Filter for properties that are approved (not rejected or pending)
      const recentProperties = allProperties.filter(prop => {
        // Only include properties that are published
        if (prop.published !== true) {
          console.log(`Property ${prop.id}: FILTERED OUT - not published`);
          return false;
        }
        
        // ONLY show properties that are verified=true AND status is active/approved
        const isVerified = prop.verified === true; 
        const hasApprovedStatus = prop.status === "approved" || prop.status === "active";
        
        console.log(`Property ${prop.id}: verified=${isVerified}, status=${prop.status}, meets criteria=${isVerified && hasApprovedStatus}`);
        
        // Must meet ALL conditions to be displayed
        return isVerified && hasApprovedStatus;
      });
      
      // Sort by createdAt date, newest first
      recentProperties.sort((a, b) => {
        const aTime = a.createdAt?._seconds || 0;
        const bTime = b.createdAt?._seconds || 0;
        return bTime - aTime;
      });
      
      // Limit to 6 properties
      const limitedProperties = recentProperties.slice(0, 6);
      
      console.log(`Found ${limitedProperties.length} recent approved properties in Firebase`);
      return limitedProperties;
    } catch (error) {
      console.error("Error fetching recent properties from Firebase:", error);
      return [];
    }
  }

  async getUserProperties(userId: string | number): Promise<Property[]> {
    try {
      console.log(`Getting properties for user ${userId} from Firebase Admin SDK`);
      const propertiesRef = db.collection("properties");
      
      // This can be the numeric database ID or a Firebase UID
      const userIdStr = userId.toString();
      console.log(`Searching for properties by user ID: ${userIdStr}`);
      
      // Get all properties and filter by different user identifiers
      const allProperties = await this.getAllProperties();
      
      // Filter properties for this user
      const userProperties = allProperties.filter(property => {
        // Check for matches in different userId and userEmail fields
        const propertyUserId = property.userId?.toString() || '';
        const ownerIdMatch = property.ownerId?.toString() === userIdStr;
        const userIdMatch = propertyUserId === userIdStr;
        
        // Log matches for debugging
        if (userIdMatch || ownerIdMatch) {
          console.log(`Found property match by userId for ${userIdStr}: ${property.id} - ${property.title}`);
          return true;
        }
        
        return false;
      });
      
      console.log(`Found ${userProperties.length} properties for user ${userId} in Firebase`);
      return userProperties;
    } catch (error) {
      console.error(`Error fetching properties for user ${userId} from Firebase:`, error);
      return [];
    }
  }

  async getProperty(id: number | string): Promise<Property | undefined> {
    try {
      console.log(`Getting property ${id} from Firebase Admin SDK`);
      const docRef = db.collection("properties").doc(id.toString());
      const doc = await docRef.get();
      
      if (!doc.exists) {
        console.log(`Property ${id} not found in Firebase`);
        return undefined;
      }
      
      const data = doc.data();
      if (!data) {
        console.log(`Property data is null for ID ${id}`);
        return undefined;
      }
      
      return {
        ...data,
        id: doc.id,
        userEmail: data.userEmail || data.sellerContact || "Unknown",
      } as unknown as Property;
    } catch (error) {
      console.error(`Error fetching property ${id} from Firebase:`, error);
      return undefined;
    }
  }

  async createProperty(property: InsertProperty): Promise<Property> {
    try {
      console.log("Creating property in Firebase Admin SDK");
      const propertyWithTimestamp = {
        ...property,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        published: true,
        status: "active",
      };
      
      const docRef = db.collection("properties").doc();
      await docRef.set(propertyWithTimestamp);
      
      console.log(`Created property with ID ${docRef.id} in Firebase`);
      return {
        ...property,
        id: docRef.id,
      } as unknown as Property;
    } catch (error) {
      console.error("Error creating property in Firebase:", error);
      throw error;
    }
  }

  async deleteProperty(id: number | string): Promise<void> {
    try {
      console.log(`Deleting property ${id} from Firebase Admin SDK`);
      await db.collection("properties").doc(id.toString()).delete();
      console.log(`Deleted property ${id} from Firebase`);
    } catch (error) {
      console.error(`Error deleting property ${id} from Firebase:`, error);
      throw error;
    }
  }

  // These methods are placeholders to match the IStorage interface
  // They would need to be implemented if you want full Firebase integration
  async createUser(user: InsertUser): Promise<User> {
    throw new Error("Method not implemented in FirebaseStorage");
  }

  async getUser(id: number): Promise<User | undefined> {
    throw new Error("Method not implemented in FirebaseStorage");
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    throw new Error("Method not implemented in FirebaseStorage");
  }

  async updateUser(id: number, data: UpdateUser): Promise<User> {
    throw new Error("Method not implemented in FirebaseStorage");
  }

  async deleteUser(id: number): Promise<void> {
    throw new Error("Method not implemented in FirebaseStorage");
  }

  async setPasswordResetToken(email: string, token: string, expires: Date): Promise<void> {
    throw new Error("Method not implemented in FirebaseStorage");
  }

  async getUserByPasswordResetToken(token: string): Promise<User | undefined> {
    throw new Error("Method not implemented in FirebaseStorage");
  }

  async updateTwoFactorSecret(userId: number, secret: string): Promise<void> {
    throw new Error("Method not implemented in FirebaseStorage");
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    throw new Error("Method not implemented in FirebaseStorage");
  }

  async getMessages(conversationId: number): Promise<Message[]> {
    throw new Error("Method not implemented in FirebaseStorage");
  }

  async getConversations(userId: number): Promise<(Conversation & { otherUser: User })[]> {
    throw new Error("Method not implemented in FirebaseStorage");
  }

  async updateConversation(user1Id: number, user2Id: number): Promise<void> {
    throw new Error("Method not implemented in FirebaseStorage");
  }

  async markMessagesAsRead(senderId: number, receiverId: number): Promise<void> {
    throw new Error("Method not implemented in FirebaseStorage");
  }
}