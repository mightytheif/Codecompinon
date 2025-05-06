import {
  type User,
  type InsertUser,
  type UpdateUser,
  type Property,
  type InsertProperty,
  type Message,
  type InsertMessage,
  type Conversation,
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User management
  createUser(user: InsertUser): Promise<User>;
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  updateUser(id: number, data: UpdateUser): Promise<User>;
  deleteUser(id: number): Promise<void>;
  setPasswordResetToken(email: string, token: string, expires: Date): Promise<void>;
  getUserByPasswordResetToken(token: string): Promise<User | undefined>;
  updateTwoFactorSecret(userId: number, secret: string): Promise<void>;

  // Property management
  createProperty(property: InsertProperty): Promise<Property>;
  getProperty(id: number): Promise<Property | undefined>;
  getAllProperties(): Promise<Property[]>;
  getFeaturedProperties(): Promise<Property[]>;
  getUserProperties(userId: number): Promise<Property[]>;
  deleteProperty(id: number): Promise<void>;

  // Chat methods
  createMessage(message: InsertMessage): Promise<Message>;
  getMessages(conversationId: number): Promise<Message[]>;
  getConversations(userId: number): Promise<(Conversation & { otherUser: User })[]>;
  updateConversation(user1Id: number, user2Id: number): Promise<void>;
  markMessagesAsRead(senderId: number, receiverId: number): Promise<void>;

  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private properties: Map<number, Property>;
  private messages: Map<number, Message>;
  private conversations: Map<number, Conversation>;
  private currentUserId: number;
  private currentPropertyId: number;
  private currentMessageId: number;
  private currentConversationId: number;
  public sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.properties = new Map();
    this.messages = new Map();
    this.conversations = new Map();
    this.currentUserId = 1;
    this.currentPropertyId = 1;
    this.currentMessageId = 1;
    this.currentConversationId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    
    // No sample properties seeded - property creation will only happen through user actions
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id,
      isAdmin: false,
      twoFactorEnabled: false,
      twoFactorSecret: null,
      passwordResetToken: null,
      passwordResetExpires: null,
      lastLoginAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      preferences: null 
    };
    this.users.set(id, user);
    return user;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email
    );
  }

  async updateUser(id: number, data: UpdateUser): Promise<User> {
    const user = await this.getUser(id);
    if (!user) throw new Error("User not found");

    const updatedUser = {
      ...user,
      ...data,
      updatedAt: new Date(),
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number): Promise<void> {
    this.users.delete(id);
  }

  async setPasswordResetToken(email: string, token: string, expires: Date): Promise<void> {
    const user = await this.getUserByEmail(email);
    if (!user) throw new Error("User not found");

    const updatedUser = {
      ...user,
      passwordResetToken: token,
      passwordResetExpires: expires,
      updatedAt: new Date(),
    };
    this.users.set(user.id, updatedUser);
  }

  async getUserByPasswordResetToken(token: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.passwordResetToken === token && 
                user.passwordResetExpires && 
                user.passwordResetExpires > new Date()
    );
  }

  async updateTwoFactorSecret(userId: number, secret: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");

    const updatedUser = {
      ...user,
      twoFactorSecret: secret,
      updatedAt: new Date(),
    };
    this.users.set(userId, updatedUser);
  }

  async createProperty(insertProperty: InsertProperty): Promise<Property> {
    const id = this.currentPropertyId++;
    const property: Property = {
      ...insertProperty,
      id,
      createdAt: new Date(),
      features: insertProperty.features ?? [],
      images: insertProperty.images ?? [],
    };
    this.properties.set(id, property);
    return property;
  }

  async getProperty(id: number): Promise<Property | undefined> {
    return this.properties.get(id);
  }

  async getAllProperties(): Promise<Property[]> {
    return Array.from(this.properties.values());
  }

  async getFeaturedProperties(): Promise<Property[]> {
    return Array.from(this.properties.values()).slice(0, 3);
  }
  
  async getUserProperties(userId: number): Promise<Property[]> {
    console.log(`Getting properties for user ID: ${userId}`);
    const userProperties = Array.from(this.properties.values())
      .filter(property => property.userId === userId);
    
    console.log(`Found ${userProperties.length} properties for user ${userId}`);
    return userProperties;
  }
  
  async deleteProperty(id: number): Promise<void> {
    console.log(`Deleting property with ID: ${id}`);
    const deleted = this.properties.delete(id);
    console.log(`Property deletion ${deleted ? 'successful' : 'failed'}`);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.currentMessageId++;
    const message: Message = {
      ...insertMessage,
      id,
      createdAt: new Date(),
    };
    this.messages.set(id, message);
    return message;
  }

  async getMessages(conversationId: number): Promise<Message[]> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return [];

    return Array.from(this.messages.values()).filter(
      (message) =>
        (message.senderId === conversation.user1Id && message.receiverId === conversation.user2Id) ||
        (message.senderId === conversation.user2Id && message.receiverId === conversation.user1Id)
    ).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async getConversations(userId: number): Promise<(Conversation & { otherUser: User })[]> {
    console.log(`Getting conversations for userId: ${userId}`);
    console.log(`Available users in database:`, Array.from(this.users.entries()).map(([id, user]) => ({
      id,
      email: user.email
    })));
    console.log(`Available conversations:`, Array.from(this.conversations.entries()).map(([id, conv]) => ({
      id,
      user1Id: conv.user1Id,
      user2Id: conv.user2Id
    })));

    const conversations = Array.from(this.conversations.values())
      .filter((conv) => conv.user1Id === userId || conv.user2Id === userId)
      .map((conv) => {
        const otherUserId = conv.user1Id === userId ? conv.user2Id : conv.user1Id;
        const otherUser = this.users.get(otherUserId);
        
        if (!otherUser) {
          console.error(`Could not find other user with ID ${otherUserId} for conversation ${conv.id}`);
          // Create a placeholder user to prevent crash
          return {
            ...conv,
            otherUser: {
              id: otherUserId,
              name: 'Unknown User',
              email: 'unknown@example.com',
              password: '',
              isLandlord: null,
              isAdmin: null,
              emailVerified: null,
              phoneVerified: null,
              twoFactorEnabled: null,
              twoFactorSecret: null,
              resetToken: null,
              resetTokenExpires: null,
              phone: null,
              address: null,
              preferences: null
            },
          };
        }
        
        return {
          ...conv,
          otherUser: otherUser,
        };
      })
      .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());

    console.log(`Returning ${conversations.length} conversations for user ${userId}`);
    return conversations;
  }

  async updateConversation(user1Id: number, user2Id: number): Promise<void> {
    console.log(`Updating conversation between user1Id: ${user1Id} and user2Id: ${user2Id}`);
    
    // Check if both users exist
    const user1 = this.users.get(user1Id);
    const user2 = this.users.get(user2Id);
    
    if (!user1) {
      console.error(`User with ID ${user1Id} not found when updating conversation.`);
    }
    
    if (!user2) {
      console.error(`User with ID ${user2Id} not found when updating conversation.`);
    }
    
    const existingConversation = Array.from(this.conversations.values()).find(
      (conv) =>
        (conv.user1Id === user1Id && conv.user2Id === user2Id) ||
        (conv.user1Id === user2Id && conv.user2Id === user1Id)
    );

    if (existingConversation) {
      console.log(`Found existing conversation with ID ${existingConversation.id}, updating lastMessageAt`);
      existingConversation.lastMessageAt = new Date();
      this.conversations.set(existingConversation.id, existingConversation);
    } else {
      console.log(`Creating new conversation between user ${user1Id} and user ${user2Id}`);
      const id = this.currentConversationId++;
      const newConversation = {
        id,
        user1Id,
        user2Id,
        lastMessageAt: new Date(),
      };
      this.conversations.set(id, newConversation);
      console.log(`New conversation created with ID ${id}`);
    }
  }

  async markMessagesAsRead(senderId: number, receiverId: number): Promise<void> {
    for (const [id, message] of this.messages) {
      if (message.senderId === senderId && message.receiverId === receiverId) {
        message.isRead = true;
        this.messages.set(id, message);
      }
    }
  }
}

export const storage = new MemStorage();