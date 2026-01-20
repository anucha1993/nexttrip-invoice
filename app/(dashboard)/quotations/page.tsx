'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { 
  Plus, Search, FileText, Pencil, Trash2, Eye, 
  ChevronLeft, ChevronRight, Calendar, Users, 
  Clock, CheckCircle, XCircle, AlertCircle, Banknote, LayoutDashboard
} from 'lucide-react';
import Link from 'next/link';

interface Quotation {
  id: string;
  quotationNumber: string;
  tourName: string;
  bookingCode: string | null;
  ntCode: string | null;
  customTourCode: string | null;
  departureDate: string | null;
  returnDate: string | null;
  numDays: string | null;
  numDaysName: string | null;
  paxCount: number;
  grandTotal: number;
  status: 'NEW' | 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  paymentStatus: 'UNPAID' | 'DEPOSIT' | 'PARTIAL' | 'PAID' | 'REFUNDED';
  quotationDate: string;
  createdAt: string;
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  saleId: number | null;
  wholesaleId: number | null;
  countryId: number | null;
  airlineId: number | null;
}

const statusOptions = [
  { value: '', label: 'ทุกสถานะ' },
  { value: 'NEW', label: 'ใหม่' },
  { value: 'PENDING', label: 'รอดำเนินการ' },
  { value: 'CONFIRMED', label: 'ยืนยันแล้ว' },
  { value: 'CANCELLED', label: 'ยกเลิก' },
  { value: 'COMPLETED', label: 'เสร็จสิ้น' },
];

const statusLabels: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  NEW: { label: 'ใหม่', color: 'bg-violet-700 text-white', icon: FileText },
  PENDING: { label: 'รอดำเนินการ', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  CONFIRMED: { label: 'ยืนยันแล้ว', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  CANCELLED: { label: 'ยกเลิก', color: 'bg-red-100 text-red-700', icon: XCircle },
  COMPLETED: { label: 'เสร็จสิ้น', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
};

const paymentStatusLabels: Record<string, { label: string; color: string }> = {
  UNPAID: { label: 'ยังไม่ชำระ', color: 'bg-gray-100 text-gray-700' },
  DEPOSIT: { label: 'ชำระมัดจำแล้ว', color: 'bg-yellow-100 text-yellow-700' },
  PARTIAL: { label: 'ชำระบางส่วน', color: 'bg-orange-100 text-orange-700' },
  PAID: { label: 'ชำระครบแล้ว', color: 'bg-green-100 text-green-700' },
  REFUNDED: { label: 'คืนเงินแล้ว', color: 'bg-red-100 text-red-700' },
};

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const limit = 15; 

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when status filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  useEffect(() => {
    fetchQuotations();
  }, [debouncedSearch, statusFilter, currentPage]);

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (statusFilter) params.append('status', statusFilter);
      params.append('page', currentPage.toString());
      params.append('limit', limit.toString());

      const url = `/api/quotations?${params}`;
      const fullUrl = `${window.location.origin}${url}`;
      console.log('Fetching quotations from:', url);
      console.log('Full URL:', fullUrl);
      console.log('Window location:', window.location.href);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
      });
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const result = await response.json();
        console.log('Data received:', result);
        setQuotations(result.data);
        setTotalPages(result.pagination.totalPages);
        setTotalItems(result.pagination.total);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('API error:', response.status, errorData);
      }
    } catch (error) {
      console.error('Error fetching quotations:', error);
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/quotations/${deleteId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchQuotations();
        setDeleteId(null);
      }
    } catch (error) {
      console.error('Error deleting quotation:', error);
    } finally {
      setDeleting(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateRange = (start: string | null, end: string | null) => {
    if (!start || !end) return '-';
    const startDate = new Date(start).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
    const endDate = new Date(end).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${startDate} - ${endDate}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ใบเสนอราคา</h1>
          <p className="text-gray-600">จัดการใบเสนอราคาทั้งหมด</p>
        </div>
        <Link href="/quotations/create">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            สร้างใบเสนอราคา
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">ทั้งหมด</p>
                <p className="text-2xl font-bold">{totalItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">รอดำเนินการ</p>
                <p className="text-2xl font-bold">
                  {quotations.filter(q => q.status === 'PENDING').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">ยืนยันแล้ว</p>
                <p className="text-2xl font-bold">
                  {quotations.filter(q => q.status === 'CONFIRMED').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 rounded-lg">
                <Banknote className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">ชำระครบแล้ว</p>
                <p className="text-2xl font-bold">
                  {quotations.filter(q => q.paymentStatus === 'PAID').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
              <Input
                placeholder="ค้นหาเลขที่, ชื่อทัวร์, ชื่อลูกค้า, เบอร์โทร..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="w-full md:w-48 flex-shrink-0">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">กำลังโหลด...</div>
            </div>
          ) : quotations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <FileText className="w-12 h-12 mb-4 text-gray-300" />
              <p>ไม่พบใบเสนอราคา</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-left">เลขที่</TableHead>
                    <TableHead className="text-left">ลูกค้า</TableHead>
                    <TableHead className="text-left">แพ็คเกจทัวร์</TableHead>
                    <TableHead className="text-center">วันเดินทาง</TableHead>
                    <TableHead className="text-center">PAX</TableHead>
                    <TableHead className="text-right">ยอดรวม</TableHead>
                    <TableHead className="text-center">สถานะ</TableHead>
                    <TableHead className="text-center">การชำระ</TableHead>
                    <TableHead className="text-right w-32">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotations.map((quotation) => {
                    const statusInfo = statusLabels[quotation.status];
                    const StatusIcon = statusInfo?.icon || FileText;
                    const paymentInfo = paymentStatusLabels[quotation.paymentStatus];
                    return (
                      <TableRow key={quotation.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium text-blue-600">{quotation.quotationNumber}</div>
                            <div className="text-xs text-gray-500">{formatDate(quotation.quotationDate)}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{quotation.customerName}</div>
                            {quotation.customerPhone && (
                              <div className="text-xs text-gray-500">{quotation.customerPhone}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div 
                              className="font-medium truncate max-w-xs cursor-help" 
                              title={quotation.tourName}
                            >
                              {quotation.tourName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {quotation.bookingCode && <span>BK: {quotation.bookingCode}</span>}
                              {quotation.ntCode && <span> • NT: {quotation.ntCode}</span>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="text-sm">
                            {formatDateRange(quotation.departureDate, quotation.returnDate)}
                          </div>
                          {quotation.numDaysName && (
                            <div className="text-xs text-gray-500">{quotation.numDaysName}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded">
                            <Users className="w-3 h-3" />
                            <span className="font-medium">{quotation.paxCount}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-medium text-lg">{formatPrice(quotation.grandTotal)}</div>
                          <div className="text-xs text-gray-500">บาท</div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo?.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusInfo?.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${paymentInfo?.color}`}>
                            {paymentInfo?.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/quotations/${quotation.id}/dashboard`} className="inline-flex">
                              <Button variant="ghost" size="icon" title="Dashboard">
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </Link>
                            <Link href={`/quotations/${quotation.id}`} className="inline-flex">
                              <Button variant="ghost" size="icon" title="ดูรายละเอียด">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </Link>
                            
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setDeleteId(quotation.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="ลบ"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {!loading && quotations.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="text-sm text-gray-500">
                แสดง {(currentPage - 1) * limit + 1} - {Math.min(currentPage * limit, totalItems)} จาก {totalItems} รายการ
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm">
                  หน้า {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setDeleteId(null)} />
          <div className="relative bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">ยืนยันการลบ</h3>
            <p className="text-gray-600 mb-4">
              คุณต้องการลบใบเสนอราคานี้หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>
                ยกเลิก
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'กำลังลบ...' : 'ลบ'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
