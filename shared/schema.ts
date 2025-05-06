import { pgTable, text, serial, integer, boolean, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  isLandlord: boolean("is_landlord").default(false),
  isAdmin: boolean("is_admin").default(false),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorSecret: text("two_factor_secret"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  preferences: json("preferences").$type<{
    location: string;
    budget: number;
    propertyType: string;
    lifestyle: string[];
  }>(),
});

export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(),
  location: text("location").notNull(),
  bedrooms: integer("bedrooms").notNull(),
  bathrooms: integer("bathrooms").notNull(),
  area: integer("area").notNull(),
  type: text("type").notNull(),
  features: json("features").$type<string[]>(),
  images: json("images").$type<string[]>(),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users)
  .omit({ 
    id: true, 
    isAdmin: true,
    twoFactorEnabled: true,
    twoFactorSecret: true,
    passwordResetToken: true,
    passwordResetExpires: true,
    lastLoginAt: true,
    createdAt: true,
    updatedAt: true,
    preferences: true 
  })
  .extend({
    password: z.string().min(6, "Password must be at least 6 characters"),
    email: z.string().email("Invalid email address"),
    name: z.string().min(1, "Name is required"),
    isLandlord: z.boolean()
  });

export const updateUserSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  isLandlord: z.boolean().optional(),
  twoFactorEnabled: z.boolean().optional(),
  lastLoginAt: z.date().optional(),
  preferences: z.object({
    location: z.string(),
    budget: z.number(),
    propertyType: z.string(),
    lifestyle: z.array(z.string()),
  }).optional(),
});

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdAt: true,
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").references(() => users.id).notNull(),
  receiverId: integer("receiver_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  isRead: boolean("is_read").default(false),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  user1Id: integer("user1_id").references(() => users.id).notNull(),
  user2Id: integer("user2_id").references(() => users.id).notNull(),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
});

export const propertySchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  price: z.coerce.number().min(1, "Price must be greater than 0"),
  location: z.string().min(3, "Location must be at least 3 characters"),
  bedrooms: z.coerce.number().min(0, "Bedrooms must be 0 or more"),
  bathrooms: z.coerce.number().min(0, "Bathrooms must be 0 or more"),
  area: z.coerce.number().min(1, "Area must be greater than 0"),
  propertyType: z.enum(["apartment", "house", "villa", "studio", "land", "commercial"]),
  forSale: z.boolean().default(false),
  forRent: z.boolean().default(false),
  featured: z.boolean().default(false),
  availabilityDate: z.date().optional(),
  sellerName: z.string().optional(),
  sellerPhone: z.string().optional(),
  sellerContact: z.string().email("Invalid email address").optional(),
  status: z.string().default("active"),
  published: z.boolean().default(true),
}).refine(data => data.forSale || data.forRent, {
  message: "Property must be either for sale or for rent",
  path: ["forSale"],
});

// Types for database models
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type User = typeof users.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;

// Types for Firebase models
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type FirebaseProperty = z.infer<typeof propertySchema> & {
  id: string;
  userId: string;
  userEmail: string;
  createdAt: any;
  updatedAt: any;
  images: string[];
  status: string;
};

// Use FirebaseProperty for most operations since we're primarily using Firebase
export type Property = FirebaseProperty;

// Firebase messaging data models
export const firebaseConversationSchema = z.object({
  participants: z.array(z.string()),
  participantNames: z.record(z.string()),
  lastMessage: z.string(),
  lastMessageTime: z.any(),
  createdAt: z.any(),
  propertyId: z.string().optional(),
  propertyTitle: z.string().optional(),
  unreadBy: z.record(z.number()),
});

export const firebaseMessageSchema = z.object({
  conversationId: z.string(),
  senderId: z.string(),
  senderName: z.string(),
  recipientId: z.string(),
  recipientName: z.string(),
  text: z.string(),
  timestamp: z.any(),
  read: z.boolean(),
  propertyId: z.string().optional(),
  propertyTitle: z.string().optional(),
});

// Schema for property reports
export const reportSchema = z.object({
  id: z.string().optional(),
  propertyId: z.string(),
  propertyTitle: z.string(),
  reportedBy: z.string(),
  reporterEmail: z.string().email("Invalid email address"),
  reason: z.string().min(3, "Reason must be at least 3 characters"),
  details: z.string().min(10, "Details must be at least 10 characters"),
  status: z.enum(["pending", "reviewed", "resolved", "dismissed"]).default("pending"),
  createdAt: z.any(),
  updatedAt: z.any(),
  adminNotes: z.string().optional(),
  reviewedBy: z.string().optional(),
});

export type FirebaseConversation = z.infer<typeof firebaseConversationSchema>;
export type FirebaseMessage = z.infer<typeof firebaseMessageSchema>;
export type PropertyReport = z.infer<typeof reportSchema>;
