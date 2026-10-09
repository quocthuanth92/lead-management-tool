export interface LeadActivity {
  id: string;
  leadId: string;
  userId: string;
  authorName: string;
  type: 'CALL' | 'EMAIL' | 'SMS' | 'NOTE' | 'OTHER';
  content: string;
  createdAt: Date;
}
