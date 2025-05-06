import express, { Express, Request as ExpressRequest, Response, NextFunction } from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { storage } from "./storage";
import { insertPropertySchema, User } from "@shared/schema";
import { z } from "zod";
import { setupAuth } from "./auth";
import { setupWebSocket } from "./websocket";
import { auth, db } from "./firebase";
import { FirebaseStorage } from "./firebase-storage";

// Extend Express request type to include user
interface Request extends ExpressRequest {
  user?: User;
  isAuthenticated(): this is Request & { user: User };
}

export async function registerRoutes(app: Express) {
  // Set up authentication routes
  setupAuth(app);
  
  // Initialize Firebase storage for property operations
  const firebaseStorage = new FirebaseStorage();
  
  // Two separate routes for user deletion:
  // 1. Self-deletion (for any user to delete their own account)
  // 2. Admin deletion (admin-only endpoint to delete any user)
  
  // Route for self-deletion
  app.delete("/api/users/self", async (req: Request, res: Response) => {
    try {
      // Check if the request is authenticated
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const idToken = authHeader.split('Bearer ')[1];
      
      // Verify the token and get the requesting user's information
      let decodedToken;
      try {
        decodedToken = await auth.verifyIdToken(idToken);
      } catch (tokenError) {
        console.error("Invalid token:", tokenError);
        return res.status(401).json({ message: "Invalid authentication token" });
      }
      
      const userId = decodedToken.uid;
      console.log(`User ${userId} is deleting their own account`);
      
      // Delete the user from Firebase Authentication
      try {
        await auth.deleteUser(userId);
        console.log(`Successfully deleted user ${userId} from Firebase Authentication`);
        return res.status(200).json({ message: "Your account was successfully deleted" });
      } catch (deleteError: any) {
        console.error(`Error deleting user ${userId}:`, deleteError);
        if (deleteError.code === 'auth/user-not-found') {
          return res.status(404).json({ message: "User not found" });
        }
        throw deleteError;
      }
    } catch (error: any) {
      console.error("Error deleting user account:", error);
      return res.status(500).json({ 
        message: "Failed to delete your account",
        error: error.message 
      });
    }
  });
  
  // Admin-only route for deleting any user
  app.delete("/api/admin/users/:uid", async (req: Request, res: Response) => {
    try {
      // Check if the request is authenticated
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const idToken = authHeader.split('Bearer ')[1];
      
      // Verify the token and get the requesting user's information
      let decodedToken;
      try {
        decodedToken = await auth.verifyIdToken(idToken);
      } catch (tokenError) {
        console.error("Invalid token:", tokenError);
        return res.status(401).json({ message: "Invalid authentication token" });
      }
      
      // Get the admin status directly from the decoded token claims
      // This ensures we're using the latest claim values from the token
      const hasAdminClaimInToken = decodedToken.admin === true;
      
      // Also get the user record for additional verification
      const adminUser = await auth.getUser(decodedToken.uid);
      const adminEmail = adminUser.email || '';
      const adminDisplayName = adminUser.displayName || '';
      
      // Secondary check: Look for admin claim in Firebase user record
      const hasAdminClaimInUser = adminUser.customClaims && adminUser.customClaims.admin === true;
      
      // Third check: Email domain for @sakany.com (as fallback)
      const hasAdminEmail = adminEmail.toLowerCase().endsWith('@sakany.com');
      
      // Log full verification details for debugging
      console.log(`Admin verification for user ${decodedToken.uid} (${adminEmail}):`, {
        tokenClaims: decodedToken,
        hasAdminClaimInToken,
        hasAdminClaimInUser,
        hasAdminEmail,
        userCustomClaims: adminUser.customClaims || 'none'
      });
      
      // Check for additional verification via X-Admin-Email header
      const adminEmailHeader = req.headers['x-admin-email'] as string;
      if (adminEmailHeader) {
        console.log(`Admin email header verification: ${adminEmailHeader}`);
        
        // Verify the email header matches the authenticated user's email
        if (adminEmailHeader !== adminEmail) {
          console.log(`Email mismatch - Auth: ${adminEmail}, Header: ${adminEmailHeader}`);
          return res.status(403).json({ message: "Email verification failed" });
        }
      }
      
      // User must have AT LEAST ONE of these admin indicators
      const isAdmin = hasAdminClaimInToken || hasAdminClaimInUser || hasAdminEmail;
      
      // Enhanced logging for debugging admin permissions
      console.log(`ADMIN CHECK DETAILS for ${decodedToken.uid} (${adminEmail}):`, {
        hasAdminClaimInToken,
        hasAdminClaimInUser,
        hasAdminEmail,
        tokenClaims: decodedToken,
        userCustomClaims: adminUser.customClaims || 'none',
        finalResult: isAdmin ? 'ADMIN ACCESS GRANTED' : 'ADMIN ACCESS DENIED'
      });
      
      // For now, allow all @sakany.com emails to have admin access
      // This ensures admin functionality works while we debug custom claims
      if (adminEmail.toLowerCase().endsWith('@sakany.com')) {
        console.log(`Admin access granted to ${adminEmail} based on email domain`);
        // Continue with admin operations
      } else if (!isAdmin) {
        console.log(`User ${decodedToken.uid} with email ${adminEmail} denied admin access:`, {
          tokenClaim: hasAdminClaimInToken ? 'YES' : 'NO',
          userClaim: hasAdminClaimInUser ? 'YES' : 'NO',
          emailCheck: hasAdminEmail ? 'YES' : 'NO'
        });
        
        return res.status(403).json({ 
          message: "You don't have the required admin permissions to delete users."
        });
      }
      
      // Additional check to ensure the email header matches the authenticated user's email
      // This helps prevent token reuse or manipulation
      if (adminEmailHeader && adminEmailHeader !== adminEmail) {
        console.log(`Email mismatch - Auth: ${adminEmail}, Header: ${adminEmailHeader}`);
        return res.status(403).json({
          message: "Email verification failed"
        });
      }
      
      console.log(`Admin check passed for user ${decodedToken.uid} - proceeding with deletion operation`);
      
      // Get the user ID to delete from params
      const { uid } = req.params;
      
      console.log(`Admin ${adminEmail} is deleting user ${uid}`);
      
      // Delete the user from Firebase Authentication
      try {
        console.log(`Attempting to delete Firebase auth user with UID: ${uid} (admin: ${adminEmail})`);
        
        // First verify the user exists
        try {
          const userToDelete = await auth.getUser(uid);
          console.log(`Verified user ${uid} exists: ${userToDelete.email}`);
        } catch (userError) {
          if (userError.code === 'auth/user-not-found') {
            console.log(`User ${uid} not found in Firebase Authentication`);
            return res.status(404).json({ message: "User not found" });
          }
          console.error(`Error verifying user ${uid}:`, userError);
        }
        
        // Then delete the user
        await auth.deleteUser(uid);
        console.log(`Successfully deleted user ${uid} from Firebase Authentication by admin ${adminEmail}`);
        return res.status(200).json({ 
          message: `User ${uid} deleted successfully from Firebase Authentication`
        });
      } catch (deleteError: any) {
        console.error(`Error deleting user ${uid}:`, deleteError);
        if (deleteError.code === 'auth/user-not-found') {
          return res.status(404).json({ message: "User not found" });
        }
        // More detailed error for debugging
        return res.status(500).json({ 
          message: "Failed to delete user from Firebase Authentication", 
          error: deleteError.message,
          code: deleteError.code || 'unknown'
        });
      }
    } catch (error: any) {
      console.error("Error in admin user deletion:", error);
      return res.status(500).json({ 
        message: "Failed to delete user from Firebase Authentication",
        error: error.message 
      });
    }
  });

  // Properties endpoints
  app.get("/api/properties", async (req, res) => {
    try {
      // Get limit from query params
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      
      // Always try Firebase first for all properties
      try {
        console.log("Getting all properties from Firebase...");
        let allProperties = await firebaseStorage.getAllProperties();
        
        // Filter out properties that are not approved/active (status=rejected or pending)
        console.log("Before filtering, properties:", allProperties.map(p => ({
          id: p.id, 
          title: p.title, 
          status: p.status,
          verified: p.verified === true ? "true" : "false"
        })));
        
        allProperties = allProperties.filter(prop => {
          // ONLY show properties that are verified=true AND status is active/approved
          // This way, we ensure only admin-approved properties show up
          const isVerified = prop.verified === true; 
          const hasApprovedStatus = prop.status === "approved" || prop.status === "active";
          
          // Debug each property's approval state
          console.log(`Property ${prop.id}: verified=${isVerified}, status=${prop.status}, approved=${isVerified && hasApprovedStatus}`);
          
          // Must meet BOTH conditions to be displayed
          return isVerified && hasApprovedStatus;
        });
        
        console.log("After filtering, remaining properties:", allProperties.map(p => p.id));
        
        console.log(`Found ${allProperties.length} approved properties in Firebase`);
        
        if (allProperties.length > 0) {
          return res.json(limit ? allProperties.slice(0, limit) : allProperties);
        }
      } catch (firebaseError) {
        console.error("Firebase error, falling back to storage:", firebaseError);
      }
      
      // Fallback to in-memory storage
      console.log("Falling back to in-memory storage for properties");
      const properties = await storage.getAllProperties();
      res.json(properties);
    } catch (error) {
      console.error("Error fetching properties:", error);
      res.status(500).json({ message: "Error fetching properties" });
    }
  });

  app.get("/api/properties/featured", async (req, res) => {
    try {
      // Use Firebase storage for featured properties
      const featuredProperties = await firebaseStorage.getFeaturedProperties();
      
      if (featuredProperties.length > 0) {
        return res.json(featuredProperties);
      }
      
      // Fall back to in-memory storage if no Firebase properties found
      const properties = await storage.getFeaturedProperties();
      res.json(properties);
    } catch (error) {
      console.error("Error fetching featured properties:", error);
      
      // Fall back to in-memory storage in case of error
      const properties = await storage.getFeaturedProperties();
      res.json(properties);
    }
  });

  // New endpoint to get properties for a specific user (protected)
  app.get("/api/properties/user", checkAuth, async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    console.log(`Fetching properties for user ID: ${req.user.id}`);
    
    try {
      // If user has provided their email in the header, we can use it as an additional lookup method
      const userEmail = req.headers['x-user-email'] as string;
      if (userEmail) {
        console.log(`Received X-User-Email header: ${userEmail}`);
        // Try to get properties using Firebase for better accuracy
        const firebaseProperties = await firebaseStorage.getAllProperties();
        const userProperties = firebaseProperties.filter(prop => 
          prop.userEmail === userEmail || 
          prop.sellerContact === userEmail
        );
        
        if (userProperties.length > 0) {
          console.log(`Found ${userProperties.length} properties by email ${userEmail}`);
          return res.json(userProperties);
        }
      }
      
      // Fall back to regular user ID lookup if no properties found by email
      const userProperties = await storage.getUserProperties(req.user.id);
      console.log(`Returning ${userProperties.length} properties`);
      res.json(userProperties);
    } catch (error) {
      console.error("Error fetching user properties:", error);
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });
  
  // Direct Firebase UID property lookup (protected)
  app.get("/api/properties/firebase-user", checkAuth, async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const firebaseUid = req.headers['x-firebase-uid'] as string;
    if (!firebaseUid) {
      return res.status(400).json({ message: "Missing Firebase UID header" });
    }
    
    console.log(`Looking up properties directly by Firebase UID: ${firebaseUid}`);
    
    try {
      // Get all properties from Firebase
      const allProperties = await firebaseStorage.getAllProperties();
      
      // Filter for properties with matching UID
      const userProperties = allProperties.filter(prop => 
        prop.userId === firebaseUid || 
        prop.ownerId === firebaseUid
      );
      
      console.log(`Found ${userProperties.length} properties for Firebase UID ${firebaseUid}`);
      res.json(userProperties);
    } catch (error) {
      console.error("Error fetching Firebase properties:", error);
      res.status(500).json({ message: "Failed to fetch Firebase properties" });
    }
  });
  
  // Delete property endpoint (protected)
  app.delete("/api/properties/:id", checkAuth, async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const propertyId = parseInt(req.params.id);
    const property = await storage.getProperty(propertyId);
    
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }
    
    // Check if user owns this property
    if (property.userId !== req.user.id) {
      return res.status(403).json({ message: "You don't have permission to delete this property" });
    }
    
    await storage.deleteProperty(propertyId);
    res.sendStatus(200);
  });

  app.get("/api/properties/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const property = await storage.getProperty(id);
    if (!property) {
      res.status(404).json({ message: "Property not found" });
      return;
    }
    res.json(property);
  });
  
  // API endpoint to get property feedback
  app.get("/api/properties/:id/feedback", checkAuth, async (req: Request, res: Response) => {
    const propertyId = req.params.id;
    
    try {
      // Get property to verify ownership
      const propertyRef = db.collection('properties').doc(propertyId);
      const propertyDoc = await propertyRef.get();
      
      if (!propertyDoc.exists) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      const property = propertyDoc.data();
      const ownerId = property?.userId || property?.ownerId;
      
      // Get user from firebase token
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const idToken = authHeader.split('Bearer ')[1];
      const decodedToken = await auth.verifyIdToken(idToken);
      const isAdmin = decodedToken.admin === true || decodedToken.email?.endsWith('@sakany.com');
      
      // Check if user is owner or admin
      if (!isAdmin && ownerId !== decodedToken.uid) {
        return res.status(403).json({ message: "You do not have permission to access this property's feedback" });
      }
      
      // Get all feedback
      const feedbackRef = propertyRef.collection('feedback');
      const feedbackSnapshot = await feedbackRef.orderBy('createdAt', 'desc').get();
      
      const feedback = [];
      feedbackSnapshot.forEach(doc => {
        feedback.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Mark all unread feedback as read if requested and user is the owner
      const { markAsRead } = req.query;
      if (markAsRead === 'true' && ownerId === decodedToken.uid) {
        const batch = db.batch();
        
        feedbackSnapshot.forEach(doc => {
          if (doc.data().read === false) {
            batch.update(doc.ref, { read: true });
          }
        });
        
        await batch.commit();
      }
      
      return res.status(200).json(feedback);
    } catch (error: any) {
      console.error("Error fetching property feedback:", error);
      return res.status(500).json({ 
        message: "Failed to fetch feedback",
        error: error.message 
      });
    }
  });

  // Protected route example
  app.post("/api/properties", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const property = insertPropertySchema.parse(req.body);
      const created = await storage.createProperty(property);
      res.status(201).json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid property data" });
        return;
      }
      throw error;
    }
  });

  // Custom middleware to check authentication from both session and Firebase
  async function checkAuth(req: Request, res: Response, next: NextFunction) {
    // First check if user is authenticated through session
    if (req.isAuthenticated()) {
      return next();
    }
    
    // If not, check Firebase token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const idToken = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      console.log("API endpoint accessed with Firebase token for:", decodedToken.uid);
      
      // Get or create user in our database system
      let user = await storage.getUserByEmail(decodedToken.email || '');
      if (!user) {
        console.log("Creating new user from Firebase token in API request");
        user = await storage.createUser({
          name: decodedToken.name || decodedToken.email?.split('@')[0] || 'User',
          email: decodedToken.email || '',
          password: 'firebase-auth', // Placeholder
          isLandlord: false,
        });
      }
      
      // Set the user on the request
      req.user = user;
      next();
    } catch (error) {
      console.error("API auth error:", error);
      res.status(401).json({ message: "Invalid authentication token" });
    }
  }

  // Report notification endpoint
  app.post("/api/reports/notify-owner", checkAuth, async (req: Request, res: Response) => {
    try {
      // Check if user is admin
      const decodedToken = await auth.verifyIdToken(req.headers.authorization?.split('Bearer ')[1] || '');
      const isAdmin = decodedToken.admin === true || decodedToken.email?.endsWith('@sakany.com');
      
      if (!isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { reportId, propertyId, ownerEmail, propertyTitle, adminNotes, reportReason, status } = req.body;
      
      if (!reportId || !propertyId || !adminNotes) {
        return res.status(400).json({ 
          message: "Missing required fields",
          required: ["reportId", "propertyId", "adminNotes"]
        });
      }
      
      // Get reference to property document
      const propertyRef = db.collection('properties').doc(propertyId);
      const propertyDoc = await propertyRef.get();
      
      if (!propertyDoc.exists) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      const propertyData = propertyDoc.data();
      const ownerId = propertyData?.userId || propertyData?.ownerId;
      
      if (!ownerId) {
        return res.status(404).json({ message: "Property owner not found" });
      }
      
      // Create a notification in the property's feedback collection
      const feedbackCollection = db.collection('properties').doc(propertyId).collection('feedback');
      
      await feedbackCollection.add({
        reportId: reportId,
        propertyId: propertyId,
        propertyTitle: propertyTitle || propertyData?.title,
        adminNotes: adminNotes,
        reason: reportReason,
        status: status,
        createdAt: new Date(),
        read: false
      });
      
      // Update the report to mark notification as sent
      await db.collection('reports').doc(reportId).update({
        notificationSent: true,
        notificationDate: new Date()
      });
      
      return res.status(200).json({ 
        message: "Feedback added to property",
        success: true
      });
    } catch (error: any) {
      console.error("Error adding property feedback:", error);
      return res.status(500).json({ 
        message: "Failed to add feedback",
        error: error.message 
      });
    }
  });

  // Chat endpoints
  app.get("/api/conversations", checkAuth, async (req, res) => {
    // TypeScript check for req.user
    if (!req.user) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    
    const conversations = await storage.getConversations(req.user.id);
    res.json(conversations);
  });

  app.get("/api/messages/:conversationId", checkAuth, async (req, res) => {
    const conversationId = parseInt(req.params.conversationId);
    const messages = await storage.getMessages(conversationId);
    res.json(messages);
  });

  app.post("/api/messages/read", checkAuth, async (req, res) => {
    // TypeScript check for req.user
    if (!req.user) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    
    const { senderId } = req.body;
    await storage.markMessagesAsRead(senderId, req.user.id);
    res.sendStatus(200);
  });

  const httpServer = createServer(app);

  // Set up WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  setupWebSocket(wss);

  return httpServer;
}