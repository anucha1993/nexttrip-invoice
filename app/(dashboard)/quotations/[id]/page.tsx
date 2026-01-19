'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, Pencil, Trash2, FileText, User, Plane, Calendar, 
  DollarSign, Users, Building, Phone, Mail, MapPin, Clock,
  CheckCircle, XCircle, Copy, Printer, CreditCard, Receipt,
  Wallet, ShoppingCart, TrendingUp, FileCheck, Upload, ListChecks,
  PackageCheck, AlertCircle, Download, Plus, Eye
} from 'lucide-react';
import Link from 'next/link';

interface QuotationItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  itemType: 'INCOME' | 'DISCOUNT' | 'FREE';
  vatType: string;
}

interface Quotation {
  id: string;
  quotationNumber: string;
  tourName: string;
  tourCode: string | null;
  departureDate: string | null;
  returnDate: string | null;
  numDays: string | null;
  paxCount: number;
  quotationDate: string;
  validUntil: string | null;
  depositDueDate: string | null;
  depositAmount: number;
  fullPaymentDueDate: string | null;
  fullPaymentAmount: number;
  subtotal: number;
  discountAmount: number;
  vatAmount: number;
  grandTotal: number;
  status: string;
  paymentStatus: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  // Customer
  customerName: string;
  customerCode: string;
  customerPhone: string | null;
  customerEmail: string | null;
  customerTaxId: string | null;
  customerAddress: string | null;
  customerSource: string | null;
  customerSocialId: string | null;
  // Sale
  saleName: string | null;
  // Wholesale
  wholesaleName: string | null;
  wholesaleCode: string | null;
  // Country
  countryName: string | null;
  countryCode: string | null;
  // Airline
  airlineName: string | null;
  airlineCode: string | null;
  // Created By
  createdByName: string | null;
  // Items
  items: QuotationItem[];
}

const statusLabels: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  DRAFT: { label: 'ร่าง', color: 'bg-gray-100 text-gray-700 border-gray-300', icon: FileText },
  PENDING: { label: 'รอดำเนินการ', color: 'bg-yellow-100 text-yellow-700 border-yellow-300', icon: Clock },
  CONFIRMED: { label: 'ยืนยันแล้ว', color: 'bg-green-100 text-green-700 border-green-300', icon: CheckCircle },
  CANCELLED: { label: 'ยกเลิก', color: 'bg-red-100 text-red-700 border-red-300', icon: XCircle },
  COMPLETED: { label: 'เสร็จสิ้น', color: 'bg-blue-100 text-blue-700 border-blue-300', icon: CheckCircle },
};

const paymentStatusLabels: Record<string, { label: string; color: string }> = {
  UNPAID: { label: 'ยังไม่ชำระ', color: 'bg-gray-100 text-gray-700' },
  DEPOSIT: { label: 'ชำระมัดจำแล้ว', color: 'bg-yellow-100 text-yellow-700' },
  PARTIAL: { label: 'ชำระบางส่วน', color: 'bg-orange-100 text-orange-700' },
  PAID: { label: 'ชำระครบแล้ว', color: 'bg-green-100 text-green-700' },
  REFUNDED: { label: 'คืนเงินแล้ว', color: 'bg-red-100 text-red-700' },
};

export default function ViewQuotationPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    fetchQuotation();
  }, [resolvedParams.id]);

  const fetchQuotation = async () => {
    try {
      const response = await fetch(`/api/quotations/${resolvedParams.id}`);
      if (response.ok) {
        const data = await response.json();
        setQuotation(data);
      } else {
        router.push('/quotations');
      }
    } catch (error) {
      console.error('Error fetching quotation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/quotations/${resolvedParams.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        router.push('/quotations');
      }
    } catch (error) {
      console.error('Error deleting quotation:', error);
    } finally {
      setDeleting(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
        <div className="text-gray-500">ไม่พบข้อมูลใบเสนอราคา</div>
      </div>
    );
  }

  const statusInfo = statusLabels[quotation.status];
  const StatusIcon = statusInfo?.icon || FileText;
  const paymentInfo = paymentStatusLabels[quotation.paymentStatus];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/quotations">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              กลับ
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{quotation.quotationNumber}</h1>
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${statusInfo?.color}`}>
                <StatusIcon className="w-4 h-4" />
                {statusInfo?.label}
              </span>
            </div>
            <p className="text-gray-600">ออกเมื่อ {formatDate(quotation.quotationDate)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Copy className="w-4 h-4 mr-2" />
            คัดลอก
          </Button>
          <Button variant="outline" size="sm">
            <Printer className="w-4 h-4 mr-2" />
            พิมพ์
          </Button>
          <Link href={`/quotations/${resolvedParams.id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="w-4 h-4 mr-2" />
              แก้ไข
            </Button>
          </Link>
          <Button 
            variant="destructive" 
            size="sm"
            onClick={() => setShowDeleteModal(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            ลบ
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 font-semibold text-purple-700">
                <User className="w-5 h-5" />
                ข้อมูลลูกค้า
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">รหัสลูกค้า</p>
                    <p className="font-medium">{quotation.customerCode}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">ชื่อลูกค้า</p>
                    <p className="font-medium">{quotation.customerName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">เลขประจำตัวผู้เสียภาษี</p>
                    <p className="font-medium">{quotation.customerTaxId || '-'}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{quotation.customerPhone || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span>{quotation.customerEmail || '-'}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                    <span className="text-sm">{quotation.customerAddress || '-'}</span>
                  </div>
                </div>
              </div>
              {(quotation.customerSource || quotation.customerSocialId) && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-500">ที่มา</p>
                  <p className="font-medium">
                    {quotation.customerSource && <span>{quotation.customerSource}</span>}
                    {quotation.customerSource && quotation.customerSocialId && ' : '}
                    {quotation.customerSocialId && <span>{quotation.customerSocialId}</span>}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tour Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 font-semibold text-purple-700">
                <Plane className="w-5 h-5" />
                รายละเอียดแพ็คเกจ
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">ชื่อแพ็คเกจทัวร์</p>
                    <p className="font-medium">{quotation.tourName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">รหัสทัวร์</p>
                    <p className="font-medium">{quotation.tourCode || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">พนักงานขาย</p>
                    <p className="font-medium">{quotation.saleName || '-'}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">สายการบิน</p>
                    <p className="font-medium">{quotation.airlineName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">โฮลเซลล์</p>
                    <p className="font-medium">{quotation.wholesaleName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">ประเทศ</p>
                    <p className="font-medium">{quotation.countryName || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">วันเดินทาง</p>
                  <p className="font-medium">
                    {quotation.departureDate && quotation.returnDate ? (
                      <>
                        {formatDate(quotation.departureDate)} - {formatDate(quotation.returnDate)}
                        <span className="text-sm text-gray-500 ml-2">({quotation.numDays})</span>
                      </>
                    ) : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">จำนวนผู้เดินทาง</p>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">{quotation.paxCount} ท่าน</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 font-semibold text-purple-700">
                <DollarSign className="w-5 h-5" />
                รายการสินค้า/บริการ
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium">#</th>
                    <th className="text-left py-3 px-4 font-medium">รายการ</th>
                    <th className="text-center py-3 px-4 font-medium">จำนวน</th>
                    <th className="text-right py-3 px-4 font-medium">ราคา/หน่วย</th>
                    <th className="text-right py-3 px-4 font-medium">รวม</th>
                  </tr>
                </thead>
                <tbody>
                  {quotation.items.map((item, index) => (
                    <tr key={item.id} className="border-t">
                      <td className="py-3 px-4 text-gray-500">{index + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-medium">{item.productName}</div>
                        {item.itemType !== 'INCOME' && (
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            item.itemType === 'DISCOUNT' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {item.itemType === 'DISCOUNT' ? 'ส่วนลด' : 'ฟรี'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">{item.quantity}</td>
                      <td className="py-3 px-4 text-right">{formatNumber(item.unitPrice)}</td>
                      <td className="py-3 px-4 text-right font-medium">
                        {item.itemType === 'DISCOUNT' ? '-' : ''}{formatNumber(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2">
                  <tr>
                    <td colSpan={4} className="py-3 px-4 text-right text-gray-600">ยอดรวมก่อนส่วนลด</td>
                    <td className="py-3 px-4 text-right">{formatNumber(quotation.subtotal)}</td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="py-2 px-4 text-right text-gray-600">ส่วนลด</td>
                    <td className="py-2 px-4 text-right text-red-600">-{formatNumber(quotation.discountAmount)}</td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="py-2 px-4 text-right text-gray-600">ภาษีมูลค่าเพิ่ม (7%)</td>
                    <td className="py-2 px-4 text-right">{formatNumber(quotation.vatAmount)}</td>
                  </tr>
                  <tr className="bg-blue-50">
                    <td colSpan={4} className="py-4 px-4 text-right font-semibold text-lg">ยอดรวมทั้งหมด</td>
                    <td className="py-4 px-4 text-right">
                      <span className="text-2xl font-bold text-blue-600">{formatNumber(quotation.grandTotal)}</span>
                      <span className="text-sm text-gray-500 ml-1">บาท</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>

          {/* Notes */}
          {quotation.notes && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 font-semibold text-purple-700">
                  <FileText className="w-5 h-5" />
                  หมายเหตุ
                </div>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{quotation.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 font-semibold text-purple-700">
                <CreditCard className="w-5 h-5" />
                ข้อมูลการชำระเงิน
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">สถานะการชำระ</p>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${paymentInfo?.color}`}>
                  {paymentInfo?.label}
                </span>
              </div>

              <div className="space-y-3 pt-3 border-t">
                <div>
                  <p className="text-sm text-gray-500">กำหนดชำระมัดจำ</p>
                  <p className="font-medium">{formatDate(quotation.depositDueDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">จำนวนเงินมัดจำ</p>
                  <p className="font-medium text-lg">{formatNumber(quotation.depositAmount)} บาท</p>
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t">
                <div>
                  <p className="text-sm text-gray-500">กำหนดชำระเต็มจำนวน</p>
                  <p className="font-medium">{formatDate(quotation.fullPaymentDueDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">จำนวนเงินเต็มจำนวน</p>
                  <p className="font-medium text-lg">{formatNumber(quotation.fullPaymentAmount)} บาท</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 font-semibold text-purple-700">
                <Building className="w-5 h-5" />
                การจัดการ
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <Copy className="w-4 h-4 mr-2" />
                คัดลอกใบเสนอราคา
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <CreditCard className="w-4 h-4 mr-2" />
                บันทึกการชำระเงิน
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <FileText className="w-4 h-4 mr-2" />
                สร้างใบแจ้งหนี้
              </Button>
            </CardContent>
          </Card>

          {/* Document Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 font-semibold text-purple-700">
                <Calendar className="w-5 h-5" />
                ข้อมูลเอกสาร
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">สร้างเมื่อ</span>
                <span>{formatDateTime(quotation.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">แก้ไขล่าสุด</span>
                <span>{formatDateTime(quotation.updatedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">สร้างโดย</span>
                <span>{quotation.createdByName || '-'}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowDeleteModal(false)} />
          <div className="relative bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">ยืนยันการลบ</h3>
            <p className="text-gray-600 mb-4">
              คุณต้องการลบใบเสนอราคา <strong>{quotation.quotationNumber}</strong> หรือไม่? 
              การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
                ยกเลิก
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'กำลังลบ...' : 'ลบ'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
