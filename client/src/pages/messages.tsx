import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  Timestamp,
  DocumentData
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, User as UserIcon, Clock, Home, ChevronRight, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import IndexCreationHelper, { showIndexHelperIfNeeded } from "@/lib/create-firebase-index";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  text: string;
  timestamp: Timestamp;
  read: boolean;
  propertyId?: string;
  propertyTitle?: string;
}

interface Conversation {
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
  lastMessage: string;
  lastMessageTime: Timestamp;
  propertyId?: string;
  propertyTitle?: string;
  unreadCount: number;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState("conversations");
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);
  const [selectedRecipientName, setSelectedRecipientName] = useState<string>("");
  const [indexUrl, setIndexUrl] = useState<string | null>(null);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);

  // Check for URL parameters to select existing conversation
  useEffect(() => {
    if (!user) return;
    
    // Parse URL parameters
    const params = new URLSearchParams(window.location.search);
    const selectedConvoId = params.get('selected');
    
    // If a conversation is selected via URL parameter
    if (selectedConvoId) {
      setSelectedConversation(selectedConvoId);
      setActiveTab("messages");
      
      // Clean up URL after selecting the conversation
      window.history.replaceState({}, document.title, "/messages");
    }
  }, [user]);

  // Load conversations for the user
  useEffect(() => {
    if (!user) return;

    // Get the user's conversations
    setLoading(true);
    
    try {
      const conversationsRef = collection(db, "conversations");
      // For the users who are still building the index, we'll use a simpler query
      // that doesn't require the composite index
      const q = query(
        conversationsRef,
        where("participants", "array-contains", user.uid)
        // Temporarily removing the sort to bypass the index issue
        // This will still work but messages might not be sorted by time
        // orderBy("lastMessageTime", "desc")
      );

      const unsubscribe = onSnapshot(
        q, 
        (snapshot) => {
          const conversationsList: Conversation[] = [];
          
          snapshot.forEach((doc) => {
            const data = doc.data();
            
            // Calculate unread messages
            let unreadCount = 0;
            if (data.unreadBy && data.unreadBy[user.uid]) {
              unreadCount = data.unreadBy[user.uid];
            }
            
            const conversation: Conversation = {
              id: doc.id,
              participants: data.participants || [],
              participantNames: data.participantNames || {},
              lastMessage: data.lastMessage || "New conversation",
              lastMessageTime: data.lastMessageTime,
              propertyId: data.propertyId,
              propertyTitle: data.propertyTitle,
              unreadCount,
            };
            
            conversationsList.push(conversation);
          });
          
          // Sort conversations by lastMessageTime (newest to oldest)
          const sortedConversations = conversationsList.sort((a, b) => {
            // Handle cases where timestamp might be null or undefined
            if (!a.lastMessageTime) return 1;
            if (!b.lastMessageTime) return -1;
            
            // Convert to milliseconds if they're Firestore timestamps
            const timeA = a.lastMessageTime.toMillis ? a.lastMessageTime.toMillis() : 0;
            const timeB = b.lastMessageTime.toMillis ? b.lastMessageTime.toMillis() : 0;
            
            // Sort in descending order (newest first)
            return timeB - timeA;
          });
          
          setConversations(sortedConversations);
          setLoading(false);
        }, 
        (error: any) => {
          console.error("Error fetching conversations:", error);
          setLoading(false);
          
          // If it's a permission error, show message with rules hint
          if (error.code === "permission-denied") {
            toast({
              title: "Error Loading Conversations",
              description: "You don't have permission to view these conversations. Please check Firebase security rules.",
              variant: "destructive",
            });
          } 
          // If it's a missing index, show helper
          else if (error.code === "resource-exhausted" || error.code === "failed-precondition") {
            if (showIndexHelperIfNeeded(error)) {
              setIndexUrl("https://console.firebase.google.com/project/sakany10/firestore/indexes");
            }
          }
          // Otherwise show generic error
          else {
            toast({
              title: "Error Loading Conversations",
              description: error.message || "Failed to load conversations",
              variant: "destructive",
            });
          }
        }
      );

      return () => unsubscribe();
    } catch (error: any) {
      console.error("Error setting up conversations listener:", error);
      setLoading(false);
      toast({
        title: "Error",
        description: error.message || "Failed to load conversations",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  // Load messages for selected conversation
  useEffect(() => {
    if (!selectedConversation || !user) return;

    try {
      // Mark messages as read when conversation is opened
      const conversationRef = doc(db, "conversations", selectedConversation);
      updateDoc(conversationRef, {
        [`unreadBy.${user.uid}`]: 0
      }).catch(error => console.error("Error updating read status:", error));

      // Listen for messages in this conversation
      const messagesRef = collection(db, "messages");
      // For users who are still building the index, we'll use a simpler query
      // That doesn't require the composite index
      const q = query(
        messagesRef,
        where("conversationId", "==", selectedConversation)
        // Temporarily removing the sort to bypass the index issue 
        // orderBy("timestamp", "asc")
      );

      const unsubscribe = onSnapshot(
        q, 
        (snapshot) => {
          const messagesList: Message[] = [];
          
          snapshot.forEach((doc) => {
            const data = doc.data();
            const message: Message = {
              id: doc.id,
              senderId: data.senderId,
              senderName: data.senderName || "Unknown User",
              recipientId: data.recipientId,
              recipientName: data.recipientName || "Unknown User",
              text: data.text,
              timestamp: data.timestamp,
              read: data.read || false,
              propertyId: data.propertyId,
              propertyTitle: data.propertyTitle,
            };
            
            messagesList.push(message);
          });
          
          // Sort messages by timestamp (oldest to newest)
          const sortedMessages = messagesList.sort((a, b) => {
            // Handle cases where timestamp might be null or undefined
            if (!a.timestamp) return -1;
            if (!b.timestamp) return 1;
            
            // Convert to milliseconds if they're Firestore timestamps
            const timeA = a.timestamp.toMillis ? a.timestamp.toMillis() : 0;
            const timeB = b.timestamp.toMillis ? b.timestamp.toMillis() : 0;
            
            return timeA - timeB;
          });
          
          setMessages(sortedMessages);
          scrollToBottom();
        },
        (error: any) => {
          console.error("Error fetching messages:", error);
          
          // Check if it's an index error and display the helper
          if (error.code === "resource-exhausted" || error.code === "failed-precondition") {
            // Log the full error message to help diagnose
            console.log("Exact error message:", error.message);
            
            // Extract direct URL if available
            let directUrl = null;
            if (error.message) {
              const urlMatch = /https?:\/\/console\.firebase\.google\.com\/[^\s"']+/g.exec(error.message);
              if (urlMatch && urlMatch[0]) {
                directUrl = urlMatch[0];
                console.log("Found direct URL in error:", directUrl);
                setIndexUrl(directUrl);
                return;
              }
            }
            
            if (showIndexHelperIfNeeded(error)) {
              console.log("Index creation needed for messages. Please follow the instructions.");
              setIndexUrl("https://console.firebase.google.com/project/sakany10/firestore/indexes");
            }
          } else {
            toast({
              title: "Error Loading Messages",
              description: error.code === "permission-denied" 
                ? "You don't have permission to view these messages. Please check Firebase security rules."
                : error.message || "Failed to load messages",
              variant: "destructive",
            });
          }
        }
      );

      return () => unsubscribe();
    } catch (error: any) {
      console.error("Error setting up messages listener:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load messages",
        variant: "destructive",
      });
    }
  }, [selectedConversation, user, toast]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !user || !selectedConversation) return;

    try {
      // First, get the conversation to determine the recipient
      const conversationRef = doc(db, "conversations", selectedConversation);
      const conversationSnap = await getDoc(conversationRef);
      
      if (!conversationSnap.exists()) {
        toast({
          title: "Error",
          description: "Conversation not found",
          variant: "destructive",
        });
        return;
      }
      
      const conversationData = conversationSnap.data();
      const recipientId = conversationData.participants.find(
        (pid: string) => pid !== user.uid
      );
      
      if (!recipientId) {
        toast({
          title: "Error",
          description: "Recipient not found",
          variant: "destructive",
        });
        return;
      }

      // Add the message
      const messagesRef = collection(db, "messages");
      try {
        await addDoc(messagesRef, {
          conversationId: selectedConversation,
          senderId: user.uid,
          senderName: user.displayName || user.email,
          recipientId,
          recipientName: conversationData.participantNames[recipientId] || "User",
          text: messageText,
          timestamp: serverTimestamp(),
          read: false,
          propertyId: conversationData.propertyId,
          propertyTitle: conversationData.propertyTitle,
        });
      } catch (innerError: any) {
        console.error("Error sending message:", innerError);
        toast({
          title: "Message Error",
          description: innerError.code === "permission-denied" 
            ? "You don't have permission to send messages. Please verify Firebase rules allow message creation."
            : innerError.message || "Failed to add message",
          variant: "destructive",
        });
        return;
      }

      // Update the conversation last message
      try {
        await updateDoc(conversationRef, {
          lastMessage: messageText,
          lastMessageTime: serverTimestamp(),
          // Increment unread message count for recipient
          [`unreadBy.${recipientId}`]: (conversationData.unreadBy?.[recipientId] || 0) + 1,
        });
      } catch (innerError: any) {
        console.error("Error updating conversation:", innerError);
        toast({
          title: "Conversation Update Error",
          description: innerError.code === "permission-denied" 
            ? "You don't have permission to update conversations. Please verify Firebase rules allow conversation updates."
            : innerError.message || "Failed to update conversation",
          variant: "destructive",
        });
        return;
      }

      setMessageText("");
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: error.code === "permission-denied" 
          ? "Missing or insufficient permissions. Please verify you have the proper access rights." 
          : error.message || "Failed to send message",
        variant: "destructive",
      });
    }
  };

  const startNewConversation = async (recipientId: string, recipientName: string, propertyId?: string, propertyTitle?: string) => {
    if (!user) return;
    
    try {
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
      
      if (existingConversationId) {
        setSelectedConversation(existingConversationId);
        setActiveTab("messages");
      } else {
        // Create new conversation
        createNewConversation(recipientId, recipientName, propertyId, propertyTitle);
      }
    } catch (error: any) {
      console.error("Error checking for existing conversation:", error);
      
      if (error.code === "permission-denied") {
        toast({
          title: "Permission Error",
          description: "You don't have permission to check conversations. Creating a new one instead.",
          variant: "destructive",
        });
      }
      
      // If we hit a permission error, create a new conversation anyway
      createNewConversation(recipientId, recipientName, propertyId, propertyTitle);
    }
  };

  const createNewConversation = async (recipientId: string, recipientName: string, propertyId?: string, propertyTitle?: string) => {
    if (!user) return;
    
    try {
      const conversationsRef = collection(db, "conversations");
      const participantNames: Record<string, string> = {
        [user.uid]: user.displayName || user.email || "You",
        [recipientId]: recipientName || "User",
      };
      
      const newConversation = {
        participants: [user.uid, recipientId],
        participantNames,
        lastMessage: "New conversation started",
        lastMessageTime: serverTimestamp(),
        createdAt: serverTimestamp(),
        propertyId,
        propertyTitle,
        unreadBy: {
          [user.uid]: 0,
          [recipientId]: 0,
        },
      };
      
      try {
        const docRef = await addDoc(conversationsRef, newConversation);
        setSelectedConversation(docRef.id);
        setActiveTab("messages");
        
        toast({
          title: "Conversation Created",
          description: "You can now send messages to this contact.",
        });
      } catch (innerError: any) {
        console.error("Error creating conversation document:", innerError);
        
        if (innerError.code === "permission-denied") {
          toast({
            title: "Permission Error",
            description: "You don't have permission to create conversations. This requires Firebase rules to allow creating conversations.",
            variant: "destructive",
          });
        } else if (innerError.code === "failed-precondition") {
          toast({
            title: "Index Error",
            description: "The Firebase database requires an index for this operation. Please contact the administrator.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: innerError.message || "Failed to create conversation",
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      console.error("Error creating conversation:", error);
      toast({
        title: "Error",
        description: error.code === "permission-denied" 
          ? "Missing permissions to access or create conversations."
          : error.message || "Failed to create conversation",
        variant: "destructive",
      });
    }
  };

  const getOtherParticipantId = (convo: Conversation) => {
    if (!user || !convo || !convo.participants) return "";
    return convo.participants.find(id => id !== user.uid) || "";
  };

  const getOtherParticipantName = (convo: Conversation) => {
    if (!convo || !convo.participants || !convo.participantNames) {
      return "User";
    }
    const otherId = getOtherParticipantId(convo);
    return convo.participantNames[otherId] || "User";
  };

  const formatTime = (timestamp: Timestamp) => {
    if (!timestamp) return "";
    
    try {
      const date = timestamp.toDate();
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (e) {
      return "recently";
    }
  };
  
  const handleDeleteConversation = async (conversationId: string) => {
    if (!user) return;
    
    try {
      // First, get all messages for this conversation to delete them
      const messagesRef = collection(db, "messages");
      const q = query(
        messagesRef,
        where("conversationId", "==", conversationId)
      );
      
      const messagesSnapshot = await getDocs(q);
      
      // Create a batch to delete all messages
      const batch = await Promise.all(messagesSnapshot.docs.map(async (messageDoc) => {
        try {
          await deleteDoc(doc(db, "messages", messageDoc.id));
        } catch (error: any) {
          console.error(`Error deleting message ${messageDoc.id}:`, error);
          // Continue with other deletions even if one fails
        }
      }));
      
      // Now delete the conversation document
      await deleteDoc(doc(db, "conversations", conversationId));
      
      // If this was the selected conversation, clear it
      if (selectedConversation === conversationId) {
        setSelectedConversation(null);
        setMessages([]);
        setActiveTab("conversations");
      }
      
      toast({
        title: "Conversation Deleted",
        description: "The conversation and all its messages have been removed.",
      });
      
      // Clear the delete dialog
      setConversationToDelete(null);
    } catch (error: any) {
      console.error("Error deleting conversation:", error);
      toast({
        title: "Delete Error",
        description: error.code === "permission-denied" 
          ? "You don't have permission to delete this conversation. Please check Firebase security rules."
          : error.message || "Failed to delete conversation",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <div className="container py-10 text-center">
        <h1 className="text-2xl font-bold mb-4">Please Sign In</h1>
        <p>You need to be logged in to access messages.</p>
      </div>
    );
  }

  // If there's an index creation URL, show the helper
  if (indexUrl) {
    // Extract the exact URL from the error message if present
    let directUrl = null;
    const match = /https?:\/\/console\.firebase\.google\.com\/[^\s"']+/g.exec(indexUrl);
    if (match && match[0]) {
      directUrl = match[0];
      console.log("Direct Firebase index creation URL:", directUrl);
    }
    
    return <IndexCreationHelper 
      url={directUrl || indexUrl} 
      onDismiss={() => setIndexUrl(null)} 
    />;
  }

  return (
    <div className="container py-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Messages</CardTitle>
          <CardDescription>
            Communicate with property owners and tenants
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-4"
          >
            <TabsList className="grid w-full md:w-auto grid-cols-2">
              <TabsTrigger value="conversations">Conversations</TabsTrigger>
              <TabsTrigger value="messages" disabled={!selectedConversation}>
                {selectedConversation ? "Messages" : "Select a Conversation"}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="conversations" className="space-y-4">
              {loading ? (
                <div className="text-center py-10">
                  <p>Loading conversations...</p>
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-10">
                  <p>You don't have any conversations yet.</p>
                  <p className="text-muted-foreground mt-2">
                    Start a conversation by clicking "Contact Seller" on a property listing.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className={`flex items-center p-3 rounded-lg cursor-pointer hover:bg-muted ${
                        selectedConversation === conversation.id
                          ? "bg-muted"
                          : ""
                      }`}
                      onClick={() => {
                        setSelectedConversation(conversation.id);
                        setActiveTab("messages");
                      }}
                    >
                      <Avatar className="h-10 w-10 mr-3">
                        <AvatarImage
                          src=""
                          alt={getOtherParticipantName(conversation)}
                        />
                        <AvatarFallback>
                          <UserIcon className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <p className="font-semibold truncate">
                            {getOtherParticipantName(conversation)}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>
                              {conversation.lastMessageTime
                                ? formatTime(conversation.lastMessageTime)
                                : ""}
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-muted-foreground truncate">
                            {conversation.lastMessage}
                          </p>
                          {conversation.unreadCount > 0 && (
                            <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                              {conversation.unreadCount}
                            </span>
                          )}
                        </div>
                        {conversation.propertyTitle && (
                          <div className="flex items-center text-xs mt-1 text-muted-foreground">
                            <Home className="h-3 w-3 mr-1" />
                            <span className="truncate">
                              {conversation.propertyTitle}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex ml-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setConversationToDelete(conversation.id);
                          }}
                          className="h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                        <ChevronRight className="ml-1 h-5 w-5 flex-shrink-0 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="messages" className="space-y-4">
              {selectedConversation ? (
                <>
                  <div className="bg-muted p-3 rounded-lg">
                    <div className="flex items-center">
                      <Avatar className="h-8 w-8 mr-2">
                        <AvatarImage
                          src=""
                          alt={getOtherParticipantName(
                            conversations.find(
                              (c) => c.id === selectedConversation
                            ) as Conversation
                          )}
                        />
                        <AvatarFallback>
                          <UserIcon className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <p className="font-semibold">
                        {getOtherParticipantName(
                          conversations.find(
                            (c) => c.id === selectedConversation
                          ) as Conversation
                        )}
                      </p>
                      {conversations.find((c) => c.id === selectedConversation)
                        ?.propertyTitle && (
                        <div className="flex items-center text-xs ml-3 text-muted-foreground">
                          <Home className="h-3 w-3 mr-1" />
                          <span>
                            {
                              conversations.find(
                                (c) => c.id === selectedConversation
                              )?.propertyTitle
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col h-[400px] border rounded-lg">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {messages.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                          <p>No messages yet. Start the conversation!</p>
                        </div>
                      ) : (
                        messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${
                              message.senderId === user.uid
                                ? "justify-end"
                                : "justify-start"
                            }`}
                          >
                            <div
                              className={`max-w-[80%] px-4 py-2 rounded-lg ${
                                message.senderId === user.uid
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              }`}
                            >
                              <p>{message.text}</p>
                              <div
                                className={`text-xs mt-1 ${
                                  message.senderId === user.uid
                                    ? "text-primary-foreground opacity-80"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {message.timestamp
                                  ? formatTime(message.timestamp)
                                  : "sending..."}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    <div className="border-t p-3 flex">
                      <Input
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 mr-2"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                      />
                      <Button
                        onClick={handleSendMessage}
                        size="icon"
                        disabled={!messageText.trim()}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-10">
                  <p>Select a conversation to view messages</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Delete Conversation Confirmation Dialog */}
      <AlertDialog open={!!conversationToDelete} onOpenChange={(open) => !open && setConversationToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this conversation? This action cannot be undone and all messages will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => conversationToDelete && handleDeleteConversation(conversationToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}