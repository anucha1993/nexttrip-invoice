'use client';

import { useState, useEffect, use, Fragment } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, Pencil, FileText, Calendar, Users, DollarSign,
  Receipt, Wallet, ShoppingCart, TrendingUp, FileCheck, Upload, 
  ListChecks, PackageCheck, Plus, Eye, CheckCircle, Clock, Download,
  Printer, XCircle, Trash2, ChevronDown, ChevronRight, User, CreditCard
} from 'lucide-react';
import Link from 'next/link';
import InvoiceModal from '@/components/invoices/invoice-modal';
import { useCurrentUser } from '@/contexts/AuthContext';

export default function QuotationDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const [quotation, setQuotation] = useState<any>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceRefreshKey, setInvoiceRefreshKey] = useState(0);
  const [paymentRefreshKey, setPaymentRefreshKey] = useState(0);

  // อัพเดท URL เมื่อเปลี่ยน tab
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    router.push(`/quotations/${resolvedParams.id}/dashboard?tab=${tabId}`, { scroll: false });
  };

  useEffect(() => {
    fetchQuotation();
  }, []);

  const fetchQuotation = async () => {
    try {
      const response = await fetch(`/api/quotations/${resolvedParams.id}`);
      if (response.ok) {
        const data = await response.json();
        setQuotation(data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvoiceSuccess = (invoiceId: number) => {
    setShowInvoiceModal(false);
    // Trigger invoice list refresh
    setInvoiceRefreshKey(prev => prev + 1);
    // Refresh quotation data
    fetchQuotation();
    // Switch to invoice tab
    handleTabChange('invoice');
  };

  // เมื่อมีการชำระเงินหรือคืนเงิน - refresh ทั้ง invoice และ payment tabs
  const handlePaymentChange = () => {
    setInvoiceRefreshKey(prev => prev + 1);
    setPaymentRefreshKey(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">กำลังโหลด...</div>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">ไม่พบข้อมูล</div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'ภาพรวม', icon: Eye },
    { id: 'quotation', label: 'ใบเสนอราคา', icon: FileText },
    { id: 'invoice', label: 'งานบัญชี', icon: Receipt }, //ใบแจ้งหนี้/ใบกำกับภาษี/ใบเสร็จรับเงิน
    { id: 'customer-payment', label: 'การชำระเงินลูกค้า', icon: Wallet },
    { id: 'wholesale-payment', label: 'ชำระเงิน Wholesale', icon: ShoppingCart },
    { id: 'tax', label: 'ภาษีซื้อ', icon: FileCheck },
    { id: 'cost', label: 'ต้นทุน', icon: DollarSign },
    { id: 'documents', label: 'เอกสาร', icon: Upload },
    { id: 'wholesale-cost', label: 'ต้นทุนโฮลเซลล์', icon: PackageCheck },
    { id: 'profit', label: 'สรุปกำไร', icon: TrendingUp },
    { id: 'checklist', label: 'เช็คลิสต์', icon: ListChecks },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4">
          <Link href="/quotations">
            <Button variant="ghost" size="sm" className="shrink-0">
              <ArrowLeft className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">กลับ</span>
            </Button>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">Dashboard - {quotation.quotationNumber}</h1>
            <p className="text-sm text-gray-600 truncate">{quotation.tourName}</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Link href={`/quotations/${resolvedParams.id}`}>
            <Button variant="outline" size="sm" className="text-xs sm:text-sm">
              <Eye className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">ดูใบเสนอราคา</span>
            </Button>
          </Link>
          <Link href={`/quotations/${resolvedParams.id}/edit`}>
            <Button size="sm" className="text-xs sm:text-sm">
              <Pencil className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">แก้ไข</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Tour Info Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 bg-blue-100 rounded-lg shrink-0">
                <Users className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600">ลูกค้า</p>
                <p className="text-sm sm:text-lg font-bold truncate">{quotation.customerName}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 bg-green-100 rounded-lg shrink-0">
                <Calendar className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600">วันเดินทาง</p>
                <p className="text-sm sm:text-lg font-bold">{quotation.numDays || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 bg-purple-100 rounded-lg shrink-0">
                <Users className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600">จำนวน PAX</p>
                <p className="text-sm sm:text-lg font-bold">{quotation.paxCount} คน</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 bg-amber-100 rounded-lg shrink-0">
                <DollarSign className="w-4 h-4 sm:w-6 sm:h-6 text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600">ยอดรวม</p>
                <p className="text-sm sm:text-lg font-bold">{quotation.grandTotal?.toLocaleString() || '0'} ฿</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs - Scrollable on mobile */}
      <div className="border-b border-gray-300 -mx-3 sm:mx-0 px-3 sm:px-0">
        <div className="flex gap-1 sm:gap-2 overflow-x-auto pb-px scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors  shrink-0 ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden xs:inline sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && <OverviewTab quotation={quotation} />}
        {activeTab === 'quotation' && <QuotationTab quotation={quotation} quotationId={resolvedParams.id} />}
        {activeTab === 'invoice' && <InvoiceTab quotation={quotation} onCreateInvoice={() => setShowInvoiceModal(true)} refreshKey={invoiceRefreshKey} />}
        {activeTab === 'customer-payment' && <CustomerPaymentTab quotation={quotation} onPaymentChange={handlePaymentChange} refreshKey={paymentRefreshKey} />}
        {activeTab === 'wholesale-payment' && <WholesalePaymentTab />}
        {activeTab === 'tax' && <TaxTab />}
        {activeTab === 'cost' && <CostTab />}
        {activeTab === 'documents' && <DocumentsTab />}
        {activeTab === 'wholesale-cost' && <WholesaleCostTab />}
        {activeTab === 'profit' && <ProfitTab />}
        {activeTab === 'checklist' && <ChecklistTab />}
      </div>

      {/* Invoice Modal */}
      {showInvoiceModal && quotation && (
        <InvoiceModal
          quotation={{
            id: quotation.id,
            quotationNumber: quotation.quotationNumber,
            customerName: quotation.customerName,
            grandTotal: quotation.grandTotal,
            status: quotation.status,
          }}
          onClose={() => setShowInvoiceModal(false)}
          onSuccess={handleInvoiceSuccess}
        />
      )}
    </div>
  );
}

// Tab Components (UI Only - Ready for Module Integration)

function OverviewTab({ quotation }: { quotation: any }) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Customer Info */}
        <Card>
          <CardHeader className="pb-2 sm:pb-4">
            <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              ข้อมูลลูกค้า
            </h3>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">ชื่อ</p>
              <p className="font-medium text-sm sm:text-base">{quotation.customerName}</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-600">เบอร์โทร</p>
              <p className="font-medium text-sm sm:text-base">{quotation.customerPhone || '-'}</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-600">อีเมล</p>
              <p className="font-medium text-sm sm:text-base break-all">{quotation.customerEmail || '-'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Financial Status */}
        <Card>
          <CardHeader className="pb-2 sm:pb-4">
            <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
              สถานะการเงิน
            </h3>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm text-gray-600">ยอดรวมทั้งหมด</span>
              <span className="font-bold text-sm sm:text-base">{quotation.grandTotal?.toLocaleString()} ฿</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm text-gray-600">ชำระแล้ว</span>
              <span className="font-bold text-sm sm:text-base text-green-600">{(quotation.totalPaid || 0).toLocaleString()} ฿</span>
            </div>
            {(quotation.totalRefunded || 0) > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-gray-600">คืนเงิน</span>
                <span className="font-bold text-sm sm:text-base text-red-600">{(quotation.totalRefunded || 0).toLocaleString()} ฿</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm text-gray-600">คงเหลือ</span>
              <span className="font-bold text-sm sm:text-base text-orange-600">{(quotation.balanceAmount ?? quotation.grandTotal)?.toLocaleString()} ฿</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Status */}
      <Card>
        <CardHeader className="pb-2 sm:pb-4">
          <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <ListChecks className="w-4 h-4 sm:w-5 sm:h-5" />
            สถานะดำเนินการ
          </h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            {/* ใบเสนอราคา - เสร็จแล้วเสมอ */}
            <div className="flex flex-col items-center p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 mb-1 sm:mb-2" />
              <p className="text-xs sm:text-sm text-center font-medium">ใบเสนอราคา</p>
              <p className="text-[10px] sm:text-xs text-green-600">เสร็จแล้ว</p>
            </div>
            
            {/* ใบแจ้งหนี้ - ดูจาก totalInvoiced */}
            {(quotation.totalInvoiced || 0) > 0 ? (
              <div className="flex flex-col items-center p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 mb-1 sm:mb-2" />
                <p className="text-xs sm:text-sm text-center font-medium">ใบแจ้งหนี้</p>
                <p className="text-[10px] sm:text-xs text-green-600">
                  {(quotation.totalInvoiced >= quotation.grandTotal) ? 'ครบแล้ว' : 'บางส่วน'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
                <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 mb-1 sm:mb-2" />
                <p className="text-xs sm:text-sm text-center font-medium">ใบแจ้งหนี้</p>
                <p className="text-[10px] sm:text-xs text-gray-500">รอดำเนินการ</p>
              </div>
            )}
            
            {/* การชำระเงิน - ดูจาก totalPaid และ balanceAmount */}
            {(() => {
              const paid = quotation.totalPaid || 0;
              const balance = quotation.balanceAmount ?? quotation.grandTotal;
              if (balance <= 0 && paid > 0) {
                return (
                  <div className="flex flex-col items-center p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
                    <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 mb-1 sm:mb-2" />
                    <p className="text-xs sm:text-sm text-center font-medium">การชำระเงิน</p>
                    <p className="text-[10px] sm:text-xs text-green-600">ชำระครบแล้ว</p>
                  </div>
                );
              } else if (paid > 0) {
                /// 
                return (
                  <div className="flex flex-col items-center p-3 sm:p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 mb-1 sm:mb-2" />
                    <p className="text-xs sm:text-sm text-center font-medium">การชำระเงิน</p>
                    <p className="text-[10px] sm:text-xs text-yellow-600">ชำระบางส่วน</p>
                  </div>
                );
              } else {
                return (
                  <div className="flex flex-col items-center p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 mb-1 sm:mb-2" />
                    <p className="text-xs sm:text-sm text-center font-medium">การชำระเงิน</p>
                    <p className="text-[10px] sm:text-xs text-gray-500">รอดำเนินการ</p>
                  </div>
                );
              }
            })()}
            
            {/* เอกสารครบ - ดูจากทุกเงื่อนไข */}
            {(() => {
              const invoiceComplete = (quotation.totalInvoiced || 0) >= quotation.grandTotal;
              const paymentComplete = (quotation.balanceAmount ?? quotation.grandTotal) <= 0 && (quotation.totalPaid || 0) > 0;
              const allComplete = invoiceComplete && paymentComplete;
              
              if (allComplete) {
                return (
                  <div className="flex flex-col items-center p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
                    <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 mb-1 sm:mb-2" />
                    <p className="text-xs sm:text-sm text-center font-medium">เอกสารครบ</p>
                    <p className="text-[10px] sm:text-xs text-green-600">เสร็จสมบูรณ์</p>
                  </div>
                );
              } else {
                return (
                  <div className="flex flex-col items-center p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 mb-1 sm:mb-2" />
                    <p className="text-xs sm:text-sm text-center font-medium">เอกสารครบ</p>
                    <p className="text-[10px] sm:text-xs text-gray-500">รอดำเนินการ</p>
                  </div>
                );
              }
            })()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function QuotationTab({ quotation, quotationId }: { quotation: any; quotationId: string }) {
  const [updating, setUpdating] = useState(false);

  const statusOptions = [
    { value: 'PENDING', label: 'รอดำเนินการ', color: 'bg-yellow-500', textColor: 'text-yellow-700' },
    { value: 'CONFIRMED', label: 'ยืนยัน', color: 'bg-blue-500', textColor: 'text-blue-700' },
    { value: 'CANCELLED', label: 'ยกเลิก', color: 'bg-red-500', textColor: 'text-red-700' },
  ];

  const allStatuses = [
    { value: 'NEW', label: 'ใหม่', color: 'bg-gray-500', textColor: 'text-gray-700' },
    ...statusOptions,
    { value: 'COMPLETED', label: 'เสร็จสิ้น', color: 'bg-green-500', textColor: 'text-green-700' },
  ];

  const currentStatus = allStatuses.find(s => s.value === quotation.status) || allStatuses[0];

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num || 0);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    if (newStatus === quotation.status) return;
    
    const newStatusLabel = statusOptions.find(s => s.value === newStatus)?.label || newStatus;
    if (!confirm(`ต้องการเปลี่ยนสถานะเป็น "${newStatusLabel}" หรือไม่?`)) {
      e.target.value = quotation.status; // Reset select
      return;
    }
    
    setUpdating(true);
    try {
      const response = await fetch(`/api/quotations/${quotationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (response.ok) {
        alert('เปลี่ยนสถานะเรียบร้อยแล้ว');
        window.location.reload();
      } else {
        const data = await response.json();
        alert('เกิดข้อผิดพลาด: ' + (data.error || 'ไม่สามารถเปลี่ยนสถานะได้'));
        e.target.value = quotation.status; // Reset select on error
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ');
      e.target.value = quotation.status; // Reset select on error
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status */}
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-xs sm:text-sm text-gray-600">สถานะ:</span>
          <select
            value={quotation.status}
            onChange={handleStatusChange}
            disabled={updating}
            className={`px-2 sm:px-3 py-1.5 rounded-lg border border-gray-300 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${currentStatus.textColor} ${updating ? 'opacity-50 cursor-wait' : ''}`}
          >
            {statusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
          {updating && <span className="text-xs sm:text-sm text-gray-500">กำลังอัพเดท...</span>}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap">
          <Link href={`/quotations/${quotationId}`}>
            <Button variant="outline" size="sm" className="text-xs sm:text-sm">
              <Eye className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">ดูฉบับเต็ม</span>
            </Button>
          </Link>
          <Link href={`/quotations/${quotationId}/edit`}>
            <Button variant="outline" size="sm" className="text-xs sm:text-sm">
              <Pencil className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">แก้ไข</span>
            </Button>
          </Link>
          <Button variant="outline" size="sm" className="text-xs sm:text-sm">
            <Download className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">PDF</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left: Customer & Tour Info */}
        <div className="lg:col-span-1 space-y-4">
          {/* Customer */}
          <Card>
            <CardHeader className="pb-2 sm:pb-3">
              <h4 className="font-semibold text-purple-700 text-sm sm:text-base">ข้อมูลลูกค้า</h4>
            </CardHeader>
            <CardContent className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
              <div>
                <span className="text-gray-500">ชื่อ:</span>
                <span className="ml-2 font-medium">{quotation.customerName}</span>
              </div>
              {quotation.customerPhone && (
                <div>
                  <span className="text-gray-500">โทร:</span>
                  <span className="ml-2">{quotation.customerPhone}</span>
                </div>
              )}
              {quotation.customerEmail && (
                <div>
                  <span className="text-gray-500">อีเมล:</span>
                  <span className="ml-2 break-all">{quotation.customerEmail}</span>
                </div>
              )}
              {quotation.customerTaxId && (
                <div>
                  <span className="text-gray-500">เลขผู้เสียภาษี:</span>
                  <span className="ml-2">{quotation.customerTaxId}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tour Info */}
          <Card>
            <CardHeader className="pb-2 sm:pb-3">
              <h4 className="font-semibold text-purple-700 text-sm sm:text-base">ข้อมูลทัวร์</h4>
            </CardHeader>
            <CardContent className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
              <div>
                <span className="text-gray-500">แพ็คเกจ:</span>
                <span className="ml-2 font-medium">{quotation.tourName}</span>
              </div>
              {quotation.tourCode && (
                <div>
                  <span className="text-gray-500">รหัส:</span>
                  <span className="ml-2">{quotation.tourCode}</span>
                </div>
              )}
              <div>
                <span className="text-gray-500">วันเดินทาง:</span>
                <span className="ml-2">
                  {quotation.departureDate ? (
                    <>{formatDate(quotation.departureDate)} - {formatDate(quotation.returnDate)} ({quotation.numDays})</>
                  ) : '-'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">จำนวน:</span>
                <span className="ml-2">{quotation.paxCount} ท่าน</span>
              </div>
              {quotation.saleName && (
                <div>
                  <span className="text-gray-500">พนักงานขาย:</span>
                  <span className="ml-2">{quotation.saleName}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Items Table */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2 sm:pb-3">
              <h4 className="font-semibold text-purple-700 text-sm sm:text-base">รายการสินค้า/บริการ</h4>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs sm:text-sm min-w-[400px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-2 px-2 sm:px-4 font-medium">#</th>
                    <th className="text-left py-2 px-2 sm:px-4 font-medium">รายการ</th>
                    <th className="text-center py-2 px-2 sm:px-4 font-medium">จำนวน</th>
                    <th className="text-right py-2 px-2 sm:px-4 font-medium">ราคา</th>
                    <th className="text-right py-2 px-2 sm:px-4 font-medium">รวม</th>
                  </tr>
                </thead>
                <tbody>
                  {quotation.items?.map((item: any, index: number) => (
                    <tr key={item.id} className="border-t">
                      <td className="py-2 px-2 sm:px-4 text-gray-500">{index + 1}</td>
                      <td className="py-2 px-2 sm:px-4">
                        <span className="font-medium">{item.productName}</span>
                        {item.itemType !== 'INCOME' && (
                          <span className={`ml-1 sm:ml-2 text-xs px-1 sm:px-1.5 py-0.5 rounded ${
                            item.itemType === 'DISCOUNT' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {item.itemType === 'DISCOUNT' ? 'ส่วนลด' : 'ฟรี'}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2 sm:px-4 text-center">{item.quantity}</td>
                      <td className="py-2 px-2 sm:px-4 text-right">{formatNumber(item.unitPrice)}</td>
                      <td className="py-2 px-2 sm:px-4 text-right font-medium">
                        {item.itemType === 'DISCOUNT' ? '-' : ''}{formatNumber(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 bg-gray-50">
                  <tr>
                    <td colSpan={4} className="py-2 px-2 sm:px-4 text-right text-gray-600">ยอดรวมก่อนส่วนลด</td>
                    <td className="py-2 px-2 sm:px-4 text-right">{formatNumber(quotation.subtotal)}</td>
                  </tr>
                  {quotation.discountAmount > 0 && (
                    <tr>
                      <td colSpan={4} className="py-1 px-2 sm:px-4 text-right text-gray-600">ส่วนลด</td>
                      <td className="py-1 px-2 sm:px-4 text-right text-red-600">-{formatNumber(quotation.discountAmount)}</td>
                    </tr>
                  )}
                  <tr>
                    <td colSpan={4} className="py-1 px-2 sm:px-4 text-right text-gray-600">VAT (7%)</td>
                    <td className="py-1 px-2 sm:px-4 text-right">{formatNumber(quotation.vatAmount)}</td>
                  </tr>
                  <tr className="bg-blue-50">
                    <td colSpan={4} className="py-2 sm:py-3 px-2 sm:px-4 text-right font-semibold text-xs sm:text-sm">ยอดรวมทั้งหมด</td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-right">
                      <span className="text-base sm:text-xl font-bold text-blue-600">{formatNumber(quotation.grandTotal)}</span>
                      <span className="text-xs sm:text-sm text-gray-500 ml-1">บาท</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>

          {/* Payment Info */}
          <Card className="mt-4">
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                <div className="p-2 sm:p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-gray-600 text-xs">กำหนดชำระมัดจำ</p>
                  <p className="font-medium text-xs sm:text-sm">{formatDate(quotation.depositDueDate)}</p>
                  <p className="text-base sm:text-lg font-bold text-yellow-700">{formatNumber(quotation.depositAmount)} ฿</p>
                </div>
                <div className="p-2 sm:p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-gray-600 text-xs">กำหนดชำระเต็มจำนวน</p>
                  <p className="font-medium text-xs sm:text-sm">{formatDate(quotation.fullPaymentDueDate)}</p>
                  <p className="text-base sm:text-lg font-bold text-green-700">{formatNumber(quotation.fullPaymentAmount)} ฿</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Notes */}
      {quotation.notes && (
        <Card>
          <CardHeader className="pb-2">
            <h4 className="font-semibold text-purple-700 text-sm sm:text-base">หมายเหตุ</h4>
          </CardHeader>
          <CardContent>
            <p className="text-xs sm:text-sm text-gray-700 whitespace-pre-wrap">{quotation.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InvoiceTab({ quotation, onCreateInvoice, refreshKey }: { quotation: any; onCreateInvoice: () => void; refreshKey?: number }) {
  const { userId, userName } = useCurrentUser();
  const [activeDocType, setActiveDocType] = useState<'invoice' | 'receipt' | 'taxInvoice'>('invoice');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [deletingInvoiceId, setDeletingInvoiceId] = useState<number | null>(null);
  const [hardDeletingInvoiceId, setHardDeletingInvoiceId] = useState<number | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);
  const [issuingTaxInvoiceId, setIssuingTaxInvoiceId] = useState<number | null>(null);
  const [cancellingTaxInvoiceId, setCancellingTaxInvoiceId] = useState<number | null>(null);
  const [expandedInvoiceIds, setExpandedInvoiceIds] = useState<Set<number>>(new Set());

  // Toggle expanded state for invoice
  const toggleExpanded = (invoiceId: number) => {
    setExpandedInvoiceIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(invoiceId)) {
        newSet.delete(invoiceId);
      } else {
        newSet.add(invoiceId);
      }
      return newSet;
    });
  };

  // Invoice status options - สถานะที่เลือกได้ด้วยตนเอง
  const statusOptions = [
    { value: 'DRAFT', label: 'ฉบับร่าง', color: 'bg-gray-100 text-gray-700 border-gray-300' },
    { value: 'ISSUED', label: 'ออกแล้ว', color: 'bg-blue-100 text-blue-700 border-blue-300' },
    { value: 'CANCELLED', label: 'ยกเลิก', color: 'bg-red-100 text-red-700 border-red-300' },
  ];

  // สถานะที่มาจากการชำระเงินจริง (อ่านอย่างเดียว)
  const paymentStatuses: Record<string, { label: string; color: string }> = {
    'PAID': { label: 'ชำระแล้ว', color: 'bg-green-100 text-green-700' },
    'PARTIAL_PAID': { label: 'ชำระบางส่วน', color: 'bg-yellow-100 text-yellow-700' },
  };

  // Function to update invoice status
  const handleStatusChange = async (invoiceId: number, newStatus: string) => {
    try {
      setUpdatingStatusId(invoiceId);
      const response = await fetch(`/api/invoices/${invoiceId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update status');
      }

      // Update local state
      setInvoices(prev => prev.map(inv => 
        inv.id === invoiceId ? { ...inv, status: newStatus } : inv
      ));
    } catch (error: any) {
      console.error('Error updating status:', error);
      alert(`ไม่สามารถเปลี่ยนสถานะได้: ${error.message}`);
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // Function to cancel invoice (soft delete)
  const handleCancelInvoice = async (invoiceId: number, invoiceNumber: string) => {
    const confirmed = window.confirm(`คุณต้องการยกเลิกใบแจ้งหนี้ "${invoiceNumber}" ใช่หรือไม่?\n\nหมายเหตุ: การยกเลิกจะเปลี่ยนสถานะเป็น "ยกเลิก"`);
    if (!confirmed) return;

    try {
      setDeletingInvoiceId(invoiceId);
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cancelReason: 'ยกเลิกโดยผู้ใช้',
          cancelledById: userId,
          cancelledByName: userName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel invoice');
      }

      // Refresh invoices list
      const fetchResponse = await fetch(`/api/invoices?quotationId=${quotation.id}`);
      if (fetchResponse.ok) {
        const data = await fetchResponse.json();
        setInvoices(data.invoices || []);
      }

      alert('ยกเลิกใบแจ้งหนี้เรียบร้อยแล้ว');
    } catch (error: any) {
      console.error('Error cancelling invoice:', error);
      alert(`ไม่สามารถยกเลิกใบแจ้งหนี้ได้: ${error.message}`);
    } finally {
      setDeletingInvoiceId(null);
    }
  };

  // Function to hard delete invoice (permanent delete from DB)
  const handleHardDeleteInvoice = async (invoiceId: number, invoiceNumber: string) => {
    const confirmed = window.confirm(`⚠️ คุณต้องการลบใบแจ้งหนี้ "${invoiceNumber}" อย่างถาวรใช่หรือไม่?\n\n⛔ คำเตือน: การลบนี้ไม่สามารถกู้คืนได้!`);
    if (!confirmed) return;

    try {
      setHardDeletingInvoiceId(invoiceId);
      const response = await fetch(`/api/invoices/${invoiceId}?hardDelete=true`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete invoice');
      }

      // Refresh invoices list
      const fetchResponse = await fetch(`/api/invoices?quotationId=${quotation.id}`);
      if (fetchResponse.ok) {
        const data = await fetchResponse.json();
        setInvoices(data.invoices || []);
      }

      alert('ลบใบแจ้งหนี้เรียบร้อยแล้ว');
    } catch (error: any) {
      console.error('Error deleting invoice:', error);
      alert(`ไม่สามารถลบใบแจ้งหนี้ได้: ${error.message}`);
    } finally {
      setHardDeletingInvoiceId(null);
    }
  };

  // Function to issue tax invoice
  const handleIssueTaxInvoice = async (invoiceId: number, invoiceNumber: string) => {
    const confirmed = window.confirm(`ต้องการออกใบกำกับภาษีสำหรับใบแจ้งหนี้ "${invoiceNumber}" ใช่หรือไม่?`);
    if (!confirmed) return;

    try {
      setIssuingTaxInvoiceId(invoiceId);
      const response = await fetch(`/api/invoices/${invoiceId}/issue-tax-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issuedById: userId,
          issuedByName: userName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to issue tax invoice');
      }

      const result = await response.json();

      // Refresh invoices list
      const fetchResponse = await fetch(`/api/invoices?quotationId=${quotation.id}`);
      if (fetchResponse.ok) {
        const data = await fetchResponse.json();
        setInvoices(data.invoices || []);
      }

      alert(`ออกใบกำกับภาษีเรียบร้อย: ${result.taxInvoiceNumber}`);
    } catch (error: any) {
      console.error('Error issuing tax invoice:', error);
      alert(`ไม่สามารถออกใบกำกับภาษีได้: ${error.message}`);
    } finally {
      setIssuingTaxInvoiceId(null);
    }
  };

  // Function to cancel tax invoice
  const handleCancelTaxInvoice = async (invoiceId: number, taxInvoiceNumber: string) => {
    const reason = window.prompt(`กรุณาระบุเหตุผลในการยกเลิกใบกำกับภาษี "${taxInvoiceNumber}":`);
    if (reason === null) return; // User cancelled
    if (!reason.trim()) {
      alert('กรุณาระบุเหตุผลในการยกเลิก');
      return;
    }

    try {
      setCancellingTaxInvoiceId(invoiceId);
      const response = await fetch(`/api/invoices/${invoiceId}/issue-tax-invoice?reason=${encodeURIComponent(reason)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel tax invoice');
      }

      // Refresh invoices list
      const fetchResponse = await fetch(`/api/invoices?quotationId=${quotation.id}`);
      if (fetchResponse.ok) {
        const data = await fetchResponse.json();
        setInvoices(data.invoices || []);
      }

      alert('ยกเลิกใบกำกับภาษีเรียบร้อยแล้ว');
    } catch (error: any) {
      console.error('Error cancelling tax invoice:', error);
      alert(`ไม่สามารถยกเลิกใบกำกับภาษีได้: ${error.message}`);
    } finally {
      setCancellingTaxInvoiceId(null);
    }
  };

  const docTypes = [
    { id: 'invoice', label: 'ใบแจ้งหนี้', icon: FileText, color: 'blue' },
    { id: 'taxInvoice', label: 'ใบกำกับภาษี', icon: FileCheck, color: 'purple' },
  ];

  // Fetch invoices for this quotation
  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoadingInvoices(true);
        const response = await fetch(`/api/invoices?quotationId=${quotation.id}`);
        if (response.ok) {
          const data = await response.json();
          setInvoices(data.invoices || []);
        }
      } catch (error) {
        console.error('Error fetching invoices:', error);
      } finally {
        setLoadingInvoices(false);
      }
    };
    fetchInvoices();
  }, [quotation.id, refreshKey]);

  // Calculate totals (exclude CANCELLED/VOIDED invoices)
  const activeInvoices = invoices.filter(inv => inv.status !== 'CANCELLED' && inv.status !== 'VOIDED');
  const totalInvoiced = activeInvoices.reduce((sum, inv) => sum + parseFloat(inv.grandTotal || 0), 0);
  // ยอดชำระเงินจริงจาก paidAmount ของ invoice (มาจาก customer_transactions)
  const totalPaid = activeInvoices.reduce((sum, inv) => sum + parseFloat(inv.paidAmount || 0), 0);
  // ยอดคืนเงินจริง
  const totalRefunded = activeInvoices.reduce((sum, inv) => sum + parseFloat(inv.refundedAmount || 0), 0);
  const remaining = parseFloat(quotation.grandTotal || 0) - totalInvoiced;
  const isFullyInvoiced = remaining <= 0 || parseFloat(quotation.grandTotal || 0) <= 0;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('th-TH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getStatusSelect = (invoice: any) => {
    const isUpdating = updatingStatusId === invoice.id;
    
    // สถานะ PAID/PARTIAL_PAID มาจากการชำระเงินจริง - แสดงเป็น Badge อย่างเดียว
    if (invoice.status === 'PAID' || invoice.status === 'PARTIAL_PAID') {
      const paymentStatus = paymentStatuses[invoice.status];
      return (
        <span 
          className={`px-2 py-1 rounded-full text-xs font-medium ${paymentStatus.color}`}
          title="สถานะนี้มาจากการชำระเงินจริง"
        >
          {paymentStatus.label}
        </span>
      );
    }
    
    const currentStatus = statusOptions.find(s => s.value === invoice.status) || statusOptions[0];
    
    return (
      <select
        value={invoice.status}
        onChange={(e) => handleStatusChange(invoice.id, e.target.value)}
        disabled={isUpdating || invoice.status === 'CANCELLED' || invoice.status === 'VOIDED'}
        className={`px-2 py-1 rounded-full text-xs font-medium border cursor-pointer disabled:cursor-not-allowed disabled:opacity-70 ${currentStatus.color}`}
      >
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="text-center">
              <p className="text-xs sm:text-sm text-gray-600 mb-1">ยอดรวมทั้งหมด</p>
              <p className="text-lg sm:text-2xl font-bold text-blue-600">{parseFloat(quotation.grandTotal || 0).toLocaleString()} ฿</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="text-center">
              <p className="text-xs sm:text-sm text-gray-600 mb-1">ออกใบแจ้งหนี้แล้ว</p>
              <p className="text-lg sm:text-2xl font-bold text-purple-600">{totalInvoiced.toLocaleString()} ฿</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="text-center">
              <p className="text-xs sm:text-sm text-gray-600 mb-1">ชำระเงินแล้ว</p>
              <p className="text-lg sm:text-2xl font-bold text-green-600">{totalPaid.toLocaleString()} ฿</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="text-center">
              <p className="text-xs sm:text-sm text-gray-600 mb-1">ค้างชำระ</p>
              <p className="text-lg sm:text-2xl font-bold text-orange-600">{Math.max(0, totalInvoiced - totalPaid + totalRefunded).toLocaleString()} ฿</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Document Type Sub-tabs */}
      <div className="flex gap-1 sm:gap-2 border-b pb-2 border-gray-300 overflow-x-auto">
        {docTypes.map((doc) => {
          const Icon = doc.icon;
          return (
            <button
              key={doc.id}
              onClick={() => setActiveDocType(doc.id as any)}
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-t-lg font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                activeDocType === doc.id
                  ? `bg-${doc.color}-50 text-${doc.color}-700 border-b-2 border-${doc.color}-500`
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden xs:inline sm:inline">{doc.label}</span>
            </button>
          );
        })}
      </div>

      {/* Invoice Section */}
      {activeDocType === 'invoice' && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                ใบแจ้งหนี้ (Invoice)
              </h3>
              <Button 
                size="sm" 
                onClick={onCreateInvoice}
                disabled={isFullyInvoiced}
                title={isFullyInvoiced ? 'ออกใบแจ้งหนี้ครบตามยอดใบเสนอราคาแล้ว' : ''}
                className="text-xs sm:text-sm"
              >
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">{isFullyInvoiced ? 'ออกใบแจ้งหนี้ครบแล้ว' : 'สร้างใบแจ้งหนี้'}</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingInvoices ? (
              <div className="text-center py-8 text-gray-500">กำลังโหลด...</div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-gray-500 bg-gray-50 rounded-lg">
                <FileText className="w-10 sm:w-12 h-10 sm:h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium text-sm sm:text-base">ยังไม่มีใบแจ้งหนี้</p>
                <p className="text-xs sm:text-sm mt-1">คลิกปุ่ม "สร้างใบแจ้งหนี้" เพื่อเริ่มต้น</p>
                <Button size="sm" className="mt-4 text-xs sm:text-sm" onClick={onCreateInvoice}>
                  <Plus className="w-4 h-4 mr-1 sm:mr-2" />
                  สร้างใบแจ้งหนี้
                </Button>
              </div>
            ) : (
              <>
                {/* Mobile Card View */}
                <div className="block lg:hidden space-y-3">
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="border rounded-lg p-3 bg-white shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-blue-600 text-sm">{invoice.invoiceNumber}</span>
                        {getStatusSelect(invoice)}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
                        <div>
                          <span className="text-gray-400">วันที่:</span>
                          <span className="ml-1">{formatDate(invoice.invoiceDate)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">กำหนดชำระ:</span>
                          <span className="ml-1">{formatDate(invoice.dueDate)}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t pt-2">
                        <span className="font-bold text-base">{parseFloat(invoice.grandTotal || 0).toLocaleString()} ฿</span>
                        <div className="flex items-center gap-1">
                          <button
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                            onClick={() => window.open(`/invoices/${invoice.id}`, '_blank')}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded"
                            onClick={() => window.open(`/invoices/${invoice.id}/edit`, '_blank')}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {invoice.status !== 'CANCELLED' && invoice.status !== 'VOIDED' && (
                            <button
                              className="p-1.5 text-orange-600 hover:bg-orange-50 rounded"
                              onClick={() => handleCancelInvoice(invoice.id, invoice.invoiceNumber)}
                              disabled={deletingInvoiceId === invoice.id}
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                            onClick={() => handleHardDeleteInvoice(invoice.id, invoice.invoiceNumber)}
                            disabled={hardDeletingInvoiceId === invoice.id}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium w-8"></th>
                      <th className="text-left py-3 px-4 font-medium">เลขที่</th>
                      <th className="text-left py-3 px-4 font-medium">วันที่ออก</th>
                      <th className="text-left py-3 px-4 font-medium">กำหนดชำระ</th>
                      <th className="text-right py-3 px-4 font-medium">จำนวนเงิน</th>
                      <th className="text-left py-3 px-4 font-medium">ผู้สร้าง</th>
                      <th className="text-center py-3 px-4 font-medium">สถานะ</th>
                      <th className="text-center py-3 px-4 font-medium">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => {
                      const isExpanded = expandedInvoiceIds.has(invoice.id);
                      const items = invoice.items || [];
                      
                      return (
                        <Fragment key={invoice.id}>
                          <tr className="border-t border-gray-200 hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <button
                                onClick={() => toggleExpanded(invoice.id)}
                                className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </button>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-medium text-blue-600">{invoice.invoiceNumber}</span>
                            </td>
                            <td className="py-3 px-4">{formatDate(invoice.invoiceDate)}</td>
                            <td className="py-3 px-4">{formatDate(invoice.dueDate)}</td>
                            <td className="py-3 px-4 text-right font-medium">
                              {parseFloat(invoice.grandTotal || 0).toLocaleString()} ฿
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5 text-gray-600">
                                <User className="w-3.5 h-3.5" />
                                <span className="text-sm">{invoice.createdByName || '-'}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">{getStatusSelect(invoice)}</td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                                  onClick={() => window.open(`/invoices/${invoice.id}`, '_blank')}
                                  title="ดู"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                                  onClick={() => window.open(`/invoices/${invoice.id}/edit`, '_blank')}
                                  title="แก้ไข"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors cursor-pointer"
                                  onClick={() => alert('พิมพ์ Invoice')}
                                  title="พิมพ์"
                                >
                                  <Printer className="w-4 h-4" />
                                </button>
                                {invoice.status !== 'CANCELLED' && invoice.status !== 'VOIDED' && (
                                  <button
                                    className="p-1.5 text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded transition-colors disabled:opacity-50 cursor-pointer"
                                    onClick={() => handleCancelInvoice(invoice.id, invoice.invoiceNumber)}
                                    disabled={deletingInvoiceId === invoice.id}
                                    title="ยกเลิก"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors disabled:opacity-50 cursor-pointer"
                                  onClick={() => handleHardDeleteInvoice(invoice.id, invoice.invoiceNumber)}
                                  disabled={hardDeletingInvoiceId === invoice.id}
                                  title="ลบ"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                          {/* Expanded Items Row */}
                          {isExpanded && (
                            <tr key={`${invoice.id}-items`} className="bg-gray-50">
                              <td colSpan={8} className="py-3 px-4">
                                <div className="ml-6 space-y-3">
                                  {/* Items Table */}
                                  <div className="bg-white rounded-lg border overflow-hidden">
                                    <div className="bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700">
                                      รายการ ({items.length} รายการ)
                                    </div>
                                    {items.length > 0 ? (
                                      <table className="w-full text-xs">
                                        <thead className="bg-gray-100">
                                          <tr>
                                            <th className="text-left py-2 px-3 font-medium">#</th>
                                            <th className="text-left py-2 px-3 font-medium">รายละเอียด</th>
                                            <th className="text-right py-2 px-3 font-medium">จำนวน</th>
                                            <th className="text-right py-2 px-3 font-medium">ราคา/หน่วย</th>
                                            <th className="text-right py-2 px-3 font-medium">รวม</th>
                                            <th className="text-center py-2 px-3 font-medium">VAT</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {items.map((item: any, idx: number) => (
                                            <tr key={item.id} className="border-t hover:bg-gray-50">
                                              <td className="py-2 px-3 text-gray-500">{idx + 1}</td>
                                              <td className="py-2 px-3">{item.description}</td>
                                              <td className="py-2 px-3 text-right">{item.quantity}</td>
                                              <td className="py-2 px-3 text-right">{parseFloat(item.unitPrice).toLocaleString()}</td>
                                              <td className="py-2 px-3 text-right font-medium">{parseFloat(item.amount).toLocaleString()}</td>
                                              <td className="py-2 px-3 text-center">
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                                  item.vatType === 'VAT' ? 'bg-green-100 text-green-700' :
                                                  item.vatType === 'VAT_EXEMPT' ? 'bg-yellow-100 text-yellow-700' :
                                                  'bg-gray-100 text-gray-600'
                                                }`}>
                                                  {item.vatType === 'VAT' ? 'VAT 7%' : item.vatType === 'VAT_EXEMPT' ? 'ยกเว้น' : 'ไม่มี'}
                                                </span>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    ) : (
                                      <div className="text-center py-4 text-gray-500 text-sm">ไม่มีรายการ</div>
                                    )}
                                  </div>
                                  
                                  {/* Summary */}
                                  <div className="bg-white rounded-lg border p-3">
                                    <div className="flex justify-end">
                                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                                        <div className="text-right">
                                          <span className="text-gray-500 block">ยอดรวม:</span>
                                          <span className="font-medium">{parseFloat(invoice.subtotal || 0).toLocaleString()} ฿</span>
                                        </div>
                                        <div className="text-right">
                                          <span className="text-gray-500 block">ส่วนลด:</span>
                                          <span className="font-medium text-red-600">-{parseFloat(invoice.discountAmount || 0).toLocaleString()} ฿</span>
                                        </div>
                                        <div className="text-right">
                                          <span className="text-gray-500 block">VAT 7%:</span>
                                          <span className="font-medium">{parseFloat(invoice.vatAmount || 0).toLocaleString()} ฿</span>
                                        </div>
                                        <div className="text-right">
                                          <span className="text-gray-500 block">ยอดสุทธิ:</span>
                                          <span className="font-bold text-blue-600">{parseFloat(invoice.grandTotal || 0).toLocaleString()} ฿</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tax Invoice Section */}
      {activeDocType === 'taxInvoice' && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-purple-600" />
                ใบกำกับภาษี (Tax Invoice)
              </h3>
            </div>
          </CardHeader>
          <CardContent>
            {loadingInvoices ? (
              <div className="text-center py-8 text-gray-500">กำลังโหลด...</div>
            ) : (
              <>
                {/* Tax Invoices that have been issued */}
                {(() => {
                  const taxInvoices = invoices.filter(inv => inv.hasTaxInvoice && inv.taxInvoiceNumber);
                  const invoicesWithoutTax = invoices.filter(
                    inv => !inv.hasTaxInvoice && inv.status !== 'CANCELLED' && inv.status !== 'VOIDED' && inv.status !== 'DRAFT'
                  );

                  return (
                    <div className="space-y-6">
                      {/* Issued Tax Invoices */}
                      {taxInvoices.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm text-gray-700 mb-3 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            ใบกำกับภาษีที่ออกแล้ว ({taxInvoices.length} รายการ)
                          </h4>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm min-w-[600px]">
                              <thead className="bg-purple-50">
                                <tr>
                                  <th className="text-left py-3 px-4 font-medium w-8"></th>
                                  <th className="text-left py-3 px-4 font-medium">เลขที่ใบกำกับภาษี</th>
                                  <th className="text-left py-3 px-4 font-medium">เลขที่ Invoice</th>
                                  <th className="text-left py-3 px-4 font-medium">วันที่ออก</th>
                                  <th className="text-right py-3 px-4 font-medium">จำนวนเงิน</th>
                                  <th className="text-left py-3 px-4 font-medium">ผู้ออก</th>
                                  <th className="text-center py-3 px-4 font-medium">จัดการ</th>
                                </tr>
                              </thead>
                              <tbody>
                                {taxInvoices.map((invoice) => {
                                  const isExpanded = expandedInvoiceIds.has(invoice.id);
                                  const items = invoice.items || [];
                                  
                                  return (
                                    <Fragment key={invoice.id}>
                                      <tr className="border-t hover:bg-gray-50">
                                        <td className="py-3 px-4">
                                          <button
                                            onClick={() => toggleExpanded(invoice.id)}
                                            className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
                                          >
                                            {isExpanded ? (
                                              <ChevronDown className="w-4 h-4" />
                                            ) : (
                                              <ChevronRight className="w-4 h-4" />
                                            )}
                                          </button>
                                        </td>
                                        <td className="py-3 px-4">
                                          <span className="font-medium text-purple-600">{invoice.taxInvoiceNumber}</span>
                                        </td>
                                        <td className="py-3 px-4 text-gray-600">{invoice.invoiceNumber}</td>
                                        <td className="py-3 px-4">{formatDate(invoice.taxInvoiceIssuedAt)}</td>
                                        <td className="py-3 px-4 text-right font-medium">
                                          {parseFloat(invoice.grandTotal || 0).toLocaleString()} ฿
                                        </td>
                                        <td className="py-3 px-4">
                                          <div className="flex items-center gap-1.5 text-gray-600">
                                            <User className="w-3.5 h-3.5" />
                                            <span className="text-sm">{invoice.taxInvoiceIssuedByName || invoice.createdByName || '-'}</span>
                                          </div>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                          <div className="flex items-center justify-center gap-1">
                                            <button
                                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                                              onClick={() => window.open(`/invoices/${invoice.id}`, '_blank')}
                                              title="ดู"
                                            >
                                              <Eye className="w-4 h-4" />
                                            </button>
                                            <button
                                              className="p-1.5 text-green-600 hover:bg-green-50 rounded cursor-pointer"
                                              onClick={() => alert('พิมพ์ใบกำกับภาษี')}
                                              title="พิมพ์"
                                            >
                                              <Printer className="w-4 h-4" />
                                            </button>
                                            <button
                                              className="p-1.5 text-red-600 hover:bg-red-50 rounded cursor-pointer disabled:opacity-50"
                                              onClick={() => handleCancelTaxInvoice(invoice.id, invoice.taxInvoiceNumber)}
                                              disabled={cancellingTaxInvoiceId === invoice.id}
                                              title="ยกเลิก"
                                            >
                                              <XCircle className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                      {/* Expanded Items Row */}
                                      {isExpanded && (
                                        <tr key={`${invoice.id}-tax-items`} className="bg-purple-50/30">
                                          <td colSpan={7} className="py-3 px-4">
                                            <div className="ml-6 space-y-3">
                                              {/* Items Table */}
                                              <div className="bg-white rounded-lg border overflow-hidden">
                                                <div className="bg-purple-50 px-3 py-2 text-sm font-medium text-purple-700">
                                                  รายการ ({items.length} รายการ)
                                                </div>
                                                {items.length > 0 ? (
                                                  <table className="w-full text-xs">
                                                    <thead className="bg-gray-100">
                                                      <tr>
                                                        <th className="text-left py-2 px-3 font-medium">#</th>
                                                        <th className="text-left py-2 px-3 font-medium">รายละเอียด</th>
                                                        <th className="text-right py-2 px-3 font-medium">จำนวน</th>
                                                        <th className="text-right py-2 px-3 font-medium">ราคา/หน่วย</th>
                                                        <th className="text-right py-2 px-3 font-medium">รวม</th>
                                                        <th className="text-center py-2 px-3 font-medium">VAT</th>
                                                      </tr>
                                                    </thead>
                                                    <tbody>
                                                      {items.map((item: any, idx: number) => (
                                                        <tr key={item.id} className="border-t hover:bg-gray-50">
                                                          <td className="py-2 px-3 text-gray-500">{idx + 1}</td>
                                                          <td className="py-2 px-3">{item.description}</td>
                                                          <td className="py-2 px-3 text-right">{item.quantity}</td>
                                                          <td className="py-2 px-3 text-right">{parseFloat(item.unitPrice).toLocaleString()}</td>
                                                          <td className="py-2 px-3 text-right font-medium">{parseFloat(item.amount).toLocaleString()}</td>
                                                          <td className="py-2 px-3 text-center">
                                                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                                              item.vatType === 'VAT' ? 'bg-green-100 text-green-700' :
                                                              item.vatType === 'VAT_EXEMPT' ? 'bg-yellow-100 text-yellow-700' :
                                                              'bg-gray-100 text-gray-600'
                                                            }`}>
                                                              {item.vatType === 'VAT' ? 'VAT 7%' : item.vatType === 'VAT_EXEMPT' ? 'ยกเว้น' : 'ไม่มี'}
                                                            </span>
                                                          </td>
                                                        </tr>
                                                      ))}
                                                    </tbody>
                                                  </table>
                                                ) : (
                                                  <div className="text-center py-4 text-gray-500 text-sm">ไม่มีรายการ</div>
                                                )}
                                              </div>
                                              
                                              {/* Summary */}
                                              <div className="bg-white rounded-lg border p-3">
                                                <div className="flex justify-end">
                                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                                                    <div className="text-right">
                                                      <span className="text-gray-500 block">ยอดรวม:</span>
                                                      <span className="font-medium">{parseFloat(invoice.subtotal || 0).toLocaleString()} ฿</span>
                                                    </div>
                                                    <div className="text-right">
                                                      <span className="text-gray-500 block">ส่วนลด:</span>
                                                      <span className="font-medium text-red-600">-{parseFloat(invoice.discountAmount || 0).toLocaleString()} ฿</span>
                                                    </div>
                                                    <div className="text-right">
                                                      <span className="text-gray-500 block">VAT 7%:</span>
                                                      <span className="font-medium">{parseFloat(invoice.vatAmount || 0).toLocaleString()} ฿</span>
                                                    </div>
                                                    <div className="text-right">
                                                      <span className="text-gray-500 block">ยอดสุทธิ:</span>
                                                      <span className="font-bold text-purple-600">{parseFloat(invoice.grandTotal || 0).toLocaleString()} ฿</span>
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          </td>
                                        </tr>
                                      )}
                                    </Fragment>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Invoices that can issue tax invoice */}
                      {invoicesWithoutTax.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm text-gray-700 mb-3 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-orange-500" />
                            ใบแจ้งหนี้ที่รอออกใบกำกับภาษี ({invoicesWithoutTax.length} รายการ)
                          </h4>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm min-w-[600px]">
                              <thead className="bg-orange-50">
                                <tr>
                                  <th className="text-left py-3 px-4 font-medium w-8"></th>
                                  <th className="text-left py-3 px-4 font-medium">เลขที่ Invoice</th>
                                  <th className="text-left py-3 px-4 font-medium">วันที่</th>
                                  <th className="text-right py-3 px-4 font-medium">จำนวนเงิน</th>
                                  <th className="text-center py-3 px-4 font-medium">สถานะ</th>
                                  <th className="text-center py-3 px-4 font-medium">ออกใบกำกับภาษี</th>
                                </tr>
                              </thead>
                              <tbody>
                                {invoicesWithoutTax.map((invoice) => {
                                  const statusLabel = statusOptions.find(s => s.value === invoice.status);
                                  const isExpanded = expandedInvoiceIds.has(invoice.id);
                                  const items = invoice.items || [];
                                  
                                  return (
                                    <Fragment key={invoice.id}>
                                      <tr className="border-t hover:bg-gray-50">
                                        <td className="py-3 px-4">
                                          <button
                                            onClick={() => toggleExpanded(invoice.id)}
                                            className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
                                          >
                                            {isExpanded ? (
                                              <ChevronDown className="w-4 h-4" />
                                            ) : (
                                              <ChevronRight className="w-4 h-4" />
                                            )}
                                          </button>
                                        </td>
                                        <td className="py-3 px-4">
                                          <span className="font-medium text-blue-600">{invoice.invoiceNumber}</span>
                                        </td>
                                        <td className="py-3 px-4">{formatDate(invoice.invoiceDate)}</td>
                                        <td className="py-3 px-4 text-right font-medium">
                                          {parseFloat(invoice.grandTotal || 0).toLocaleString()} ฿
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusLabel?.color || ''}`}>
                                            {statusLabel?.label || invoice.status}
                                          </span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-xs text-purple-600 border-purple-300 hover:bg-purple-50"
                                            onClick={() => handleIssueTaxInvoice(invoice.id, invoice.invoiceNumber)}
                                            disabled={issuingTaxInvoiceId === invoice.id}
                                          >
                                            {issuingTaxInvoiceId === invoice.id ? (
                                              <span>กำลังออก...</span>
                                            ) : (
                                              <>
                                                <FileCheck className="w-3 h-3 mr-1" />
                                                ออกใบกำกับภาษี
                                              </>
                                            )}
                                          </Button>
                                        </td>
                                      </tr>
                                      {/* Expanded Items Row */}
                                      {isExpanded && (
                                        <tr key={`${invoice.id}-pending-items`} className="bg-orange-50/30">
                                          <td colSpan={6} className="py-3 px-4">
                                            <div className="ml-6 space-y-3">
                                              {/* Items Table */}
                                              <div className="bg-white rounded-lg border overflow-hidden">
                                                <div className="bg-orange-50 px-3 py-2 text-sm font-medium text-orange-700">
                                                  รายการ ({items.length} รายการ)
                                                </div>
                                                {items.length > 0 ? (
                                                  <table className="w-full text-xs">
                                                    <thead className="bg-gray-100">
                                                      <tr>
                                                        <th className="text-left py-2 px-3 font-medium">#</th>
                                                        <th className="text-left py-2 px-3 font-medium">รายละเอียด</th>
                                                        <th className="text-right py-2 px-3 font-medium">จำนวน</th>
                                                        <th className="text-right py-2 px-3 font-medium">ราคา/หน่วย</th>
                                                        <th className="text-right py-2 px-3 font-medium">รวม</th>
                                                        <th className="text-center py-2 px-3 font-medium">VAT</th>
                                                      </tr>
                                                    </thead>
                                                    <tbody>
                                                      {items.map((item: any, idx: number) => (
                                                        <tr key={item.id} className="border-t hover:bg-gray-50">
                                                          <td className="py-2 px-3 text-gray-500">{idx + 1}</td>
                                                          <td className="py-2 px-3">{item.description}</td>
                                                          <td className="py-2 px-3 text-right">{item.quantity}</td>
                                                          <td className="py-2 px-3 text-right">{parseFloat(item.unitPrice).toLocaleString()}</td>
                                                          <td className="py-2 px-3 text-right font-medium">{parseFloat(item.amount).toLocaleString()}</td>
                                                          <td className="py-2 px-3 text-center">
                                                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                                              item.vatType === 'VAT' ? 'bg-green-100 text-green-700' :
                                                              item.vatType === 'VAT_EXEMPT' ? 'bg-yellow-100 text-yellow-700' :
                                                              'bg-gray-100 text-gray-600'
                                                            }`}>
                                                              {item.vatType === 'VAT' ? 'VAT 7%' : item.vatType === 'VAT_EXEMPT' ? 'ยกเว้น' : 'ไม่มี'}
                                                            </span>
                                                          </td>
                                                        </tr>
                                                      ))}
                                                    </tbody>
                                                  </table>
                                                ) : (
                                                  <div className="text-center py-4 text-gray-500 text-sm">ไม่มีรายการ</div>
                                                )}
                                              </div>
                                              
                                              {/* Summary */}
                                              <div className="bg-white rounded-lg border p-3">
                                                <div className="flex justify-end">
                                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                                                    <div className="text-right">
                                                      <span className="text-gray-500 block">ยอดรวม:</span>
                                                      <span className="font-medium">{parseFloat(invoice.subtotal || 0).toLocaleString()} ฿</span>
                                                    </div>
                                                    <div className="text-right">
                                                      <span className="text-gray-500 block">ส่วนลด:</span>
                                                      <span className="font-medium text-red-600">-{parseFloat(invoice.discountAmount || 0).toLocaleString()} ฿</span>
                                                    </div>
                                                    <div className="text-right">
                                                      <span className="text-gray-500 block">VAT 7%:</span>
                                                      <span className="font-medium">{parseFloat(invoice.vatAmount || 0).toLocaleString()} ฿</span>
                                                    </div>
                                                    <div className="text-right">
                                                      <span className="text-gray-500 block">ยอดสุทธิ:</span>
                                                      <span className="font-bold text-orange-600">{parseFloat(invoice.grandTotal || 0).toLocaleString()} ฿</span>
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          </td>
                                        </tr>
                                      )}
                                    </Fragment>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Empty state */}
                      {taxInvoices.length === 0 && invoicesWithoutTax.length === 0 && (
                        <div className="text-center py-6 sm:py-8 text-gray-500 bg-gray-50 rounded-lg">
                          <FileCheck className="w-10 sm:w-12 h-10 sm:h-12 mx-auto mb-3 text-gray-300" />
                          <p className="font-medium text-sm sm:text-base">ยังไม่มีใบกำกับภาษี</p>
                          <p className="text-xs sm:text-sm mt-1">สร้างใบแจ้งหนี้และเปลี่ยนสถานะเป็น "ออกแล้ว" หรือ "ชำระแล้ว" ก่อน</p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CustomerPaymentTab({ quotation, onPaymentChange, refreshKey }: { quotation: any; onPaymentChange?: () => void; refreshKey?: number }) {
  const { userId, userName } = useCurrentUser();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showPaymentLinkModal, setShowPaymentLinkModal] = useState(false);
  const [showSelectInvoiceModal, setShowSelectInvoiceModal] = useState(false);
  const [paymentLink, setPaymentLink] = useState<any>(null);
  const [creatingLink, setCreatingLink] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Banks and accounts
  const [banks, setBanks] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);

  // Helper function to get local datetime-local format
  const getLocalDateTimeString = (date?: Date | string): string => {
    const d = date ? new Date(date) : new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Form states
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('TRANSFER');
  const [paymentDate, setPaymentDate] = useState(getLocalDateTimeString());
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [refundReason, setRefundReason] = useState('');
  
  // Transfer specific
  const [selectedBankAccountId, setSelectedBankAccountId] = useState('');
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  
  // Cheque specific
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeDate, setChequeDate] = useState('');
  const [chequeBankId, setChequeBankId] = useState('');

  // Editing state
  const [editingTransactionId, setEditingTransactionId] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
    fetchBanksAndAccounts();
  }, [quotation.id, refreshKey]);

  const fetchBanksAndAccounts = async () => {
    try {
      const [banksRes, accountsRes] = await Promise.all([
        fetch('/api/banks'),
        fetch('/api/bank-accounts'),
      ]);
      
      if (banksRes.ok) {
        const data = await banksRes.json();
        setBanks(data.banks || []);
      }
      
      if (accountsRes.ok) {
        const data = await accountsRes.json();
        setBankAccounts(data.bankAccounts || []);
      }
    } catch (error) {
      console.error('Error fetching banks:', error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch transactions
      const txResponse = await fetch(`/api/customer-transactions?quotationId=${quotation.id}`);
      if (txResponse.ok) {
        const data = await txResponse.json();
        setTransactions(data.transactions || []);
      }
      
      // Fetch invoices for this quotation
      const invResponse = await fetch(`/api/invoices?quotationId=${quotation.id}`);
      if (invResponse.ok) {
        const data = await invResponse.json();
        setInvoices(data.invoices || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals
  const totalInvoiced = invoices
    .filter(inv => inv.status !== 'CANCELLED' && inv.status !== 'VOIDED')
    .reduce((sum, inv) => sum + parseFloat(inv.grandTotal || 0), 0);
  
  const totalPaid = transactions
    .filter(t => t.transactionType === 'PAYMENT' && t.status === 'CONFIRMED')
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  
  const totalRefunded = transactions
    .filter(t => t.transactionType === 'REFUND' && t.status === 'CONFIRMED')
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  
  // คงเหลือ = ยอดใบแจ้งหนี้ - ยอดชำระสุทธิ (ชำระแล้ว - คืนเงิน)
  // เมื่อคืนเงิน ยอดสุทธิที่ลูกค้าจ่ายจริงลดลง ทำให้คงเหลือเพิ่มขึ้น
  const balance = Math.round((totalInvoiced - totalPaid + totalRefunded) * 100) / 100;

  const handlePayment = async () => {
    if (!selectedInvoice || !paymentAmount) {
      alert('กรุณาเลือกใบแจ้งหนี้และระบุยอดเงิน');
      return;
    }

    try {
      setSubmitting(true);
      
      // Validate based on payment method
      if (paymentMethod === 'TRANSFER' && !selectedBankAccountId) {
        alert('กรุณาเลือกบัญชีธนาคาร');
        setSubmitting(false);
        return;
      }
      if (paymentMethod === 'CHEQUE' && (!chequeBankId || !chequeNumber || !chequeDate)) {
        alert('กรุณากรอกข้อมูลเช็คให้ครบถ้วน');
        setSubmitting(false);
        return;
      }
      
      // Upload slip if exists
      let uploadedSlipUrl = null;
      if (slipFile) {
        const formData = new FormData();
        formData.append('file', slipFile);
        formData.append('folder', 'slips');
        
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          uploadedSlipUrl = uploadData.url;
        } else {
          const uploadError = await uploadRes.json();
          alert(uploadError.error || 'ไม่สามารถอัพโหลดสลิปได้');
          setSubmitting(false);
          return;
        }
      }
      
      const isEditing = editingTransactionId !== null;
      const url = isEditing 
        ? `/api/customer-transactions/${editingTransactionId}` 
        : '/api/customer-transactions';
      
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionType: 'PAYMENT',
          invoiceId: selectedInvoice.id,
          amount: parseFloat(parseFloat(paymentAmount).toFixed(2)),
          paymentMethod,
          paymentDate,
          referenceNumber,
          notes,
          // Transfer specific
          bankAccountId: paymentMethod === 'TRANSFER' ? parseInt(selectedBankAccountId) : null,
          slipUrl: uploadedSlipUrl,
          // Cheque specific
          chequeNumber: paymentMethod === 'CHEQUE' ? chequeNumber : null,
          chequeDate: paymentMethod === 'CHEQUE' ? chequeDate : null,
          chequeBankId: paymentMethod === 'CHEQUE' ? parseInt(chequeBankId) : null,
          // Auto-confirm if slip is attached
          autoConfirm: !isEditing && !!uploadedSlipUrl,
          // For edit mode: confirm when slip is newly attached
          confirmOnSlip: isEditing && !!uploadedSlipUrl,
          createdById: userId,
          createdByName: userName,
          updatedById: userId,
          updatedByName: userName,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message || (isEditing ? 'แก้ไขเรียบร้อย' : 'บันทึกเรียบร้อย'));
        setShowPaymentModal(false);
        resetForm();
        fetchData();
        // Notify parent to refresh invoice tab
        onPaymentChange?.();
      } else {
        const error = await response.json();
        alert(error.error || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefund = async () => {
    if (!selectedInvoice || !paymentAmount || !refundReason) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    try {
      setSubmitting(true);
      
      // Upload slip if exists
      let uploadedSlipUrl = null;
      if (slipFile) {
        const formData = new FormData();
        formData.append('file', slipFile);
        formData.append('folder', 'slips');
        
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          uploadedSlipUrl = uploadData.url;
        } else {
          const uploadError = await uploadRes.json();
          alert(uploadError.error || 'ไม่สามารถอัพโหลดหลักฐานได้');
          setSubmitting(false);
          return;
        }
      }
      
      const isEditing = editingTransactionId !== null;
      const url = isEditing 
        ? `/api/customer-transactions/${editingTransactionId}` 
        : '/api/customer-transactions';
      
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionType: 'REFUND',
          invoiceId: selectedInvoice.id,
          amount: parseFloat(parseFloat(paymentAmount).toFixed(2)),
          paymentMethod,
          paymentDate,
          referenceNumber,
          refundReason,
          notes,
          slipUrl: uploadedSlipUrl,
          // Auto-confirm if slip is attached
          autoConfirm: !isEditing && !!uploadedSlipUrl,
          // For edit mode: confirm when slip is newly attached
          confirmOnSlip: isEditing && !!uploadedSlipUrl,
          createdById: userId,
          createdByName: userName,
          updatedById: userId,
          updatedByName: userName,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message || (isEditing ? 'แก้ไขเรียบร้อย' : 'บันทึกเรียบร้อย'));
        setShowRefundModal(false);
        resetForm();
        fetchData();
        // Notify parent to refresh invoice tab
        onPaymentChange?.();
      } else {
        const error = await response.json();
        alert(error.error || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm transaction
  const handleConfirmTransaction = async (transactionId: number, transactionNumber: string) => {
    const confirmed = window.confirm(`ต้องการยืนยันธุรกรรม "${transactionNumber}" ใช่หรือไม่?`);
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/customer-transactions/${transactionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm',
          confirmedById: userId,
          confirmedByName: userName,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message || 'ยืนยันเรียบร้อย');
        fetchData();
        onPaymentChange?.();
      } else {
        const error = await response.json();
        alert(error.error || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('เกิดข้อผิดพลาดในการยืนยัน');
    }
  };

  // Cancel transaction
  const handleCancelTransaction = async (transactionId: number, transactionNumber: string) => {
    const reason = window.prompt(`กรุณาระบุเหตุผลในการยกเลิกธุรกรรม "${transactionNumber}":`);
    if (!reason) return;

    try {
      const response = await fetch(`/api/customer-transactions/${transactionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel',
          cancelReason: reason,
          cancelledById: userId,
          cancelledByName: userName,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message || 'ยกเลิกเรียบร้อย');
        fetchData();
        onPaymentChange?.();
      } else {
        const error = await response.json();
        alert(error.error || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('เกิดข้อผิดพลาดในการยกเลิก');
    }
  };

  // Edit transaction
  const handleEditTransaction = (tx: any) => {
    // Store editing transaction ID
    setEditingTransactionId(tx.id);
    
    // Pre-fill form with transaction data
    const inv = invoices.find(i => i.id === tx.invoiceId);
    setSelectedInvoice(inv);
    // Round amount to 2 decimal places
    const amount = Math.round(parseFloat(tx.amount || 0) * 100) / 100;
    setPaymentAmount(amount.toFixed(2));
    setPaymentMethod(tx.paymentMethod || 'TRANSFER');
    setPaymentDate(tx.paymentDate ? getLocalDateTimeString(tx.paymentDate) : getLocalDateTimeString());
    setReferenceNumber(tx.referenceNumber || '');
    setNotes(tx.notes || '');
    setSelectedBankAccountId(tx.bankAccountId?.toString() || '');
    setChequeNumber(tx.chequeNumber || '');
    setChequeDate(tx.chequeDate?.split('T')[0] || '');
    setChequeBankId(tx.chequeBankId?.toString() || '');
    
    // Set slip preview if exists
    if (tx.slipUrl) {
      setSlipPreview(tx.slipUrl);
    }
    
    if (tx.transactionType === 'PAYMENT') {
      setShowPaymentModal(true);
    } else {
      setRefundReason(tx.refundReason || '');
      setShowRefundModal(true);
    }
  };

  const resetForm = () => {
    setPaymentAmount('');
    setPaymentMethod('TRANSFER');
    setPaymentDate(getLocalDateTimeString());
    setReferenceNumber('');
    setNotes('');
    setRefundReason('');
    setSelectedInvoice(null);
    // Transfer specific
    setSelectedBankAccountId('');
    setSlipFile(null);
    setSlipPreview(null);
    // Cheque specific
    setChequeNumber('');
    setChequeDate('');
    setChequeBankId('');
    // Reset editing state
    setEditingTransactionId(null);
  };

  const handleSlipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSlipFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSlipPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreatePaymentLink = async () => {
    setCreatingLink(true);
    try {
      // ใช้ invoice ที่เลือกจาก modal หรือคำนวณ amount จาก balance
      const amount = selectedInvoice 
        ? parseFloat(selectedInvoice.balanceAmount || selectedInvoice.grandTotal)
        : (balance > 0 ? balance : quotation.grandTotal);

      const res = await fetch('/api/payment-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quotationId: quotation.id,
          invoiceId: selectedInvoice?.id || null,
          amount: amount,
          description: selectedInvoice 
            ? `ชำระใบแจ้งหนี้ ${selectedInvoice.invoiceNumber} - ${quotation.customerName}`
            : `ชำระค่าแพ็คเกจ ${quotation.tourName || ''} - ${quotation.customerName}`,
          expiresInHours: 72,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setPaymentLink(data);
        setShowSelectInvoiceModal(false);
        setShowPaymentLinkModal(true);
      } else {
        alert(data.error || 'ไม่สามารถสร้าง Payment Link ได้');
      }
    } catch (error) {
      console.error('Error creating payment link:', error);
      alert('เกิดข้อผิดพลาด');
    } finally {
      setCreatingLink(false);
    }
  };

  const handleCopyLink = () => {
    if (paymentLink?.paymentUrl) {
      navigator.clipboard.writeText(paymentLink.paymentUrl);
      alert('คัดลอกลิงก์แล้ว!');
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('th-TH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'PENDING': 'bg-yellow-100 text-yellow-700',
      'CONFIRMED': 'bg-green-100 text-green-700',
      'CANCELLED': 'bg-red-100 text-red-700',
    };
    const labels: Record<string, string> = {
      'PENDING': 'รอยืนยัน',
      'CONFIRMED': 'ยืนยันแล้ว',
      'CANCELLED': 'ยกเลิก',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || ''}`}>
        {labels[status] || status}
      </span>
    );
  };

  // Get invoices that can receive payment
  const payableInvoices = invoices.filter(
    inv => inv.status !== 'CANCELLED' && inv.status !== 'VOIDED' && inv.status !== 'PAID'
  );

  // Get invoices that can be refunded (has payments)
  const refundableInvoices = invoices.filter(
    inv => parseFloat(inv.paidAmount || 0) > parseFloat(inv.refundedAmount || 0)
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            การชำระเงินลูกค้า
          </h3>
          <div className="flex flex-wrap gap-2">
            <Button 
              size="sm" 
              className="text-xs sm:text-sm bg-blue-600 hover:bg-blue-700"
              onClick={() => setShowSelectInvoiceModal(true)}
              disabled={creatingLink}
            >
              <CreditCard className="w-4 h-4 sm:mr-2" />
              {creatingLink ? 'กำลังสร้าง...' : (
                <>
                  <span className="hidden sm:inline">สร้าง Payment Link</span>
                  <span className="sm:hidden">Link</span>
                </>
              )}
            </Button>
            <Button 
              size="sm" 
              className="text-xs sm:text-sm bg-green-600 hover:bg-green-700"
              onClick={() => setShowPaymentModal(true)}
              disabled={payableInvoices.length === 0}
            >
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">บันทึกรับเงิน</span>
              <span className="sm:hidden">รับเงิน</span>
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              className="text-xs sm:text-sm text-red-600 border-red-300 hover:bg-red-50"
              onClick={() => setShowRefundModal(true)}
              disabled={refundableInvoices.length === 0}
            >
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">บันทึกคืนเงิน</span>
              <span className="sm:hidden">คืนเงิน</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs sm:text-sm text-gray-600 mb-1">ยอดใบแจ้งหนี้</p>
              <p className="text-lg sm:text-2xl font-bold text-blue-600">{totalInvoiced.toLocaleString()} ฿</p>
            </div>
            <div className="p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-xs sm:text-sm text-gray-600 mb-1">ชำระแล้ว</p>
              <p className="text-lg sm:text-2xl font-bold text-green-600">{totalPaid.toLocaleString()} ฿</p>
            </div>
            <div className="p-3 sm:p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-xs sm:text-sm text-gray-600 mb-1">คืนเงิน</p>
              <p className="text-lg sm:text-2xl font-bold text-red-600">{totalRefunded.toLocaleString()} ฿</p>
            </div>
            <div className="p-3 sm:p-4 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-xs sm:text-sm text-gray-600 mb-1">คงเหลือ</p>
              <p className="text-lg sm:text-2xl font-bold text-orange-600">{balance.toLocaleString()} ฿</p>
            </div>
          </div>

          {/* Transactions Table */}
          {loading ? (
            <div className="text-center py-8 text-gray-500">กำลังโหลด...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-gray-500 bg-gray-50 rounded-lg">
              <Wallet className="w-10 sm:w-12 h-10 sm:h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium text-sm sm:text-base">ยังไม่มีรายการชำระเงิน</p>
              <p className="text-xs sm:text-sm mt-1">คลิกปุ่มบันทึกรับเงินเพื่อเริ่มต้น</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium">เลขที่</th>
                    <th className="text-left py-3 px-4 font-medium">ประเภท</th>
                    <th className="text-left py-3 px-4 font-medium">Invoice</th>
                    <th className="text-left py-3 px-4 font-medium">วันที่</th>
                    <th className="text-right py-3 px-4 font-medium">ยอดเงิน</th>
                    <th className="text-left py-3 px-4 font-medium">วิธีชำระ</th>
                    <th className="text-center py-3 px-4 font-medium">สถานะ</th>
                    <th className="text-left py-3 px-4 font-medium">เอกสาร</th>
                    <th className="text-left py-3 px-4 font-medium">ผู้บันทึก</th>
                    <th className="text-center py-3 px-4 font-medium">สลิป</th>
                    <th className="text-center py-3 px-4 font-medium">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-t hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <span className="font-medium text-blue-600">{tx.transactionNumber}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          tx.transactionType === 'PAYMENT' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {tx.transactionType === 'PAYMENT' ? 'รับเงิน' : 'คืนเงิน'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{tx.invoiceNumber}</td>
                      <td className="py-3 px-4">{formatDate(tx.paymentDate)}</td>
                      <td className={`py-3 px-4 text-right font-medium ${
                        tx.transactionType === 'PAYMENT' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {tx.transactionType === 'PAYMENT' ? '+' : '-'}
                        {parseFloat(tx.amount).toLocaleString()} ฿
                      </td>
                      <td className="py-3 px-4">
                        {(() => {
                          const methodLabels: Record<string, string> = {
                            'CASH': 'เงินสด',
                            'TRANSFER': 'โอนเงิน',
                            'CHEQUE': 'เช็ค',
                            'CREDIT_CARD': 'บัตรเครดิต',
                          };
                          return (
                            <span className="text-xs text-gray-700">
                              {methodLabels[tx.paymentMethod] || tx.paymentMethod}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-4 text-center">{getStatusBadge(tx.status)}</td>
                      <td className="py-3 px-4">
                        {tx.receiptNumber && (
                          <span className="text-green-600 text-xs">{tx.receiptNumber}</span>
                        )}
                        {tx.creditNoteNumber && (
                          <span className="text-red-600 text-xs">{tx.creditNoteNumber}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs text-gray-600">{tx.createdByName || '-'}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {tx.slipUrl ? (
                          <a 
                            href={tx.slipUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs"
                          >
                            <Eye className="w-3 h-3" />
                            ดูสลิป
                          </a>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 justify-center">
                          {tx.status === 'PENDING' && (
                            <button
                              onClick={() => handleConfirmTransaction(tx.id, tx.transactionNumber)}
                              className="p-1 text-green-600 hover:bg-green-50 rounded"
                              title="ยืนยัน"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          {tx.status !== 'CANCELLED' && (
                            <>
                              {/* Print button - mock up */}
                              {tx.status === 'CONFIRMED' && (
                                <button
                                  onClick={() => alert('ฟีเจอร์พิมพ์เอกสารกำลังพัฒนา')}
                                  className="p-1 text-purple-600 hover:bg-purple-50 rounded"
                                  title="พิมพ์"
                                >
                                  <Printer className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleEditTransaction(tx)}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                title="แก้ไข"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleCancelTransaction(tx.id, tx.transactionNumber)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                title="ยกเลิก"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CardContent>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">{editingTransactionId ? 'แก้ไขรับเงิน' : 'บันทึกรับเงิน'}</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">เลือกใบแจ้งหนี้ *</label>
                <select
                  className="w-full border rounded-lg px-3 py-2"
                  value={selectedInvoice?.id || ''}
                  onChange={(e) => {
                    const inv = payableInvoices.find(i => i.id === parseInt(e.target.value));
                    setSelectedInvoice(inv);
                    if (inv) {
                      // คงเหลือ = grandTotal - paidAmount + refundedAmount
                      const balance = Math.round((parseFloat(inv.grandTotal) - parseFloat(inv.paidAmount || 0) + parseFloat(inv.refundedAmount || 0)) * 100) / 100;
                      setPaymentAmount(balance.toFixed(2));
                    }
                  }}
                >
                  <option value="">-- เลือก --</option>
                  {payableInvoices.map(inv => {
                    // คงเหลือ = grandTotal - paidAmount + refundedAmount
                    const balance = Math.round((parseFloat(inv.grandTotal) - parseFloat(inv.paidAmount || 0) + parseFloat(inv.refundedAmount || 0)) * 100) / 100;
                    return (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} - คงเหลือ {balance.toLocaleString()} ฿
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ยอดเงิน *</label>
                <input
                  type="number" 
                  className="w-full border rounded-lg px-3 py-2"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">วิธีชำระ *</label>
                <select
                  className="w-full border rounded-lg px-3 py-2"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="CASH">เงินสด</option>
                  <option value="TRANSFER">โอนเงิน</option>
                  <option value="CHEQUE">เช็คธนาคาร</option>
                  <option value="CREDIT_CARD">บัตรเครดิต</option>
                </select>
              </div>

              {/* Conditional fields based on payment method */}
              {paymentMethod === 'TRANSFER' && (
                <div>
                  <label className="block text-sm font-medium mb-1">บัญชีธนาคารที่รับโอน *</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2"
                    value={selectedBankAccountId}
                    onChange={(e) => setSelectedBankAccountId(e.target.value)}
                  >
                    <option value="">-- เลือกบัญชี --</option>
                    {bankAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.displayName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {paymentMethod === 'CHEQUE' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">ธนาคารที่ออกเช็ค *</label>
                    <select
                      className="w-full border rounded-lg px-3 py-2"
                      value={chequeBankId}
                      onChange={(e) => setChequeBankId(e.target.value)}
                    >
                      <option value="">-- เลือกธนาคาร --</option>
                      {banks.map(bank => (
                        <option key={bank.id} value={bank.id}>
                          {bank.nameTH}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">เลขที่เช็ค *</label>
                    <input
                      type="text"
                      className="w-full border rounded-lg px-3 py-2"
                      value={chequeNumber}
                      onChange={(e) => setChequeNumber(e.target.value)}
                      placeholder="เลขที่เช็ค"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">เช็คลงวันที่ *</label>
                    <input
                      type="date"
                      className="w-full border rounded-lg px-3 py-2"
                      value={chequeDate}
                      onChange={(e) => setChequeDate(e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* แนบสลิป/หลักฐาน - ใช้ได้กับทุกวิธีชำระ */}
              <div>
                <label className="block text-sm font-medium mb-1">แนบสลิป/หลักฐาน</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  onChange={handleSlipChange}
                />
                {slipPreview && (
                  <div className="mt-2">
                    {slipFile?.type === 'application/pdf' ? (
                      <div className="flex items-center gap-2 p-2 bg-gray-100 rounded border">
                        <span className="text-red-600">📄</span>
                        <span className="text-sm">{slipFile.name}</span>
                      </div>
                    ) : (
                      <img src={slipPreview} alt="Preview" className="max-w-full max-h-40 rounded border" />
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">วันที่และเวลาชำระ</label>
                <input
                  type="datetime-local"
                  className="w-full border rounded-lg px-3 py-2"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">เลขอ้างอิง / หมายเหตุ</label>
                <input
                  type="text"
                  className="w-full border rounded-lg px-3 py-2"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="เลขอ้างอิงอื่นๆ (ถ้ามี)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">หมายเหตุ</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
            <div className="p-4 border-t flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setShowPaymentModal(false); resetForm(); }}>
                ยกเลิก
              </Button>
              <Button onClick={handlePayment} disabled={submitting} className="bg-green-600 hover:bg-green-700">
                {submitting ? 'กำลังบันทึก...' : (editingTransactionId ? 'บันทึกการแก้ไข' : 'บันทึกรับเงิน')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold text-red-600">{editingTransactionId ? 'แก้ไขคืนเงิน' : 'บันทึกคืนเงิน'}</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                ⚠️ การคืนเงินจะออกใบลดหนี้อัตโนมัติ
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">เลือกใบแจ้งหนี้ *</label>
                <select
                  className="w-full border rounded-lg px-3 py-2"
                  value={selectedInvoice?.id || ''}
                  onChange={(e) => {
                    const inv = refundableInvoices.find(i => i.id === parseInt(e.target.value));
                    setSelectedInvoice(inv);
                  }}
                >
                  <option value="">-- เลือก --</option>
                  {refundableInvoices.map(inv => {
                    const refundable = Math.round((parseFloat(inv.paidAmount || 0) - parseFloat(inv.refundedAmount || 0)) * 100) / 100;
                    return (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} - ชำระแล้ว {refundable.toLocaleString()} ฿
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ยอดคืนเงิน *</label>
                <input
                  type="number"
                  className="w-full border rounded-lg px-3 py-2"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">เหตุผลในการคืนเงิน *</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  rows={2}
                  placeholder="ระบุเหตุผล..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">วิธีคืนเงิน</label>
                <select
                  className="w-full border rounded-lg px-3 py-2"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="CASH">เงินสด</option>
                  <option value="TRANSFER">โอนเงิน</option>
                  <option value="CHEQUE">เช็คธนาคาร</option>
                </select>
              </div>
              {/* แนบสลิป/หลักฐานคืนเงิน */}
              <div>
                <label className="block text-sm font-medium mb-1">แนบสลิป/หลักฐาน</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  onChange={handleSlipChange}
                />
                {slipPreview && (
                  <div className="mt-2">
                    {slipFile?.type === 'application/pdf' ? (
                      <div className="flex items-center gap-2 p-2 bg-gray-100 rounded border">
                        <span className="text-red-600">📄</span>
                        <span className="text-sm">{slipFile.name}</span>
                      </div>
                    ) : (
                      <img src={slipPreview} alt="Preview" className="max-w-full max-h-40 rounded border" />
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">วันที่และเวลาคืนเงิน</label>
                <input
                  type="datetime-local"
                  className="w-full border rounded-lg px-3 py-2"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>
            </div>
            <div className="p-4 border-t flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setShowRefundModal(false); resetForm(); }}>
                ยกเลิก
              </Button>
              <Button onClick={handleRefund} disabled={submitting} className="bg-red-600 hover:bg-red-700">
                {submitting ? 'กำลังบันทึก...' : (editingTransactionId ? 'บันทึกการแก้ไข' : 'บันทึกคืนเงิน')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Selection Modal */}
      {showSelectInvoiceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">เลือกใบแจ้งหนี้สำหรับ Payment Link</h2>
              <button onClick={() => setShowSelectInvoiceModal(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Invoice List */}
              <div className="space-y-3">
                {invoices.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>ยังไม่มีใบแจ้งหนี้</p>
                  </div>
                ) : (
                  invoices
                    .filter(inv => inv.status !== 'CANCELLED' && inv.status !== 'VOIDED')
                    .map((invoice) => {
                      const balance = parseFloat(invoice.balanceAmount || invoice.grandTotal);
                      const isPaid = invoice.status === 'PAID' || balance <= 0;
                      
                      return (
                        <div
                          key={invoice.id}
                          onClick={() => !isPaid && setSelectedInvoice(invoice)}
                          className={`border rounded-lg p-4 cursor-pointer transition-all ${
                            selectedInvoice?.id === invoice.id
                              ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                              : isPaid
                              ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                              : 'border-gray-300 hover:border-blue-300 hover:bg-blue-50/50'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <FileText className="w-4 h-4 text-blue-600" />
                                <span className="font-semibold text-gray-900">
                                  {invoice.invoiceNumber || `INV-${invoice.id}`}
                                </span>
                                {getStatusBadge(invoice.status)}
                              </div>
                              
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                <div>
                                  <span className="text-gray-500">วันที่:</span>
                                  <span className="ml-2 text-gray-900">
                                    {new Date(invoice.invoiceDate).toLocaleDateString('th-TH')}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500">ยอดรวม:</span>
                                  <span className="ml-2 text-gray-900 font-medium">
                                    ฿{parseFloat(invoice.grandTotal).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500">ชำระแล้ว:</span>
                                  <span className="ml-2 text-green-600 font-medium">
                                    ฿{parseFloat(invoice.paidAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500">คงเหลือ:</span>
                                  <span className={`ml-2 font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    ฿{balance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Radio indicator */}
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ml-3 ${
                              selectedInvoice?.id === invoice.id
                                ? 'border-blue-500 bg-blue-500'
                                : isPaid
                                ? 'border-gray-300 bg-gray-100'
                                : 'border-gray-300'
                            }`}>
                              {selectedInvoice?.id === invoice.id && (
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>

              {/* Summary */}
              {selectedInvoice && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-sm text-blue-800 mb-2">จะสร้าง Payment Link สำหรับ:</p>
                  <p className="font-semibold text-blue-900">
                    {selectedInvoice.invoiceNumber} - ยอด ฿{parseFloat(
                      selectedInvoice.balanceAmount || selectedInvoice.grandTotal
                    ).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setShowSelectInvoiceModal(false);
                    setSelectedInvoice(null);
                  }}
                  className="flex-1"
                >
                  ยกเลิก
                </Button>
                <Button 
                  onClick={handleCreatePaymentLink}
                  disabled={!selectedInvoice || creatingLink}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {creatingLink ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      กำลังสร้าง...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      สร้าง Payment Link
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Link Modal */}
      {showPaymentLinkModal && paymentLink && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Payment Link สำเร็จ</h2>
              <button onClick={() => setShowPaymentLinkModal(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* QR Code */}
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-3">สแกน QR Code เพื่อเปิดหน้าชำระเงิน</p>
                <div className="bg-white p-4 rounded-xl border-2 border-blue-200 inline-block">
                  <img src={paymentLink.qrCodeUrl} alt="Payment Link QR Code" className="w-64 h-64" />
                </div>
              </div>

              {/* Link */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ลิงก์สำหรับส่งให้ลูกค้า
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={paymentLink.paymentUrl}
                    readOnly
                    className="flex-1 px-3 py-2 border rounded-lg bg-gray-50 text-sm"
                  />
                  <Button onClick={handleCopyLink} size="sm">
                    คัดลอก
                  </Button>
                </div>
              </div>

              {/* Amount */}
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <p className="text-sm text-gray-600">ยอดชำระ</p>
                <p className="text-2xl font-bold text-green-600">
                  ฿{parseFloat(paymentLink.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* Expiry */}
              <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                <div className="flex items-center gap-2 text-sm text-orange-700">
                  <Clock className="w-4 h-4" />
                  <span>ลิงก์หมดอายุ: {new Date(paymentLink.expiresAt).toLocaleDateString('th-TH', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}</span>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="font-medium text-blue-800 mb-2">วิธีใช้งาน:</p>
                <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                  <li>คัดลอกลิงก์ด้านบน</li>
                  <li>ส่งให้ลูกค้าผ่าน LINE, Email หรือ SMS</li>
                  <li>ลูกค้ากดลิงก์และเลือกวิธีชำระเงินเอง</li>
                  <li>ระบบจะอัปเดตสถานะอัตโนมัติเมื่อชำระเรียบร้อย</li>
                </ol>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button 
                  onClick={() => window.open(paymentLink.paymentUrl, '_blank')}
                  className="flex-1"
                  variant="outline"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  ดูหน้าชำระเงิน
                </Button>
                <Button 
                  onClick={() => setShowPaymentLinkModal(false)}
                  className="flex-1"
                >
                  ปิด
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function WholesalePaymentTab() {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            ระบบจัดการการชำระเงินให้ Wholesale
          </h3>
          <Button size="sm" className="text-xs sm:text-sm">
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">บันทึกการชำระ</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 sm:py-12 text-gray-500 bg-gray-50 rounded-lg">
          <ShoppingCart className="w-12 sm:w-16 h-12 sm:h-16 mx-auto mb-4 text-gray-300" />
          <p className="font-medium text-sm sm:text-base">ยังไม่มีรายการชำระเงินให้ Wholesale</p>
          <p className="text-xs sm:text-sm mt-2">Module นี้พร้อมรอการพัฒนา</p>
        </div>
      </CardContent>
    </Card>
  );
}

function TaxTab() {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <FileCheck className="w-5 h-5" />
            ระบบจัดการภาษีซื้อ
          </h3>
          <Button size="sm" className="text-xs sm:text-sm">
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">เพิ่มใบกำกับภาษี</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 sm:py-12 text-gray-500 bg-gray-50 rounded-lg">
          <FileCheck className="w-12 sm:w-16 h-12 sm:h-16 mx-auto mb-4 text-gray-300" />
          <p className="font-medium text-sm sm:text-base">ยังไม่มีใบกำกับภาษีซื้อ</p>
          <p className="text-xs sm:text-sm mt-2">Module นี้พร้อมรอการพัฒนา</p>
        </div>
      </CardContent>
    </Card>
  );
}

function CostTab() {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            ระบบจัดการต้นทุน
          </h3>
          <Button size="sm" className="text-xs sm:text-sm">
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">เพิ่มรายการต้นทุน</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-3 sm:p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 text-xs sm:text-sm">ต้นทุนทั้งหมด</span>
              <span className="text-lg sm:text-2xl font-bold text-purple-600">0 ฿</span>
            </div>
          </div>
          <div className="text-center py-6 sm:py-8 text-gray-500 bg-gray-50 rounded-lg">
            <DollarSign className="w-10 sm:w-12 h-10 sm:h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium text-sm sm:text-base">ยังไม่มีรายการต้นทุน</p>
            <p className="text-xs sm:text-sm mt-1">Module นี้พร้อมรอการพัฒนา</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DocumentsTab() {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <Upload className="w-5 h-5" />
            ระบบจัดเก็บเอกสาร
          </h3>
          <Button size="sm" className="text-xs sm:text-sm">
            <Upload className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">อัปโหลดเอกสาร</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            <div className="p-2 sm:p-4 bg-blue-50 rounded-lg border border-blue-200 text-center">
              <FileText className="w-6 sm:w-8 h-6 sm:h-8 mx-auto mb-1 sm:mb-2 text-blue-600" />
              <p className="text-xs sm:text-sm font-medium">Passport</p>
              <p className="text-xs text-gray-500">0 ไฟล์</p>
            </div>
            <div className="p-2 sm:p-4 bg-green-50 rounded-lg border border-green-200 text-center">
              <FileText className="w-6 sm:w-8 h-6 sm:h-8 mx-auto mb-1 sm:mb-2 text-green-600" />
              <p className="text-xs sm:text-sm font-medium">Visa</p>
              <p className="text-xs text-gray-500">0 ไฟล์</p>
            </div>
            <div className="p-2 sm:p-4 bg-purple-50 rounded-lg border border-purple-200 text-center">
              <FileText className="w-6 sm:w-8 h-6 sm:h-8 mx-auto mb-1 sm:mb-2 text-purple-600" />
              <p className="text-xs sm:text-sm font-medium">ใบแจ้งหนี้</p>
              <p className="text-xs text-gray-500">0 ไฟล์</p>
            </div>
            <div className="p-2 sm:p-4 bg-orange-50 rounded-lg border border-orange-200 text-center">
              <FileText className="w-6 sm:w-8 h-6 sm:h-8 mx-auto mb-1 sm:mb-2 text-orange-600" />
              <p className="text-xs sm:text-sm font-medium">อื่นๆ</p>
              <p className="text-xs text-gray-500">0 ไฟล์</p>
            </div>
          </div>
          <div className="text-center py-6 sm:py-8 text-gray-500 bg-gray-50 rounded-lg">
            <Upload className="w-12 sm:w-16 h-12 sm:h-16 mx-auto mb-4 text-gray-300" />
            <p className="font-medium text-sm sm:text-base">ยังไม่มีเอกสาร</p>
            <p className="text-xs sm:text-sm mt-2">Module นี้พร้อมรอการพัฒนา</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function WholesaleCostTab() {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <PackageCheck className="w-5 h-5" />
            รายการต้นทุนโฮลเซลล์
          </h3>
          <Button size="sm" className="text-xs sm:text-sm">
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">เพิ่มรายการ</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="p-3 sm:p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-xs sm:text-sm text-gray-600 mb-1">ต้นทุนโฮลเซลล์</p>
              <p className="text-lg sm:text-2xl font-bold text-purple-600">0 ฿</p>
            </div>
            <div className="p-3 sm:p-4 bg-indigo-50 rounded-lg border border-indigo-200">
              <p className="text-xs sm:text-sm text-gray-600 mb-1">ค่าใช้จ่ายอื่นๆ</p>
              <p className="text-lg sm:text-2xl font-bold text-indigo-600">0 ฿</p>
            </div>
          </div>
          <div className="text-center py-6 sm:py-8 text-gray-500 bg-gray-50 rounded-lg">
            <PackageCheck className="w-10 sm:w-12 h-10 sm:h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium text-sm sm:text-base">ยังไม่มีรายการต้นทุนโฮลเซลล์</p>
            <p className="text-xs sm:text-sm mt-1">Module นี้พร้อมรอการพัฒนา</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProfitTab() {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          สรุปกำไร-ขาดทุน
        </h3>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div className="p-3 sm:p-6 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs sm:text-sm text-gray-600 mb-1">รายได้รวม</p>
              <p className="text-xl sm:text-3xl font-bold text-blue-600">0 ฿</p>
            </div>
            <div className="p-3 sm:p-6 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-xs sm:text-sm text-gray-600 mb-1">ต้นทุนรวม</p>
              <p className="text-xl sm:text-3xl font-bold text-orange-600">0 ฿</p>
            </div>
            <div className="p-3 sm:p-6 bg-green-50 rounded-lg border border-green-200 col-span-2 lg:col-span-1">
              <p className="text-xs sm:text-sm text-gray-600 mb-1">กำไรสุทธิ</p>
              <p className="text-xl sm:text-3xl font-bold text-green-600">0 ฿</p>
            </div>
          </div>

          <div className="space-y-2 sm:space-y-3 bg-gray-50 p-3 sm:p-4 rounded-lg text-xs sm:text-sm">
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span className="text-gray-600">รายได้จากลูกค้า</span>
              <span className="font-medium">0 ฿</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span className="text-gray-600">- ต้นทุนโฮลเซลล์</span>
              <span className="font-medium">0 ฿</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span className="text-gray-600">- ค่าใช้จ่ายอื่นๆ</span>
              <span className="font-medium">0 ฿</span>
            </div>
            <div className="flex justify-between py-2 sm:py-3 border-t-2 border-gray-400">
              <span className="font-semibold text-sm sm:text-lg">= กำไรสุทธิ</span>
              <span className="font-bold text-sm sm:text-lg text-green-600">0 ฿</span>
            </div>
          </div>

          <div className="text-center py-4 text-gray-500">
            <p className="text-xs sm:text-sm">Module นี้พร้อมรอการพัฒนา</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ChecklistTab() {
  const [checklist, setChecklist] = useState([
    { id: 1, label: 'ส่งใบเสนอราคาให้ลูกค้า', checked: true },
    { id: 2, label: 'ได้รับการชำระมัดจำ', checked: false },
    { id: 3, label: 'ชำระเงินให้ Wholesale', checked: false },
    { id: 4, label: 'เก็บ Passport ครบ', checked: false },
    { id: 5, label: 'จองตั๋วเครื่องบิน', checked: false },
    { id: 6, label: 'จองโรงแรม', checked: false },
    { id: 7, label: 'ได้รับการชำระเงินครบ', checked: false },
    { id: 8, label: 'ส่งโปรแกรมให้ลูกค้า', checked: false },
    { id: 9, label: 'ติดต่อไกด์', checked: false },
    { id: 10, label: 'ส่งข้อมูลนักท่องเที่ยวให้ Wholesale', checked: false },
  ]);

  return (
    <Card>
      <CardHeader>
        <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
          <ListChecks className="w-5 h-5" />
          เช็คลิสต์การดำเนินการ
        </h3>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 sm:space-y-3">
          {checklist.map((item) => (
            <div 
              key={item.id} 
              className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => {
                  setChecklist(checklist.map(i => 
                    i.id === item.id ? { ...i, checked: !i.checked } : i
                  ));
                }}
                className="w-4 sm:w-5 h-4 sm:h-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <label className={`flex-1 cursor-pointer text-xs sm:text-sm ${item.checked ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                {item.label}
              </label>
              {item.checked && <CheckCircle className="w-4 sm:w-5 h-4 sm:h-5 text-green-500" />}
            </div>
          ))}
        </div>
        
        <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-700 font-medium text-xs sm:text-sm">ความคืบหน้า</span>
            <span className="font-bold text-blue-600 text-xs sm:text-sm">
              {checklist.filter(i => i.checked).length} / {checklist.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
            <div 
              className="bg-blue-600 h-2 sm:h-3 rounded-full transition-all duration-300"
              style={{ width: `${(checklist.filter(i => i.checked).length / checklist.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="mt-4 text-center text-xs sm:text-sm text-gray-500">
          <p>Module นี้พร้อมใช้งาน - สามารถบันทึกสถานะได้เมื่อเชื่อมต่อ API</p>
        </div>
      </CardContent>
    </Card>
  );
}
