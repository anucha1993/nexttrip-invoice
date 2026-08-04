'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import {
  Search, FileText,
  ChevronLeft, ChevronRight, Calendar, Users, User,
  AlertCircle, ArrowRightLeft, Trash2,
} from 'lucide-react';

interface BookingQuotation {
  id: string;
  quotationNumber: string;
  tourName: string;
  bookingCode: string | null;
  ntCode: string | null;
  departureDate: string | null;
  returnDate: string | null;
  paxCount: number;
  grandTotal: number;
  quotationDate: string;
  customerName: string;
  customerPhone: string | null;
  saleName: string | null;
}

export default function QuotationsFromBookingPage() {
  const router = useRouter();
  const [quotations, setQuotations] = useState<BookingQuotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const limit = 15;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchQuotations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, currentPage]);

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      params.append('pendingBookingReview', '1');
      params.append('page', currentPage.toString());
      params.append('limit', limit.toString());

      const response = await fetch(`/api/quotations?${params}`, { credentials: 'same-origin' });
      if (response.ok) {
        const result = await response.json();
        setQuotations(result.data);
        setTotalPages(result.pagination.totalPages);
        setTotalItems(result.pagination.total);
      }
    } catch (error) {
      console.error('Error fetching booking quotations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConvert = async (id: string) => {
    setConvertingId(id);
    try {
      const response = await fetch(`/api/quotations/${id}/convert-from-booking`, {
        method: 'POST',
      });
      if (response.ok) {
        router.push(`/quotations/${id}/edit`);
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err.error || 'แปลงเป็นใบเสนอราคาไม่สำเร็จ');
      }
    } catch (error) {
      console.error('Error converting booking quotation:', error);
      alert('แปลงเป็นใบเสนอราคาไม่สำเร็จ');
    } finally {
      setConvertingId(null);
    }
  };

  const handleDelete = async (id: string, quotationNumber: string) => {
    if (!confirm(`ต้องการลบรายการ "${quotationNumber}" นี้ใช่หรือไม่? (จะไม่ถูกแปลงเป็นใบเสนอราคาอีก)`)) {
      return;
    }
    setDeletingId(id);
    try {
      const response = await fetch(`/api/quotations/${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchQuotations();
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err.error || 'ลบรายการไม่สำเร็จ');
      }
    } catch (error) {
      console.error('Error deleting booking quotation:', error);
      alert('ลบรายการไม่สำเร็จ');
    } finally {
      setDeletingId(null);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">จาก Booking (รอตรวจสอบ)</h1>
        <p className="text-gray-600">
          ใบเสนอราคาที่สร้างอัตโนมัติจากการจอง (Booking) ที่ยืนยันแล้วในระบบหน้าบ้าน — ต้องตรวจสอบรายการก่อนแปลงเป็นใบเสนอราคาจริง
        </p>
      </div>

      {/* Stat */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">รอตรวจสอบทั้งหมด</p>
              <p className="text-2xl font-bold">{totalItems}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
            <Input
              placeholder="ค้นหาเลขที่, ชื่อทัวร์, ชื่อลูกค้า, เบอร์โทร, รหัส Booking..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table / Cards */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">กำลังโหลด...</div>
            </div>
          ) : quotations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <FileText className="w-12 h-12 mb-4 text-gray-300" />
              <p>ไม่มีรายการจาก Booking ที่รอตรวจสอบ</p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="block lg:hidden divide-y divide-gray-200">
                {quotations.map((quotation) => (
                  <div key={quotation.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-blue-600">{quotation.quotationNumber}</div>
                        <div className="text-xs text-gray-500">
                          {quotation.bookingCode && <span>BK: {quotation.bookingCode}</span>}
                          {quotation.ntCode && <span> • NT: {quotation.ntCode}</span>}
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{quotation.customerName}</div>
                      {quotation.customerPhone && (
                        <div className="text-sm text-gray-500">{quotation.customerPhone}</div>
                      )}
                    </div>
                    {quotation.saleName && (
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <User className="w-3.5 h-3.5" />
                        <span>{quotation.saleName}</span>
                      </div>
                    )}
                    <div className="text-sm text-gray-700 line-clamp-2">{quotation.tourName}</div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDateRange(quotation.departureDate, quotation.returnDate)}</span>
                      </div>
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-gray-700">
                        <Users className="w-3 h-3" />
                        <span className="font-medium">{quotation.paxCount}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <div className="text-lg font-bold text-gray-900">
                        {formatPrice(quotation.grandTotal)} <span className="text-sm font-normal text-gray-500">บาท</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="ลบรายการ"
                          disabled={deletingId === quotation.id}
                          onClick={() => handleDelete(quotation.id, quotation.quotationNumber)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                        <Button
                          size="sm"
                          className="whitespace-nowrap"
                          disabled={convertingId === quotation.id}
                          onClick={() => handleConvert(quotation.id)}
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5" />
                          {convertingId === quotation.id ? 'กำลังแปลง...' : 'แปลงเป็นใบเสนอราคา'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-left">เลขที่ / Booking</TableHead>
                      <TableHead className="text-left">ลูกค้า</TableHead>
                      <TableHead className="text-left">Sale</TableHead>
                      <TableHead className="text-left">แพ็คเกจทัวร์</TableHead>
                      <TableHead className="text-center">วันเดินทาง</TableHead>
                      <TableHead className="text-center">PAX</TableHead>
                      <TableHead className="text-right">ยอดรวม</TableHead>
                      <TableHead className="text-right whitespace-nowrap">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotations.map((quotation) => (
                      <TableRow key={quotation.id}>
                        <TableCell>
                          <div className="font-medium text-blue-600">{quotation.quotationNumber}</div>
                          <div className="text-xs text-gray-500">
                            {quotation.bookingCode && <span>BK: {quotation.bookingCode}</span>}
                            {quotation.ntCode && <span> • NT: {quotation.ntCode}</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{quotation.customerName}</div>
                          {quotation.customerPhone && (
                            <div className="text-xs text-gray-500">{quotation.customerPhone}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-700">{quotation.saleName || '-'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium truncate max-w-xs cursor-help" title={quotation.tourName}>
                            {quotation.tourName}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="text-sm">{formatDateRange(quotation.departureDate, quotation.returnDate)}</div>
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
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="ลบรายการ"
                              disabled={deletingId === quotation.id}
                              onClick={() => handleDelete(quotation.id, quotation.quotationNumber)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                            <Button
                              size="sm"
                              className="whitespace-nowrap"
                              disabled={convertingId === quotation.id}
                              onClick={() => handleConvert(quotation.id)}
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5" />
                              {convertingId === quotation.id ? 'กำลังแปลง...' : 'แปลงเป็นใบเสนอราคา'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
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
    </div>
  );
}
