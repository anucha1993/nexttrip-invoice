'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, Pencil, FileText, Calendar, Users, DollarSign,
  Receipt, Wallet, ShoppingCart, TrendingUp, FileCheck, Upload, 
  ListChecks, PackageCheck, Plus, Eye, CheckCircle, Clock, AlertCircle
} from 'lucide-react';
import Link from 'next/link';

export default function QuotationDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [quotation, setQuotation] = useState<any>(null);

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
    { id: 'invoice', label: 'ใบแจ้งหนี้', icon: Receipt },
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
            <h1 className="text-2xl font-bold text-gray-900">{quotation.quotationNumber}</h1>
            <p className="text-gray-600">{quotation.tourName}</p>
          </div>
        </div>
        <Link href={`/quotations/${resolvedParams.id}/edit`}>
          <Button>
            <Pencil className="w-4 h-4 mr-2" />
            แก้ไข
          </Button>
        </Link>
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
                <p className="text-lg font-bold">{quotation.customerName}</p>
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
      <div className="border-b border-gray-200">
        <div className="flex gap-2 overflow-x-auto pb-px">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
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
        {activeTab === 'quotation' && <QuotationTab quotation={quotation} />}
        {activeTab === 'invoice' && <InvoiceTab />}
        {activeTab === 'customer-payment' && <CustomerPaymentTab />}
        {activeTab === 'wholesale-payment' && <WholesalePaymentTab />}
        {activeTab === 'tax' && <TaxTab />}
        {activeTab === 'cost' && <CostTab />}
        {activeTab === 'documents' && <DocumentsTab />}
        {activeTab === 'wholesale-cost' && <WholesaleCostTab />}
        {activeTab === 'profit' && <ProfitTab />}
        {activeTab === 'checklist' && <ChecklistTab />}
      </div>
    </div>
  );
}

// Tab Components (UI Only)

function OverviewTab({ quotation }: { quotation: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">ข้อมูลลูกค้า</h3>
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

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">สถานะการเงิน</h3>
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

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">สถานะดำเนินการ</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
              <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
              <p className="text-sm text-center">ใบเสนอราคา</p>
              <p className="text-xs text-green-600">เสร็จแล้ว</p>
            </div>
            <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
              <Clock className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-sm text-center">ใบแจ้งหนี้</p>
              <p className="text-xs text-gray-500">รอดำเนินการ</p>
            </div>
            <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
              <Clock className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-sm text-center">การชำระเงิน</p>
              <p className="text-xs text-gray-500">รอดำเนินการ</p>
            </div>
            <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
              <Clock className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-sm text-center">เอกสารครบ</p>
              <p className="text-xs text-gray-500">รอดำเนินการ</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function QuotationTab({ quotation }: { quotation: any }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">ใบเสนอราคา</h3>
          <Button size="sm" variant="outline">
            <Eye className="w-4 h-4 mr-2" />
            ดูใบเสนอราคา
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">ใบเสนอราคาที่มีอยู่แล้ว - เชื่อมโยงกับหน้าดูรายละเอียดเดิม</p>
      </CardContent>
    </Card>
  );
}

function InvoiceTab() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">ใบแจ้งหนี้</h3>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            สร้างใบแจ้งหนี้
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12 text-gray-500">
          <Receipt className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p>ยังไม่มีใบแจ้งหนี้</p>
          <p className="text-sm">กดปุ่มด้านบนเพื่อสร้างใบแจ้งหนี้</p>
        </div>
      </CardContent>
    </Card>
  );
}

function CustomerPaymentTab() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">การชำระเงินลูกค้า</h3>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            บันทึกการชำระเงิน
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">ยอดทั้งหมด</p>
              <p className="text-2xl font-bold text-blue-600">0 ฿</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">ชำระแล้ว</p>
              <p className="text-2xl font-bold text-green-600">0 ฿</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">คงเหลือ</p>
              <p className="text-2xl font-bold text-orange-600">0 ฿</p>
            </div>
          </div>
          <div className="text-center py-8 text-gray-500">
            <Wallet className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>ยังไม่มีรายการชำระเงิน</p>
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
          <h3 className="text-lg font-semibold">ชำระเงินให้ Wholesale</h3>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            บันทึกการชำระ
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12 text-gray-500">
          <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p>ยังไม่มีรายการชำระเงินให้ Wholesale</p>
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
          <h3 className="text-lg font-semibold">ภาษีซื้อ</h3>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            เพิ่มใบกำกับภาษี
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12 text-gray-500">
          <FileCheck className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p>ยังไม่มีใบกำกับภาษีซื้อ</p>
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
          <h3 className="text-lg font-semibold">ต้นทุน</h3>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            เพิ่มรายการต้นทุน
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">ต้นทุนทั้งหมด</span>
              <span className="text-2xl font-bold">0 ฿</span>
            </div>
          </div>
          <div className="text-center py-8 text-gray-500">
            <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>ยังไม่มีรายการต้นทุน</p>
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
          <h3 className="text-lg font-semibold">เอกสาร (Passport, Visa, etc.)</h3>
          <Button size="sm">
            <Upload className="w-4 h-4 mr-2" />
            อัปโหลดเอกสาร
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12 text-gray-500">
          <Upload className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p>ยังไม่มีเอกสาร</p>
          <p className="text-sm">อัปโหลด Passport, Visa และเอกสารอื่นๆ</p>
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
          <h3 className="text-lg font-semibold">รายการต้นทุนโฮลเซลล์</h3>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            เพิ่มรายการ
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">ต้นทุนโฮลเซลล์</p>
              <p className="text-2xl font-bold text-purple-600">0 ฿</p>
            </div>
            <div className="p-4 bg-indigo-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">ค่าใช้จ่ายอื่นๆ</p>
              <p className="text-2xl font-bold text-indigo-600">0 ฿</p>
            </div>
          </div>
          <div className="text-center py-8 text-gray-500">
            <PackageCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>ยังไม่มีรายการต้นทุนโฮลเซลล์</p>
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
        <h3 className="text-lg font-semibold">สรุปกำไร-ขาดทุน</h3>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">รายได้รวม</p>
              <p className="text-3xl font-bold text-blue-600">0 ฿</p>
            </div>
            <div className="p-6 bg-orange-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">ต้นทุนรวม</p>
              <p className="text-3xl font-bold text-orange-600">0 ฿</p>
            </div>
            <div className="p-6 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">กำไรสุทธิ</p>
              <p className="text-3xl font-bold text-green-600">0 ฿</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">รายได้จากลูกค้า</span>
              <span className="font-medium">0 ฿</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">ต้นทุนโฮลเซลล์</span>
              <span className="font-medium">0 ฿</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">ค่าใช้จ่ายอื่นๆ</span>
              <span className="font-medium">0 ฿</span>
            </div>
            <div className="flex justify-between py-3 border-t-2 border-gray-300">
              <span className="font-semibold text-lg">กำไรสุทธิ</span>
              <span className="font-bold text-lg text-green-600">0 ฿</span>
            </div>
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
        <h3 className="text-lg font-semibold">เช็คลิสต์การดำเนินการ</h3>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {checklist.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
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
              <label className={`flex-1 cursor-pointer ${item.checked ? 'line-through text-gray-400' : ''}`}>
                {item.label}
              </label>
              {item.checked && <CheckCircle className="w-5 h-5 text-green-500" />}
            </div>
          ))}
        </div>
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-gray-700">ความคืบหน้า</span>
            <span className="font-bold text-blue-600">
              {checklist.filter(i => i.checked).length} / {checklist.length}
            </span>
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${(checklist.filter(i => i.checked).length / checklist.length) * 100}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
