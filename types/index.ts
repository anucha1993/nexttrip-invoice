// Types for NextTrip Invoice System

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  tourName: string;
  tourDate: string;
  amount: number;
  tax: number;
  total: number;
  status: 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled';
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  totalInvoices: number;
  totalSpent: number;
  createdAt: string;
}

export interface Tour {
  id: string;
  name: string;
  destination: string;
  duration: string;
  price: number;
  description: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface DashboardStats {
  totalRevenue: number;
  totalInvoices: number;
  pendingInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
  totalCustomers: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff' | 'viewer';
  avatar?: string;
}
