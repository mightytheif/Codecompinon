import { WebSocket, WebSocketServer } from 'ws';
import { storage } from './storage';
import type { Message, User } from '@shared/schema';
import { auth } from './firebase';

// We'll manage client connections with a Map instead of extending WebSocket
interface ClientConnection {
  ws: WebSocket;
  userId: number;
  isAlive: boolean;
}

type ChatMessage = {
  type: 'message';
  receiverId: number;
  content: string;
};

type WebSocketMessage = ChatMessage | { type: 'ping' };

export function setupWebSocket(wss: WebSocketServer) {
  // Store client connections by userId
  const clients = new Map<number, ClientConnection>();
  
  // Set up heartbeat to detect stale connections
  const interval = setInterval(() => {
    clients.forEach((client, userId) => {
      if (!client.isAlive) {
        console.log(`Terminating stale connection for user ${userId}`);
        clients.delete(userId);
        client.ws.terminate();
        return;
      }
      
      // Mark as not alive until we get a pong
      client.isAlive = false;
      client.ws.ping();
    });
  }, 30000);
  
  wss.on('close', () => {
    clearInterval(interval);
  });
  
  wss.on('connection', async (ws, req) => {
    // Default client connection
    let clientConnection: ClientConnection | null = null;
    
    try {
      // Extract user ID and Firebase token from the query string
      const url = new URL(req.url!, `http://${req.headers.host}`);
      const userIdParam = url.searchParams.get('userId') || '0';
      const userId = parseInt(userIdParam);
      const token = url.searchParams.get('token');
      
      if (!token) {
        console.error('WebSocket connection missing token');
        ws.close(1008, 'Authentication required');
        return;
      }
      
      // Even if userId is 0 or invalid, we'll validate with Firebase and create/get user
      
      try {
        // Verify Firebase token
        const decodedToken = await auth.verifyIdToken(token);
        console.log('WebSocket connection authenticated for:', decodedToken.uid);
        
        // Get user from database or create if not exists
        let user = await storage.getUserByEmail(decodedToken.email || '');
        if (!user) {
          console.log('Creating new user from Firebase token');
          user = await storage.createUser({
            name: decodedToken.name || 'User',
            email: decodedToken.email || '',
            password: 'firebase-auth', // Placeholder
            isLandlord: false,
          });
        }
        
        // Now we have a valid user ID from our database
        const numericUserId = user.id;
        
        // Create our client connection object
        clientConnection = {
          ws,
          userId: numericUserId,
          isAlive: true
        };
        
        clients.set(numericUserId, clientConnection);
        console.log(`WebSocket connected for user ${numericUserId}`);
      } catch (error) {
        console.error('Firebase token verification failed:', error);
        ws.close(1008, 'Invalid authentication');
        return;
      }
    } catch (error) {
      console.error('Error during WebSocket connection setup:', error);
      ws.close(1011, 'Server error');
      return;
    }
    
    // Set up event handlers only if we successfully created a client connection
    if (!clientConnection) return;
    
    ws.on('pong', () => {
      // Find the client and mark as alive
      const client = clients.get(clientConnection!.userId);
      if (client) {
        client.isAlive = true;
      }
    });
    
    ws.on('message', async (data: string) => {
      try {
        // Make sure we have a valid connection
        if (!clientConnection) return;
        
        const message: WebSocketMessage = JSON.parse(data.toString());
        
        if (message.type === 'message') {
          const userId = clientConnection.userId;
          
          console.log("WebSocket message:", {
            type: message.type,
            from: userId,
            to: message.receiverId,
            content: message.content
          });
          
          // Store the message in the database
          const savedMessage = await storage.createMessage({
            senderId: userId,
            receiverId: message.receiverId,
            content: message.content,
            isRead: false,
          });

          // Update or create conversation
          await storage.updateConversation(userId, message.receiverId);
          
          // Forward the message to the receiver if they're online
          console.log("Looking for receiver client with ID:", message.receiverId);
          console.log("Active clients:", Array.from(clients.keys()));
          
          const receiverClient = clients.get(message.receiverId);
          if (receiverClient && receiverClient.ws.readyState === WebSocket.OPEN) {
            console.log("Receiver client found! Forwarding message...");
            receiverClient.ws.send(JSON.stringify({
              type: 'message',
              message: savedMessage,
            }));
          } else {
            console.log("Receiver client not found or not connected. Message stored but not delivered in real-time.");
          }
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });
    
    ws.on('close', () => {
      // Clean up on close
      if (clientConnection) {
        clients.delete(clientConnection.userId);
        console.log(`WebSocket disconnected for user ${clientConnection.userId}`);
      }
    });
  });
}
