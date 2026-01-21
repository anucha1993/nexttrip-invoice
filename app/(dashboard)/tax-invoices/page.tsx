'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, Filter, Download, Eye, MoreVertical, 
  FileCheck, CheckCircle, DollarSign, 
  Loader2, Printer, XCircle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

interface TaxInvoiceData {
  id: number;
  invoiceNumber: string;
  taxInvoiceNumber: string;
  quotationId: number;
  quotationNumber: string;
  customerName: string;
  tourName?: string;
  grandTotal: number;
  subtotal: number;
  vatAmount: number;
  invoiceDate: string;
  taxInvoiceIssuedAt: string;
  status: string;
  hasTaxInvoice: boolean;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function TaxInvoicesPage() {
  const router = useRouter();
  const [taxInvoices, setTaxInvoices] = useState<TaxInvoiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Fetch tax invoices from API (invoices with hasTaxInvoice = true)
  useEffect(() => {
    const fetchTaxInvoices = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.set('page', pagination.page.toString());
        params.set('limit', pagination.limit.toString());
        params.set('hasTaxInvoice', 'true');
        
        const response = await fetch(`/api/invoices?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setTaxInvoices(data.invoices || []);
          setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
        }
      } catch (error) {
        console.error('Error fetching tax invoices:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTaxInvoices();
  }, [pagination.page, pagination.limit]);

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

  // Handle cancel tax invoice
  const handleCancelTaxInvoice = async (invoiceId: number, taxInvoiceNumber: string) => {
    const reason = window.prompt(`กรุณาระบุเหตุผลในการยกเลิกใบกำกับภาษี "${taxInvoiceNumber}":`);
    if (reason === null) return;
    if (!reason.trim()) {
      alert('กรุณาระบุเหตุผลในการยกเลิก');
      return;
    }

    try {
      setCancellingId(invoiceId);
      const response = await fetch(`/api/invoices/${invoiceId}/issue-tax-invoice?reason=${encodeURIComponent(reason)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel tax invoice');
      }

      // Refresh list
      const params = new URLSearchParams();
      params.set('page', pagination.page.toString());
      params.set('limit', pagination.limit.toString());
      params.set('hasTaxInvoice', 'true');
      
      const fetchResponse = await fetch(`/api/invoices?${params.toString()}`);
      if (fetchResponse.ok) {
        const data = await fetchResponse.json();
        setTaxInvoices(data.invoices || []);
      }

      alert('ยกเลิกใบกำกับภาษีเรียบร้อยแล้ว');
    } catch (error) {
      console.error('Error cancelling tax invoice:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(`ไม่สามารถยกเลิกใบกำกับภาษีได้: ${message}`);
    } finally {
      setCancellingId(null);
    }
  };

  // Filter by search query (client-side)
  const filteredInvoices = taxInvoices.filter((invoice) => {
    const matchesSearch =
      invoice.taxInvoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.quotationNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Date filter
    let matchesDate = true;
    if (dateFrom) {
      const issuedDate = new Date(invoice.taxInvoiceIssuedAt);
      const fromDate = new Date(dateFrom);
      matchesDate = issuedDate >= fromDate;
    }
    if (dateTo && matchesDate) {
      const issuedDate = new Date(invoice.taxInvoiceIssuedAt);
      const toDate = new Date(dateTo);
      matchesDate = issuedDate <= toDate;
    }
    
    return matchesSearch && matchesDate;
  });

  // Calculate summary stats
  const totalAmount = filteredInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
  const totalVat = filteredInvoices.reduce((sum, inv) => sum + (inv.vatAmount || 0), 0);

  const summaryCards = [
    {
      title: 'จำนวนใบกำกับภาษี',
      value: `${filteredInvoices.length} รายการ`,
      icon: FileCheck,
      color: 'from-purple-500 to-purple-600',
      bgLight: 'bg-purple-50',
      textColor: 'text-purple-600',
    },
    {
      title: 'ยอดรวมทั้งหมด',
      value: `${formatCurrency(totalAmount)} ฿`,
      icon: DollarSign,
      color: 'from-blue-500 to-blue-600',
      bgLight: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      title: 'ภาษีมูลค่าเพิ่มรวม',
      value: `${formatCurrency(totalVat)} ฿`,
      icon: CheckCircle,
      color: 'from-green-500 to-green-600',
      bgLight: 'bg-green-50',
      textColor: 'text-green-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg shadow-purple-500/25">
              <FileCheck className="w-6 h-6 text-white" />
            </div>
            ใบกำกับภาษี
          </h1>
          <p className="text-gray-500 mt-2 ml-12">จัดการใบกำกับภาษีทั้งหมดในระบบ</p>
        </div>
        <Button 
          onClick={() => router.push('/tax-invoices/create')}
          className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg shadow-purple-500/25"
        >
          <FileCheck className="w-4 h-4 mr-2" />
          ออกใบกำกับภาษี
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                className="pl-10 border-gray-200 focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className={`border-gray-200 hover:bg-gray-50 px-3 ${showAdvancedFilters ? 'bg-purple-50 border-purple-300 text-purple-600' : ''}`} 
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
            </div>
            <div className="flex justify-end mt-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                }}
                className="text-gray-600"
              >
                ล้างตัวกรอง
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Tax Invoice Table */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              <span className="ml-2 text-gray-500">กำลังโหลดข้อมูล...</span>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">ไม่พบข้อมูลใบกำกับภาษี</p>
              <p className="text-sm mt-1">ยังไม่มีใบกำกับภาษีในระบบ</p>
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-purple-50 to-purple-100 border-b border-purple-200">
                <TableHead className="font-semibold text-gray-700">เลขที่ใบกำกับภาษี</TableHead>
                <TableHead className="font-semibold text-gray-700">เลขที่ Invoice</TableHead>
                <TableHead className="font-semibold text-gray-700">ใบเสนอราคา</TableHead>
                <TableHead className="font-semibold text-gray-700">ลูกค้า</TableHead>
                <TableHead className="font-semibold text-gray-700 text-right">ยอดรวม</TableHead>
                <TableHead className="font-semibold text-gray-700">วันที่ออก</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice, index) => {
                return (
                  <TableRow 
                    key={invoice.id} 
                    className={`hover:bg-purple-50/50 transition-colors cursor-pointer ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <FileCheck className="w-4 h-4 text-purple-600" />
                        </div>
                        <span className="font-semibold text-purple-600 hover:text-purple-700">{invoice.taxInvoiceNumber}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-blue-600">{invoice.invoiceNumber}</span>
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
                      <span className="text-gray-600">{formatDate(invoice.taxInvoiceIssuedAt)}</span>
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
                          <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-10">
                            <button 
                              onClick={() => router.push(`/invoices/${invoice.id}`)}
                              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                              ดูรายละเอียด
                            </button>
                            <button 
                              onClick={() => alert('พิมพ์ใบกำกับภาษี')}
                              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 transition-colors"
                            >
                              <Printer className="w-4 h-4" />
                              พิมพ์ใบกำกับภาษี
                            </button>
                            <div className="border-t border-gray-100 my-1"></div>
                            <button 
                              onClick={() => {
                                setOpenMenu(null);
                                handleCancelTaxInvoice(invoice.id, invoice.taxInvoiceNumber);
                              }}
                              disabled={cancellingId === invoice.id}
                              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                            >
                              <XCircle className="w-4 h-4" />
                              ยกเลิกใบกำกับภาษี
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
                  ? "bg-purple-500 text-white border-purple-500 hover:bg-purple-600" 
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
