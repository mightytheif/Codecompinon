import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

/**
 * Helper function to check if an error is related to missing Firebase indexes
 */
export function showIndexHelperIfNeeded(error: any): boolean {
  if (!error) return false;
  
  return (
    (error.code === 'failed-precondition' && 
     error.message?.includes('require an index')) ||
    (error.message && error.message.includes('index')) ||
    (error.message && error.message.toLowerCase().includes('composite'))
  );
}

interface IndexCreationHelperProps {
  indexUrl?: string;
  url?: string; // For compatibility with existing code
  onDismiss?: () => void;
}

const IndexCreationHelper: React.FC<IndexCreationHelperProps> = ({ 
  indexUrl = "https://console.firebase.google.com/project/sakany10/firestore/indexes",
  url,
  onDismiss
}) => {
  // Use the url prop if provided, fall back to indexUrl
  const finalUrl = url || indexUrl;
  const handleCreateIndex = () => {
    // Open the Firebase console in a new tab
    window.open(finalUrl, '_blank');
    
    toast({
      title: "Firebase Console Opened",
      description: "Please create the required index in the Firebase console that just opened."
    });
    
    // If a dismiss callback was provided, call it
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <div className="container py-6">
      <Card className="w-full mx-auto max-w-3xl">
        <CardHeader className="bg-destructive text-white">
          <CardTitle className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-alert-circle"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
            Firebase Index Required
          </CardTitle>
          <CardDescription className="text-white">
            The query to load conversations requires a special index in Firebase
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-md mb-6">
            <p className="text-amber-800 font-medium mb-2">Why am I seeing this error?</p>
            <p className="text-amber-700 text-sm">
              Firebase Firestore requires special indexes for complex queries like filtering by array membership and sorting.
              Your app is trying to load conversations where your user ID is in the participants array and sort by message time.
            </p>
          </div>
          
          <p className="mb-4 font-medium">To fix this issue, you need to create a composite index in Firebase:</p>
          <ol className="list-decimal pl-5 space-y-2 mb-6">
            <li>Click the "Open Firebase Console" button below</li>
            <li>Click "Add Index" in the Firebase console</li>
            <li>For "Collection ID", enter: <code className="bg-muted p-1 rounded">conversations</code></li>
            <li>Add these fields:
              <ul className="list-disc pl-5 mt-1">
                <li>Field: <code className="bg-muted p-1 rounded">participants</code>, Index type: <code className="bg-muted p-1 rounded">Array contains</code></li>
                <li>Field: <code className="bg-muted p-1 rounded">lastMessageTime</code>, Order: <code className="bg-muted p-1 rounded">Descending</code></li>
              </ul>
            </li>
            <li>Click "Create Index"</li>
            <li>Wait for the index to finish building (this may take a few minutes)</li>
            <li>Come back and refresh this page</li>
          </ol>
          
          <div className="bg-gray-100 border border-gray-200 p-4 rounded-md mb-4">
            <p className="text-gray-700 text-sm italic">
              <strong>Note:</strong> You only need to create this index once. After the index is created, this error will no longer appear.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-2">
          <Button onClick={handleCreateIndex} className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700">
            Open Firebase Console
          </Button>
          {onDismiss && (
            <Button variant="outline" onClick={onDismiss} className="w-full sm:w-auto">
              Dismiss
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default IndexCreationHelper;