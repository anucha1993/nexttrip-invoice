'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Filter, Download, Eye, Edit, Trash2, MoreVertical, FileText, Clock, AlertCircle, CheckCircle, DollarSign, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Select } from '@/components/ui/select';

interface InvoiceData {
  id: number;
  invoiceNumber: string;
  quotationId: number;
  quotationNumber: string;
  customerName: string;
  tourName?: string;
  grandTotal: number;
  subtotal: number;
  vatAmount: number;
  invoiceDate: string;
  dueDate: string;
  status: string;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amountFrom, setAmountFrom] = useState('');
  const [amountTo, setAmountTo] = useState('');

  // Fetch invoices from API
  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.set('page', pagination.page.toString());
        params.set('limit', pagination.limit.toString());
        if (statusFilter !== 'all') {
          params.set('status', statusFilter);
        }
        
        const response = await fetch(`/api/invoices?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setInvoices(data.invoices || []);
          setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
        }
      } catch (error) {
        console.error('Error fetching invoices:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [pagination.page, pagination.limit, statusFilter]);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'warning' | 'success' | 'danger', label: string }> = {
      DRAFT: { variant: 'default', label: 'ฉบับร่าง' },
      ISSUED: { variant: 'warning', label: 'ออกแล้ว' },
      PAID: { variant: 'success', label: 'ชำระแล้ว' },
      PARTIAL_PAID: { variant: 'warning', label: 'ชำระบางส่วน' },
      CANCELLED: { variant: 'default', label: 'ยกเลิก' },
      VOIDED: { variant: 'default', label: 'ยกเลิก' },
    };
    return statusConfig[status] || { variant: 'default' as const, label: status };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('th-TH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleDelete = async (invoiceId: number, invoiceNumber: string) => {
    if (!confirm(`⚠️ คำเตือน: การลบนี้จะลบข้อมูลออกจากฐานข้อมูลถาวร!\n\nต้องการลบใบแจ้งหนี้ ${invoiceNumber} ใช่หรือไม่?`)) {
      return;
    }

    setDeleting(invoiceId);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}?hardDelete=true`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refresh the list
        setInvoices(invoices.filter(inv => inv.id !== invoiceId));
        setOpenMenu(null);
        alert('ลบใบแจ้งหนี้สำเร็จ');
      } else {
        const error = await response.json();
        alert(error.error || 'เกิดข้อผิดพลาดในการลบใบแจ้งหนี้');
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert('เกิดข้อผิดพลาดในการลบใบแจ้งหนี้');
    } finally {
      setDeleting(null);
    }
  };

  // Filter by search query (client-side)
  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.quotationNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Date filter
    let matchesDate = true;
    if (dateFrom) {
      const invoiceDate = new Date(invoice.invoiceDate);
      const fromDate = new Date(dateFrom);
      matchesDate = invoiceDate >= fromDate;
    }
    if (dateTo && matchesDate) {
      const invoiceDate = new Date(invoice.invoiceDate);
      const toDate = new Date(dateTo);
      matchesDate = invoiceDate <= toDate;
    }
    
    // Amount filter
    let matchesAmount = true;
    if (amountFrom) {
      matchesAmount = (invoice.grandTotal || 0) >= parseFloat(amountFrom);
    }
    if (amountTo && matchesAmount) {
      matchesAmount = (invoice.grandTotal || 0) <= parseFloat(amountTo);
    }
    
    return matchesSearch && matchesDate && matchesAmount;
  });

  // Calculate summary stats from current data
  const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
  const paidAmount = invoices.filter(inv => inv.status === 'PAID').reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
  const pendingAmount = invoices.filter(inv => inv.status === 'DRAFT' || inv.status === 'ISSUED' || inv.status === 'PARTIAL_PAID').reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
  const cancelledAmount = invoices.filter(inv => inv.status === 'CANCELLED' || inv.status === 'VOIDED').reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);

  const summaryCards = [
    {
      title: 'รายได้รวมทั้งหมด',
      value: `${formatCurrency(totalRevenue)} ฿`,
      icon: DollarSign,
      color: 'from-blue-500 to-blue-600',
      bgLight: 'bg-blue-50',
      textColor: 'text-blue-600',
      count: invoices.length,
      countLabel: 'ใบแจ้งหนี้',
    },
    {
      title: 'ชำระแล้ว',
      value: `${formatCurrency(paidAmount)} ฿`,
      icon: CheckCircle,
      color: 'from-green-500 to-green-600',
      bgLight: 'bg-green-50',
      textColor: 'text-green-600',
      count: invoices.filter(inv => inv.status === 'PAID').length,
      countLabel: 'รายการ',
    },
    {
      title: 'รอชำระ',
      value: `${formatCurrency(pendingAmount)} ฿`,
      icon: Clock,
      color: 'from-amber-500 to-amber-600',
      bgLight: 'bg-amber-50',
      textColor: 'text-amber-600',
      count: invoices.filter(inv => inv.status === 'DRAFT' || inv.status === 'ISSUED' || inv.status === 'PARTIAL_PAID').length,
      countLabel: 'รายการ',
    },
    {
      title: 'ยกเลิก',
      value: `${formatCurrency(cancelledAmount)} ฿`,
      icon: AlertCircle,
      color: 'from-red-500 to-red-600',
      bgLight: 'bg-red-50',
      textColor: 'text-red-600',
      count: invoices.filter(inv => inv.status === 'CANCELLED' || inv.status === 'VOIDED').length,
      countLabel: 'รายการ',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg shadow-blue-500/25">
              <FileText className="w-6 h-6 text-white" />
            </div>
            ใบแจ้งหนี้
          </h1>
          <p className="text-gray-500 mt-2 ml-12">จัดการใบแจ้งหนี้และติดตามการชำระเงิน</p>
        </div>
        <Button 
          onClick={() => router.push('/invoices/create')}
          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/25"
        >
          <Plus className="w-4 h-4 mr-2" />
          สร้างใบแจ้งหนี้
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card key={index} className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${card.color} opacity-10 rounded-full -mr-16 -mt-16`} />
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">{card.title}</p>
                    <p className={`text-2xl font-bold mt-2 ${card.textColor}`}>{card.value}</p>
                    <p className="text-xs text-gray-400 mt-1">{card.count} {card.countLabel}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${card.bgLight}`}>
                    <Icon className={`w-6 h-6 ${card.textColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card className="p-4 border-0 shadow-lg">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="ค้นหา..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'สถานะทั้งหมด' },
                { value: 'DRAFT', label: 'ฉบับร่าง' },
                { value: 'ISSUED', label: 'ออกแล้ว' },
                { value: 'PAID', label: 'ชำระแล้ว' },
                { value: 'PARTIAL_PAID', label: 'ชำระบางส่วน' },
                { value: 'CANCELLED', label: 'ยกเลิก' },
              ]}
              className="w-44"
            />
            <Button 
              variant="outline" 
              className={`border-gray-200 hover:bg-gray-50 px-3 ${showAdvancedFilters ? 'bg-blue-50 border-blue-300 text-blue-600' : ''}`} 
              title="ตัวกรองเพิ่มเติม"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              <Filter className="w-4 h-4" />
            </Button>
            <Button variant="outline" className="border-gray-200 hover:bg-gray-50 px-3" title="ส่งออก">
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">วันที่เริ่มต้น</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="border-gray-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">วันที่สิ้นสุด</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="border-gray-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ยอดเงินขั้นต่ำ</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amountFrom}
                  onChange={(e) => setAmountFrom(e.target.value)}
                  className="border-gray-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ยอดเงินสูงสุด</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amountTo}
                  onChange={(e) => setAmountTo(e.target.value)}
                  className="border-gray-200"
                />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                  setAmountFrom('');
                  setAmountTo('');
                }}
                className="text-gray-600"
              >
                ล้างตัวกรอง
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Invoice Table */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <span className="ml-2 text-gray-500">กำลังโหลดข้อมูล...</span>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">ไม่พบข้อมูลใบแจ้งหนี้</p>
              <p className="text-sm mt-1">ยังไม่มีใบแจ้งหนี้ในระบบ</p>
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <TableHead className="font-semibold text-gray-700">เลขที่ใบแจ้งหนี้</TableHead>
                <TableHead className="font-semibold text-gray-700">ใบเสนอราคา</TableHead>
                <TableHead className="font-semibold text-gray-700">ลูกค้า</TableHead>
                <TableHead className="font-semibold text-gray-700 text-right">ยอดรวม</TableHead>
                <TableHead className="font-semibold text-gray-700">วันที่ออก</TableHead>
                <TableHead className="font-semibold text-gray-700">กำหนดชำระ</TableHead>
                <TableHead className="font-semibold text-gray-700 text-center">สถานะ</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice, index) => {
                const status = getStatusBadge(invoice.status);
                return (
                  <TableRow 
                    key={invoice.id} 
                    className={`hover:bg-blue-50/50 transition-colors cursor-pointer ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <FileText className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="font-semibold text-blue-600 hover:text-blue-700">{invoice.invoiceNumber}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="text-gray-600 block">{invoice.quotationNumber || '-'}</span>
                        {invoice.tourName && (
                          <span className="text-xs text-gray-500">{invoice.tourName}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-gray-900">{invoice.customerName || '-'}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-bold text-gray-900">{formatCurrency(invoice.grandTotal)} ฿</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-gray-600">{formatDate(invoice.invoiceDate)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-gray-600">{formatDate(invoice.dueDate)}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={status.variant} className="shadow-sm">{status.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenu(openMenu === invoice.id ? null : invoice.id)}
                          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {openMenu === invoice.id && (
                          <div className="absolute right-0 mt-1 w-40 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-10">
                            <button 
                              onClick={() => router.push(`/invoices/${invoice.id}`)}
                              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                              ดูรายละเอียด
                            </button>
                            <button 
                              onClick={() => router.push(`/invoices/${invoice.id}/edit`)}
                              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                              แก้ไข
                            </button>
                            <div className="border-t border-gray-100 my-1"></div>
                            <button 
                              onClick={() => handleDelete(invoice.id, invoice.invoiceNumber)}
                              disabled={deleting === invoice.id}
                              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Trash2 className="w-4 h-4" />
                              {deleting === invoice.id ? 'กำลังลบ...' : 'ลบ'}
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
          )}
        </div>

        {/* Pagination */}
        {!loading && filteredInvoices.length > 0 && (
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            แสดง <span className="font-semibold text-gray-900">{filteredInvoices.length}</span> จาก <span className="font-semibold text-gray-900">{pagination.total}</span> รายการ
          </p>
          <div className="flex gap-1">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={pagination.page <= 1}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              className="border-gray-200"
            >
              ก่อนหน้า
            </Button>
            {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => i + 1).map((pageNum) => (
              <Button 
                key={pageNum}
                variant="outline" 
                size="sm" 
                onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                className={pagination.page === pageNum 
                  ? "bg-blue-500 text-white border-blue-500 hover:bg-blue-600" 
                  : "border-gray-200 hover:bg-gray-100"
                }
              >
                {pageNum}
              </Button>
            ))}
            <Button 
              variant="outline" 
              size="sm" 
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              className="border-gray-200"
            >
              ถัดไป
            </Button>
          </div>
        </div>
        )}
      </Card>
    </div>
  );
}
