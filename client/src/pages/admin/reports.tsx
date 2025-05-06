import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { collection, query, getDocs, doc, updateDoc, serverTimestamp, orderBy, where, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { PropertyReport } from "@/types/report";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import axios from "axios";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, CheckCircle, XCircle, Loader2, AlertTriangle } from "lucide-react";

export default function ReportsPage() {
  const [, navigate] = useLocation();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<(PropertyReport & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<(PropertyReport & { id: string }) | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [reviewStatus, setReviewStatus] = useState("pending");
  const [sendNotification, setSendNotification] = useState(true);
  const [notificationSending, setNotificationSending] = useState(false);

  useEffect(() => {
    // Check if the user has admin privileges
    if (user && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "You don't have access to this page.",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    const fetchReports = async () => {
      setLoading(true);
      try {
        const reportsRef = collection(db, "reports");
        const q = query(reportsRef, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const reportsList: (PropertyReport & { id: string })[] = [];
        
        querySnapshot.forEach((doc) => {
          reportsList.push({ id: doc.id, ...doc.data() as PropertyReport });
        });
        
        setReports(reportsList);
      } catch (error: any) {
        console.error("Error fetching reports:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to load reports",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchReports();
    }
  }, [user, isAdmin, navigate, toast]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A";

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch (e) {
      return "Invalid date";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "resolved":
        return <Badge variant="outline" className="bg-green-100 text-green-800">Resolved</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleViewDetails = (report: PropertyReport & { id: string }) => {
    setSelectedReport(report);
    setAdminNotes(report.adminNotes || "");
    setReviewStatus(report.status);
    setDetailsOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedReport) return;
    
    setProcessing(selectedReport.id);
    try {
      const reportRef = doc(db, "reports", selectedReport.id);
      
      // Get property details to find the owner's email if not already in report
      let ownerEmail = selectedReport.ownerEmail;
      let ownerId = selectedReport.ownerId;
      
      if (!ownerEmail && selectedReport.propertyId) {
        try {
          const propertyRef = doc(db, "properties", selectedReport.propertyId);
          const propertySnap = await getDoc(propertyRef);
          
          if (propertySnap.exists()) {
            const propertyData = propertySnap.data();
            ownerId = propertyData.userId || propertyData.ownerId;
            
            if (ownerId) {
              const userRef = doc(db, "users", ownerId);
              const userSnap = await getDoc(userRef);
              
              if (userSnap.exists()) {
                ownerEmail = userSnap.data().email;
              }
            }
          }
        } catch (err) {
          console.error("Error fetching property owner details:", err);
        }
      }
      
      // Prepare update data
      const updateData: any = {
        status: reviewStatus as 'pending' | 'resolved',
        adminNotes: adminNotes,
        reviewedBy: user?.uid || null,
        updatedAt: serverTimestamp(),
      };
      
      // Add owner information if found
      if (ownerEmail && !selectedReport.ownerEmail) {
        updateData.ownerEmail = ownerEmail;
      }
      
      if (ownerId && !selectedReport.ownerId) {
        updateData.ownerId = ownerId;
      }
      
      // Update the report in Firestore
      await updateDoc(reportRef, updateData);
      
      // Send notification to property owner if requested and email is available
      if (sendNotification && (ownerEmail || selectedReport.ownerEmail)) {
        setNotificationSending(true);
        try {
          const notificationResponse = await axios.post('/api/reports/notify-owner', {
            reportId: selectedReport.id,
            propertyId: selectedReport.propertyId,
            ownerEmail: ownerEmail || selectedReport.ownerEmail,
            propertyTitle: selectedReport.propertyTitle,
            adminNotes: adminNotes,
            reportReason: selectedReport.reason,
            status: reviewStatus
          }, {
            headers: {
              'Authorization': `Bearer ${await user?.getIdToken()}`
            }
          });
          
          // Update notification status in the report
          await updateDoc(reportRef, {
            notificationSent: true,
            notificationDate: serverTimestamp()
          });
          
          toast({
            title: "Notification Sent",
            description: `Feedback has been sent to the property owner`,
          });
        } catch (notifyError: any) {
          console.error("Error sending notification:", notifyError);
          toast({
            title: "Notification Failed",
            description: notifyError.response?.data?.message || "Failed to send notification to property owner",
            variant: "destructive",
          });
        } finally {
          setNotificationSending(false);
        }
      }
      
      // Update the report in the local state
      setReports(reports.map(report => {
        if (report.id === selectedReport.id) {
          const updatedReport = {
            ...report,
            status: reviewStatus as 'pending' | 'resolved',
            adminNotes: adminNotes,
            reviewedBy: user?.uid || null,
            updatedAt: serverTimestamp(),
          };
          
          if (ownerEmail && !report.ownerEmail) {
            updatedReport.ownerEmail = ownerEmail;
          }
          
          if (ownerId && !report.ownerId) {
            updatedReport.ownerId = ownerId;
          }
          
          if (sendNotification && (ownerEmail || report.ownerEmail)) {
            updatedReport.notificationSent = true;
            updatedReport.notificationDate = serverTimestamp();
          }
          
          return updatedReport;
        }
        return report;
      }));
      
      toast({
        title: "Report Updated",
        description: `The report has been marked as ${reviewStatus}`,
      });
      
      setDetailsOpen(false);
    } catch (error: any) {
      console.error("Error updating report:", error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update report status",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  const filteredReports = (status: string) => {
    return reports.filter(report => {
      if (status === "all") return true;
      return report.status === status;
    });
  };

  if (loading) {
    return (
      <div className="container py-10 flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Property Reports</h1>
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="mb-6">
          <TabsTrigger value="pending">Pending ({filteredReports("pending").length})</TabsTrigger>
          <TabsTrigger value="resolved">Resolved ({filteredReports("resolved").length})</TabsTrigger>
          <TabsTrigger value="all">All Reports ({reports.length})</TabsTrigger>
        </TabsList>

        {["pending", "resolved", "all"].map((status) => (
          <TabsContent key={status} value={status}>
            <Card>
              <CardHeader>
                <CardTitle>
                  {status === "all" ? "All Reports" : `${status.charAt(0).toUpperCase() + status.slice(1)} Reports`}
                </CardTitle>
                <CardDescription>
                  {status === "pending" && "Reports that need your attention"}
                  {status === "resolved" && "Reports that have been resolved"}
                  {status === "all" && "All property reports in the system"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredReports(status).length === 0 ? (
                  <div className="text-center py-8">
                    <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                    <h3 className="text-lg font-medium">No reports found</h3>
                    <p className="text-muted-foreground">
                      There are no {status === "all" ? "" : status} reports at the moment
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Property</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Reported By</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReports(status).map((report) => (
                        <TableRow key={report.id}>
                          <TableCell className="font-medium">{report.propertyTitle}</TableCell>
                          <TableCell>{report.reason}</TableCell>
                          <TableCell>{report.reporterEmail}</TableCell>
                          <TableCell>{formatDate(report.createdAt)}</TableCell>
                          <TableCell>{getStatusBadge(report.status)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(report)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Report Details Dialog */}
      {selectedReport && (
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Report Details</DialogTitle>
              <DialogDescription>
                Review report details and update the status
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-sm">Property</h3>
                  <p>{selectedReport.propertyTitle}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm">Reported By</h3>
                  <p>{selectedReport.reporterEmail}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm">Report Date</h3>
                  <p>{formatDate(selectedReport.createdAt)}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm">Current Status</h3>
                  <p>{getStatusBadge(selectedReport.status)}</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-sm">Reason</h3>
                <p className="capitalize">{selectedReport.reason}</p>
              </div>
              
              <div>
                <h3 className="font-medium text-sm">Details</h3>
                <div className="bg-muted p-3 rounded-md mt-1">
                  <p className="whitespace-pre-line">{selectedReport.details}</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-sm">Update Status</h3>
                <Select value={reviewStatus} onValueChange={setReviewStatus}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <h3 className="font-medium text-sm">Admin Notes</h3>
                <Textarea
                  placeholder="Add your notes about this report"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="mt-1"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  These notes will be used as feedback for the property owner.
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="send-notification"
                  checked={sendNotification}
                  onCheckedChange={setSendNotification}
                  disabled={!selectedReport.ownerEmail}
                />
                <Label htmlFor="send-notification" className="cursor-pointer">
                  Send notification to property owner
                </Label>
              </div>
              
              {!selectedReport.ownerEmail && (
                <div className="rounded-md bg-yellow-50 p-3">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">Owner email not available</h3>
                      <div className="mt-1 text-sm text-yellow-700">
                        <p>No owner email is associated with this property, so a notification cannot be sent.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex flex-col sm:flex-row items-center gap-2">
              {notificationSending && (
                <div className="flex items-center text-amber-600 text-sm mr-auto">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending notification...
                </div>
              )}
              
              {selectedReport.notificationSent && (
                <div className="flex items-center text-green-600 text-sm mr-auto">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Notification previously sent on {formatDate(selectedReport.notificationDate)}
                </div>
              )}
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdateStatus}
                  disabled={processing === selectedReport.id || notificationSending}
                >
                  {processing === selectedReport.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Update Status
                    </>
                  )}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}