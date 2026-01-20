'use client';

import { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, Pencil, FileText, Calendar, Users, DollarSign,
  Receipt, Wallet, ShoppingCart, TrendingUp, FileCheck, Upload, 
  ListChecks, PackageCheck, Plus, Eye, CheckCircle, Clock, Download,
  Printer, XCircle, Trash2
} from 'lucide-react';
import Link from 'next/link';
import InvoiceModal from '@/components/invoices/invoice-modal';

export default function QuotationDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const [quotation, setQuotation] = useState<any>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceRefreshKey, setInvoiceRefreshKey] = useState(0);

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/quotations">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              กลับ
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard - {quotation.quotationNumber}</h1>
            <p className="text-gray-600">{quotation.tourName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/quotations/${resolvedParams.id}`}>
            <Button variant="outline" size="sm">
              <Eye className="w-4 h-4 mr-2" />
              ดูใบเสนอราคา
            </Button>
          </Link>
          <Link href={`/quotations/${resolvedParams.id}/edit`}>
            <Button size="sm">
              <Pencil className="w-4 h-4 mr-2" />
              แก้ไข
            </Button>
          </Link>
        </div>
      </div>

      {/* Tour Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">ลูกค้า</p>
                <p className="text-lg font-bold truncate">{quotation.customerName}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">วันเดินทาง</p>
                <p className="text-lg font-bold">{quotation.numDays || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">จำนวน PAX</p>
                <p className="text-lg font-bold">{quotation.paxCount} คน</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">ยอดรวม</p>
                <p className="text-lg font-bold">{quotation.grandTotal?.toLocaleString() || '0'} ฿</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-300">
        <div className="flex gap-2 overflow-x-auto pb-px">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-3  font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
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
        {activeTab === 'customer-payment' && <CustomerPaymentTab />}
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
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Info */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5" />
              ข้อมูลลูกค้า
            </h3>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">ชื่อ</p>
              <p className="font-medium">{quotation.customerName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">เบอร์โทร</p>
              <p className="font-medium">{quotation.customerPhone || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">อีเมล</p>
              <p className="font-medium">{quotation.customerEmail || '-'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Financial Status */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              สถานะการเงิน
            </h3>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">ยอดรวมทั้งหมด</span>
              <span className="font-bold">{quotation.grandTotal?.toLocaleString()} ฿</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">ชำระแล้ว</span>
              <span className="font-bold text-green-600">0 ฿</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">คงเหลือ</span>
              <span className="font-bold text-orange-600">{quotation.grandTotal?.toLocaleString()} ฿</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Status */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ListChecks className="w-5 h-5" />
            สถานะดำเนินการ
          </h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex flex-col items-center p-4 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
              <p className="text-sm text-center font-medium">ใบเสนอราคา</p>
              <p className="text-xs text-green-600">เสร็จแล้ว</p>
            </div>
            <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
              <Clock className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-sm text-center font-medium">ใบแจ้งหนี้</p>
              <p className="text-xs text-gray-500">รอดำเนินการ</p>
            </div>
            <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
              <Clock className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-sm text-center font-medium">การชำระเงิน</p>
              <p className="text-xs text-gray-500">รอดำเนินการ</p>
            </div>
            <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
              <Clock className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-sm text-center font-medium">เอกสารครบ</p>
              <p className="text-xs text-gray-500">รอดำเนินการ</p>
            </div>
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
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex items-center justify-between">
        {/* Status */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">สถานะ:</span>
          <select
            value={quotation.status}
            onChange={handleStatusChange}
            disabled={updating}
            className={`px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${currentStatus.textColor} ${updating ? 'opacity-50 cursor-wait' : ''}`}
          >
            {statusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
          {updating && <span className="text-sm text-gray-500">กำลังอัพเดท...</span>}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Link href={`/quotations/${quotationId}`}>
            <Button variant="outline" size="sm">
              <Eye className="w-4 h-4 mr-2" />
              ดูฉบับเต็ม
            </Button>
          </Link>
          <Link href={`/quotations/${quotationId}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="w-4 h-4 mr-2" />
              แก้ไข
            </Button>
          </Link>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Customer & Tour Info */}
        <div className="lg:col-span-1 space-y-4">
          {/* Customer */}
          <Card>
            <CardHeader className="pb-3">
              <h4 className="font-semibold text-purple-700">ข้อมูลลูกค้า</h4>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
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
                  <span className="ml-2">{quotation.customerEmail}</span>
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
            <CardHeader className="pb-3">
              <h4 className="font-semibold text-purple-700">ข้อมูลทัวร์</h4>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
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
            <CardHeader className="pb-3">
              <h4 className="font-semibold text-purple-700">รายการสินค้า/บริการ</h4>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-2 px-4 font-medium">#</th>
                    <th className="text-left py-2 px-4 font-medium">รายการ</th>
                    <th className="text-center py-2 px-4 font-medium">จำนวน</th>
                    <th className="text-right py-2 px-4 font-medium">ราคา</th>
                    <th className="text-right py-2 px-4 font-medium">รวม</th>
                  </tr>
                </thead>
                <tbody>
                  {quotation.items?.map((item: any, index: number) => (
                    <tr key={item.id} className="border-t">
                      <td className="py-2 px-4 text-gray-500">{index + 1}</td>
                      <td className="py-2 px-4">
                        <span className="font-medium">{item.productName}</span>
                        {item.itemType !== 'INCOME' && (
                          <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                            item.itemType === 'DISCOUNT' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {item.itemType === 'DISCOUNT' ? 'ส่วนลด' : 'ฟรี'}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-4 text-center">{item.quantity}</td>
                      <td className="py-2 px-4 text-right">{formatNumber(item.unitPrice)}</td>
                      <td className="py-2 px-4 text-right font-medium">
                        {item.itemType === 'DISCOUNT' ? '-' : ''}{formatNumber(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 bg-gray-50">
                  <tr>
                    <td colSpan={4} className="py-2 px-4 text-right text-gray-600">ยอดรวมก่อนส่วนลด</td>
                    <td className="py-2 px-4 text-right">{formatNumber(quotation.subtotal)}</td>
                  </tr>
                  {quotation.discountAmount > 0 && (
                    <tr>
                      <td colSpan={4} className="py-1 px-4 text-right text-gray-600">ส่วนลด</td>
                      <td className="py-1 px-4 text-right text-red-600">-{formatNumber(quotation.discountAmount)}</td>
                    </tr>
                  )}
                  <tr>
                    <td colSpan={4} className="py-1 px-4 text-right text-gray-600">VAT (7%)</td>
                    <td className="py-1 px-4 text-right">{formatNumber(quotation.vatAmount)}</td>
                  </tr>
                  <tr className="bg-blue-50">
                    <td colSpan={4} className="py-3 px-4 text-right font-semibold">ยอดรวมทั้งหมด</td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-xl font-bold text-blue-600">{formatNumber(quotation.grandTotal)}</span>
                      <span className="text-sm text-gray-500 ml-1">บาท</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>

          {/* Payment Info */}
          <Card className="mt-4">
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-gray-600 text-xs">กำหนดชำระมัดจำ</p>
                  <p className="font-medium">{formatDate(quotation.depositDueDate)}</p>
                  <p className="text-lg font-bold text-yellow-700">{formatNumber(quotation.depositAmount)} ฿</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-gray-600 text-xs">กำหนดชำระเต็มจำนวน</p>
                  <p className="font-medium">{formatDate(quotation.fullPaymentDueDate)}</p>
                  <p className="text-lg font-bold text-green-700">{formatNumber(quotation.fullPaymentAmount)} ฿</p>
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
            <h4 className="font-semibold text-purple-700">หมายเหตุ</h4>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{quotation.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InvoiceTab({ quotation, onCreateInvoice, refreshKey }: { quotation: any; onCreateInvoice: () => void; refreshKey?: number }) {
  const [activeDocType, setActiveDocType] = useState<'invoice' | 'receipt' | 'taxInvoice'>('invoice');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [deletingInvoiceId, setDeletingInvoiceId] = useState<number | null>(null);
  const [hardDeletingInvoiceId, setHardDeletingInvoiceId] = useState<number | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);

  // Invoice status options
  const statusOptions = [
    { value: 'DRAFT', label: 'ฉบับร่าง', color: 'bg-gray-100 text-gray-700 border-gray-300' },
    { value: 'ISSUED', label: 'ออกแล้ว', color: 'bg-blue-100 text-blue-700 border-blue-300' },
    { value: 'PAID', label: 'ชำระแล้ว', color: 'bg-green-100 text-green-700 border-green-300' },
    { value: 'PARTIAL_PAID', label: 'ชำระบางส่วน', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
    { value: 'CANCELLED', label: 'ยกเลิก', color: 'bg-red-100 text-red-700 border-red-300' },
  ];

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
          cancelledById: 1, // TODO: Get from session
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

  const docTypes = [
    { id: 'invoice', label: 'ใบแจ้งหนี้', icon: FileText, color: 'blue' },
    { id: 'receipt', label: 'ใบเสร็จรับเงิน', icon: Receipt, color: 'green' },
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
  const totalPaid = invoices
    .filter(inv => inv.status === 'PAID')
    .reduce((sum, inv) => sum + parseFloat(inv.grandTotal || 0), 0);
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
    const currentStatus = statusOptions.find(s => s.value === invoice.status) || statusOptions[0];
    const isUpdating = updatingStatusId === invoice.id;
    
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
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">ยอดรวมทั้งหมด</p>
              <p className="text-2xl font-bold text-blue-600">{parseFloat(quotation.grandTotal || 0).toLocaleString()} ฿</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">ออกใบแจ้งหนี้แล้ว</p>
              <p className="text-2xl font-bold text-green-600">{totalInvoiced.toLocaleString()} ฿</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">ชำระเงินแล้ว</p>
              <p className="text-2xl font-bold text-emerald-600">{totalPaid.toLocaleString()} ฿</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">คงเหลือ</p>
              <p className="text-2xl font-bold text-orange-600">{remaining.toLocaleString()} ฿</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Document Type Sub-tabs */}
      <div className="flex gap-2 border-b pb-2 border-gray-300">
        {docTypes.map((doc) => {
          const Icon = doc.icon;
          return (
            <button
              key={doc.id}
              onClick={() => setActiveDocType(doc.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium text-sm transition-colors ${
                activeDocType === doc.id
                  ? `bg-${doc.color}-50 text-${doc.color}-700 border-b-2 border-${doc.color}-500`
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {doc.label}
            </button>
          );
        })}
      </div>

      {/* Invoice Section */}
      {activeDocType === 'invoice' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                ใบแจ้งหนี้ (Invoice)
              </h3>
              <Button 
                size="sm" 
                onClick={onCreateInvoice}
                disabled={isFullyInvoiced}
                title={isFullyInvoiced ? 'ออกใบแจ้งหนี้ครบตามยอดใบเสนอราคาแล้ว' : ''}
              >
                <Plus className="w-4 h-4 mr-2" />
                {isFullyInvoiced ? 'ออกใบแจ้งหนี้ครบแล้ว' : 'สร้างใบแจ้งหนี้'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingInvoices ? (
              <div className="text-center py-8 text-gray-500">กำลังโหลด...</div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">ยังไม่มีใบแจ้งหนี้</p>
                <p className="text-sm mt-1">คลิกปุ่ม "สร้างใบแจ้งหนี้" เพื่อเริ่มต้น</p>
                <Button size="sm" className="mt-4" onClick={onCreateInvoice}>
                  <Plus className="w-4 h-4 mr-2" />
                  สร้างใบแจ้งหนี้
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium">เลขที่</th>
                      <th className="text-left py-3 px-4 font-medium">วันที่ออก</th>
                      <th className="text-left py-3 px-4 font-medium">กำหนดชำระ</th>
                      <th className="text-right py-3 px-4 font-medium">จำนวนเงิน</th>
                      <th className="text-center py-3 px-4 font-medium">สถานะ</th>
                      <th className="text-center py-3 px-4 font-medium">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="border-t border-gray-200 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <span className="font-medium text-blue-600">{invoice.invoiceNumber}</span>
                        </td>
                        <td className="py-3 px-4">{formatDate(invoice.invoiceDate)}</td>
                        <td className="py-3 px-4">{formatDate(invoice.dueDate)}</td>
                        <td className="py-3 px-4 text-right font-medium">
                          {parseFloat(invoice.grandTotal || 0).toLocaleString()} ฿
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Receipt Section */}
      {activeDocType === 'receipt' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Receipt className="w-5 h-5 text-green-600" />
                ใบเสร็จรับเงิน (Receipt)
              </h3>
              <Button size="sm" disabled>
                <Plus className="w-4 h-4 mr-2" />
                สร้างใบเสร็จ
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-700">
                <strong>หมายเหตุ:</strong> ใบเสร็จรับเงินต้องสร้างจากใบแจ้งหนี้ที่มีอยู่แล้ว
              </p>
            </div>
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
              <Receipt className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">ยังไม่มีใบเสร็จรับเงิน</p>
              <p className="text-sm mt-1">สร้างใบแจ้งหนี้ก่อน แล้วค่อยออกใบเสร็จ</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tax Invoice Section */}
      {activeDocType === 'taxInvoice' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-purple-600" />
                ใบกำกับภาษี (Tax Invoice)
              </h3>
              <Button size="sm" disabled>
                <Plus className="w-4 h-4 mr-2" />
                สร้างใบกำกับภาษี
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-700">
                <strong>หมายเหตุ:</strong> ใบกำกับภาษีต้องสร้างจากใบแจ้งหนี้ที่มีอยู่แล้ว
              </p>
            </div>
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
              <FileCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">ยังไม่มีใบกำกับภาษี</p>
              <p className="text-sm mt-1">สร้างใบแจ้งหนี้ก่อน แล้วค่อยออกใบกำกับภาษี</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CustomerPaymentTab() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            ระบบจัดการการชำระเงินลูกค้า
          </h3>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            บันทึกการชำระเงิน
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-600 mb-1">ยอดทั้งหมด</p>
              <p className="text-2xl font-bold text-blue-600">0 ฿</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-gray-600 mb-1">ชำระแล้ว</p>
              <p className="text-2xl font-bold text-green-600">0 ฿</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-sm text-gray-600 mb-1">คงเหลือ</p>
              <p className="text-2xl font-bold text-orange-600">0 ฿</p>
            </div>
          </div>
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
            <Wallet className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">ยังไม่มีรายการชำระเงิน</p>
            <p className="text-sm mt-1">Module นี้พร้อมรอการพัฒนา</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function WholesalePaymentTab() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            ระบบจัดการการชำระเงินให้ Wholesale
          </h3>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            บันทึกการชำระ
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
          <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="font-medium">ยังไม่มีรายการชำระเงินให้ Wholesale</p>
          <p className="text-sm mt-2">Module นี้พร้อมรอการพัฒนา</p>
        </div>
      </CardContent>
    </Card>
  );
}

function TaxTab() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileCheck className="w-5 h-5" />
            ระบบจัดการภาษีซื้อ
          </h3>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            เพิ่มใบกำกับภาษี
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
          <FileCheck className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="font-medium">ยังไม่มีใบกำกับภาษีซื้อ</p>
          <p className="text-sm mt-2">Module นี้พร้อมรอการพัฒนา</p>
        </div>
      </CardContent>
    </Card>
  );
}

function CostTab() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            ระบบจัดการต้นทุน
          </h3>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            เพิ่มรายการต้นทุน
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">ต้นทุนทั้งหมด</span>
              <span className="text-2xl font-bold text-purple-600">0 ฿</span>
            </div>
          </div>
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
            <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">ยังไม่มีรายการต้นทุน</p>
            <p className="text-sm mt-1">Module นี้พร้อมรอการพัฒนา</p>
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
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Upload className="w-5 h-5" />
            ระบบจัดเก็บเอกสาร
          </h3>
          <Button size="sm">
            <Upload className="w-4 h-4 mr-2" />
            อัปโหลดเอกสาร
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-center">
              <FileText className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <p className="text-sm font-medium">Passport</p>
              <p className="text-xs text-gray-500">0 ไฟล์</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200 text-center">
              <FileText className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <p className="text-sm font-medium">Visa</p>
              <p className="text-xs text-gray-500">0 ไฟล์</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200 text-center">
              <FileText className="w-8 h-8 mx-auto mb-2 text-purple-600" />
              <p className="text-sm font-medium">ใบแจ้งหนี้</p>
              <p className="text-xs text-gray-500">0 ไฟล์</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200 text-center">
              <FileText className="w-8 h-8 mx-auto mb-2 text-orange-600" />
              <p className="text-sm font-medium">อื่นๆ</p>
              <p className="text-xs text-gray-500">0 ไฟล์</p>
            </div>
          </div>
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
            <Upload className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="font-medium">ยังไม่มีเอกสาร</p>
            <p className="text-sm mt-2">Module นี้พร้อมรอการพัฒนา</p>
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
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <PackageCheck className="w-5 h-5" />
            รายการต้นทุนโฮลเซลล์
          </h3>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            เพิ่มรายการ
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm text-gray-600 mb-1">ต้นทุนโฮลเซลล์</p>
              <p className="text-2xl font-bold text-purple-600">0 ฿</p>
            </div>
            <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
              <p className="text-sm text-gray-600 mb-1">ค่าใช้จ่ายอื่นๆ</p>
              <p className="text-2xl font-bold text-indigo-600">0 ฿</p>
            </div>
          </div>
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
            <PackageCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">ยังไม่มีรายการต้นทุนโฮลเซลล์</p>
            <p className="text-sm mt-1">Module นี้พร้อมรอการพัฒนา</p>
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
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          สรุปกำไร-ขาดทุน
        </h3>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-600 mb-1">รายได้รวม</p>
              <p className="text-3xl font-bold text-blue-600">0 ฿</p>
            </div>
            <div className="p-6 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-sm text-gray-600 mb-1">ต้นทุนรวม</p>
              <p className="text-3xl font-bold text-orange-600">0 ฿</p>
            </div>
            <div className="p-6 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-gray-600 mb-1">กำไรสุทธิ</p>
              <p className="text-3xl font-bold text-green-600">0 ฿</p>
            </div>
          </div>

          <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
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
            <div className="flex justify-between py-3 border-t-2 border-gray-400">
              <span className="font-semibold text-lg">= กำไรสุทธิ</span>
              <span className="font-bold text-lg text-green-600">0 ฿</span>
            </div>
          </div>

          <div className="text-center py-4 text-gray-500">
            <p className="text-sm">Module นี้พร้อมรอการพัฒนา</p>
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
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ListChecks className="w-5 h-5" />
          เช็คลิสต์การดำเนินการ
        </h3>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {checklist.map((item) => (
            <div 
              key={item.id} 
              className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => {
                  setChecklist(checklist.map(i => 
                    i.id === item.id ? { ...i, checked: !i.checked } : i
                  ));
                }}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <label className={`flex-1 cursor-pointer ${item.checked ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                {item.label}
              </label>
              {item.checked && <CheckCircle className="w-5 h-5 text-green-500" />}
            </div>
          ))}
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-700 font-medium">ความคืบหน้า</span>
            <span className="font-bold text-blue-600">
              {checklist.filter(i => i.checked).length} / {checklist.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${(checklist.filter(i => i.checked).length / checklist.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="mt-4 text-center text-sm text-gray-500">
          <p>Module นี้พร้อมใช้งาน - สามารถบันทึกสถานะได้เมื่อเชื่อมต่อ API</p>
        </div>
      </CardContent>
    </Card>
  );
}
