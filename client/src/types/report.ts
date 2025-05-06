export interface PropertyReport {
  id?: string;
  propertyId: string;
  propertyTitle: string;
  reportedBy: string;
  reporterEmail: string;
  ownerEmail?: string;        // Email of the property owner for sending notifications
  ownerId?: string;           // ID of the property owner
  reason: string;
  details: string;
  status: 'pending' | 'resolved';
  createdAt: any;
  updatedAt: any;
  adminNotes?: string;
  reviewedBy?: string;
  notificationSent?: boolean; // Tracking if feedback was sent to owner
  notificationDate?: any;     // When the notification was sent
}