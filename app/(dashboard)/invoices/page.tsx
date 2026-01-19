'use client';

import { useState } from 'react';
import { Plus, Search, Filter, Download, Eye, Edit, Trash2, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Select } from '@/components/ui/select';
import { Invoice } from '@/types';

// Mock Data
const mockInvoices: Invoice[] = [
  {
    id: '1',
    invoiceNumber: 'INV-2026-001',
    customerName: 'สมชาย ใจดี',
    customerEmail: 'somchai@email.com',
    customerPhone: '081-234-5678',
    tourName: 'เชียงใหม่ 3 วัน 2 คืน',
    tourDate: '2026-02-15',
    amount: 15000,
    tax: 1050,
    total: 16050,
    status: 'paid',
    dueDate: '2026-01-20',
    createdAt: '2026-01-10',
    updatedAt: '2026-01-10',
  },
  {
    id: '2',
    invoiceNumber: 'INV-2026-002',
    customerName: 'สมหญิง รักเที่ยว',
    customerEmail: 'somying@email.com',
    customerPhone: '082-345-6789',
    tourName: 'ภูเก็ต 4 วัน 3 คืน',
    tourDate: '2026-03-01',
    amount: 25000,
    tax: 1750,
    total: 26750,
    status: 'pending',
    dueDate: '2026-01-25',
    createdAt: '2026-01-12',
    updatedAt: '2026-01-12',
  },
  {
    id: '3',
    invoiceNumber: 'INV-2026-003',
    customerName: 'วิชัย เดินทาง',
    customerEmail: 'wichai@email.com',
    customerPhone: '083-456-7890',
    tourName: 'กระบี่ 3 วัน 2 คืน',
    tourDate: '2026-02-20',
    amount: 18000,
    tax: 1260,
    total: 19260,
    status: 'overdue',
    dueDate: '2026-01-10',
    createdAt: '2026-01-05',
    updatedAt: '2026-01-05',
  },
  {
    id: '4',
    invoiceNumber: 'INV-2026-004',
    customerName: 'มาลี สวัสดี',
    customerEmail: 'malee@email.com',
    customerPhone: '084-567-8901',
    tourName: 'เกาะสมุย 5 วัน 4 คืน',
    tourDate: '2026-04-10',
    amount: 35000,
    tax: 2450,
    total: 37450,
    status: 'draft',
    dueDate: '2026-02-01',
    createdAt: '2026-01-15',
    updatedAt: '2026-01-15',
  },
  {
    id: '5',
    invoiceNumber: 'INV-2026-005',
    customerName: 'ประเสริฐ มั่งมี',
    customerEmail: 'prasert@email.com',
    customerPhone: '085-678-9012',
    tourName: 'พัทยา 2 วัน 1 คืน',
    tourDate: '2026-01-28',
    amount: 8000,
    tax: 560,
    total: 8560,
    status: 'paid',
    dueDate: '2026-01-18',
    createdAt: '2026-01-08',
    updatedAt: '2026-01-08',
  },
  {
    id: '6',
    invoiceNumber: 'INV-2026-006',
    customerName: 'นิภา ท่องเที่ยว',
    customerEmail: 'nipa@email.com',
    customerPhone: '086-789-0123',
    tourName: 'เชียงราย 3 วัน 2 คืน',
    tourDate: '2026-03-15',
    amount: 12000,
    tax: 840,
    total: 12840,
    status: 'pending',
    dueDate: '2026-02-10',
    createdAt: '2026-01-16',
    updatedAt: '2026-01-16',
  },
];

export default function InvoicesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const getStatusBadge = (status: Invoice['status']) => {
    const statusConfig = {
      draft: { variant: 'default' as const, label: 'ร่าง' },
      pending: { variant: 'warning' as const, label: 'รอชำระ' },
      paid: { variant: 'success' as const, label: 'ชำระแล้ว' },
      overdue: { variant: 'danger' as const, label: 'เกินกำหนด' },
      cancelled: { variant: 'default' as const, label: 'ยกเลิก' },
    };
    return statusConfig[status];
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
    }).format(amount);
  };

  const filteredInvoices = mockInvoices.filter((invoice) => {
    const matchesSearch =
      invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ใบแจ้งหนี้</h1>
          <p className="text-gray-500 mt-1">จัดการใบแจ้งหนี้ทั้งหมด</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          สร้างใบแจ้งหนี้
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="ค้นหาเลขที่ใบแจ้งหนี้ หรือชื่อลูกค้า..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'สถานะทั้งหมด' },
                { value: 'draft', label: 'ร่าง' },
                { value: 'pending', label: 'รอชำระ' },
                { value: 'paid', label: 'ชำระแล้ว' },
                { value: 'overdue', label: 'เกินกำหนด' },
                { value: 'cancelled', label: 'ยกเลิก' },
              ]}
              className="w-40"
            />
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              ตัวกรองเพิ่มเติม
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              ส่งออก
            </Button>
          </div>
        </div>
      </Card>

      {/* Invoice Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>เลขที่ใบแจ้งหนี้</TableHead>
              <TableHead>ลูกค้า</TableHead>
              <TableHead>ทัวร์</TableHead>
              <TableHead>ยอดรวม</TableHead>
              <TableHead>กำหนดชำระ</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvoices.map((invoice) => {
              const status = getStatusBadge(invoice.status);
              return (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{invoice.customerName}</p>
                      <p className="text-sm text-gray-500">{invoice.customerEmail}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p>{invoice.tourName}</p>
                      <p className="text-sm text-gray-500">{invoice.tourDate}</p>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{formatCurrency(invoice.total)}</TableCell>
                  <TableCell>{invoice.dueDate}</TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="relative">
                      <button
                        onClick={() => setOpenMenu(openMenu === invoice.id ? null : invoice.id)}
                        className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {openMenu === invoice.id && (
                        <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                          <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                            <Eye className="w-4 h-4" />
                            ดูรายละเอียด
                          </button>
                          <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                            <Edit className="w-4 h-4" />
                            แก้ไข
                          </button>
                          <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                            ลบ
                          </button>
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            แสดง {filteredInvoices.length} จาก {mockInvoices.length} รายการ
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled>
              ก่อนหน้า
            </Button>
            <Button variant="outline" size="sm" className="bg-blue-50 text-blue-600 border-blue-200">
              1
            </Button>
            <Button variant="outline" size="sm">
              2
            </Button>
            <Button variant="outline" size="sm">
              3
            </Button>
            <Button variant="outline" size="sm">
              ถัดไป
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
