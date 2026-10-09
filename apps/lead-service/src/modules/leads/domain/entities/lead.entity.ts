export interface Lead {
  id: string;
  userId?: string;
  customerName: string;
  phone: string;
  email?: string;
  message: string;
  source: 'INTERNAL' | 'EXTERNAL';
  label: 'UNLABELED' | 'POTENTIAL' | 'SPAM';
  hasView: boolean;
  createdAt: Date;
  updatedAt: Date;
}
