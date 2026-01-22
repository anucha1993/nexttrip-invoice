'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  RefreshCw, 
  User, 
  FileText, 
  DollarSign,
  Loader2,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useCurrentUser } from '@/contexts/AuthContext';

interface Customer {
  id: string;
  code: string;
  name: string;
  phone: string | null;
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  grandTotal: number;
  paidAmount: number;
  refundedAmount: number;
  status: string;
  quotationId: number;
  quotationNumber: string;
  tourName: string;
  customerName: string;
  customerId: string;
}

interface Bank {
  id: number;
  name: string;
  shortName: string;
  logo: string | null;
}

export default function CreateRefundPage() {
  const router = useRouter();
  const { userId, userName } = useCurrentUser();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Step control
  const [step, setStep] = useState(1);

  // Customer selection
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Invoice selection
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Refund form
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundMethod, setRefundMethod] = useState('TRANSFER');
  const [refundDate, setRefundDate] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Bank related
  const [banks, setBanks] = useState<Bank[]>([]);
  const [chequeBankId, setChequeBankId] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeDate, setChequeDate] = useState('');

  // Slip upload
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomers();
    fetchBanks();
    setRefundDate(getLocalDateTimeString());
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      fetchCustomerInvoices(selectedCustomer.id);
    } else {
      setInvoices([]);
      setSelectedInvoice(null);
    }
  }, [selectedCustomer]);

  useEffect(() => {
    if (selectedInvoice) {
      // Set max refundable amount
      const refundable = Math.max(0, (selectedInvoice.paidAmount || 0) - (selectedInvoice.refundedAmount || 0));
      setRefundAmount(refundable.toFixed(2));
    }
  }, [selectedInvoice]);

  const getLocalDateTimeString = (date?: Date | string): string => {
    const d = date ? new Date(date) : new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers');
      if (response.ok) {
        const data = await response.json();
        const customerList = Array.isArray(data) ? data : (data.data || []);
        setCustomers(customerList);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchCustomerInvoices = async (customerId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/invoices?customerId=${customerId}&limit=100`);
      if (response.ok) {
        const data = await response.json();
        const invoiceList = data.invoices || data.data || [];
        // Filter invoices with paid amount that can be refunded (exclude DRAFT, CANCELLED, VOIDED)
        const refundableInvoices = invoiceList.filter((inv: Invoice) => {
          const refundable = (inv.paidAmount || 0) - (inv.refundedAmount || 0);
          return refundable > 0.01 && inv.status !== 'DRAFT' && inv.status !== 'CANCELLED' && inv.status !== 'VOIDED';
        });
        setInvoices(refundableInvoices);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBanks = async () => {
    try {
      const response = await fetch('/api/banks');
      if (response.ok) {
        const data = await response.json();
        setBanks(data.banks || data || []);
      }
    } catch (error) {
      console.error('Error fetching banks:', error);
    }
  };

  const handleSlipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSlipFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setSlipPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone?.includes(customerSearch) ||
    c.code.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch(customer.name);
    setShowCustomerDropdown(false);
    setSelectedInvoice(null);
    setStep(2);
  };

  const handleSelectInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setStep(3);
  };

  const handleSubmit = async () => {
    if (!selectedInvoice || !refundAmount || !refundReason) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    const amount = parseFloat(refundAmount);
    const maxRefundable = (selectedInvoice.paidAmount || 0) - (selectedInvoice.refundedAmount || 0);
    
    if (isNaN(amount) || amount <= 0) {
      alert('กรุณาระบุจำนวนเงินที่ถูกต้อง');
      return;
    }

    if (amount > maxRefundable) {
      alert(`ยอดคืนเงินต้องไม่เกินยอดที่คืนได้ (${maxRefundable.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿)`);
      return;
    }

    setSubmitting(true);

    try {
      // Upload slip if exists
      let slipUrl = null;
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
          slipUrl = uploadData.url;
        }
      }

      const response = await fetch('/api/customer-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionType: 'REFUND',
          invoiceId: selectedInvoice.id,
          quotationId: selectedInvoice.quotationId,
          amount,
          paymentMethod: refundMethod,
          paymentDate: refundDate,
          slipUrl,
          referenceNumber,
          notes,
          refundReason,
          chequeNumber: refundMethod === 'CHEQUE' ? chequeNumber : null,
          chequeDate: refundMethod === 'CHEQUE' ? chequeDate : null,
          chequeBankId: refundMethod === 'CHEQUE' ? chequeBankId : null,
          createdById: userId,
          createdByName: userName,
        }),
      });

      if (response.ok) {
        alert('บันทึกคืนเงินสำเร็จ');
        router.push('/finance/payments');
      } else {
        const error = await response.json();
        alert(error.error || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      console.error('Error creating refund:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกคืนเงิน');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/finance/payments">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            กลับ
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg shadow-red-500/25">
              <RefreshCw className="w-6 h-6 text-white" />
            </div>
            บันทึกคืนเงิน
          </h1>
          <p className="text-gray-500 mt-1 ml-12">บันทึกการคืนเงินให้ลูกค้า (ออกใบลดหนี้อัตโนมัติ)</p>
        </div>
      </div>

      {/* Warning */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-red-900 mb-1">⚠️ การคืนเงิน</h3>
          <p className="text-sm text-red-700">
            การบันทึกคืนเงินจะออกใบลดหนี้ (Credit Note) อัตโนมัติ กรุณาตรวจสอบข้อมูลให้ถูกต้องก่อนบันทึก
          </p>
        </div>
      </div>

      {/* Steps */}
      <div className="flex items-center justify-center gap-4">
        <div className={`flex items-center gap-2 ${step >= 1 ? 'text-red-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-red-600 text-white' : 'bg-gray-200'}`}>
            {step > 1 ? <CheckCircle className="w-5 h-5" /> : '1'}
          </div>
          <span className="font-medium">เลือกลูกค้า</span>
        </div>
        <div className={`w-12 h-0.5 ${step >= 2 ? 'bg-red-600' : 'bg-gray-200'}`} />
        <div className={`flex items-center gap-2 ${step >= 2 ? 'text-red-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-red-600 text-white' : 'bg-gray-200'}`}>
            {step > 2 ? <CheckCircle className="w-5 h-5" /> : '2'}
          </div>
          <span className="font-medium">เลือกใบแจ้งหนี้</span>
        </div>
        <div className={`w-12 h-0.5 ${step >= 3 ? 'bg-red-600' : 'bg-gray-200'}`} />
        <div className={`flex items-center gap-2 ${step >= 3 ? 'text-red-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-red-600 text-white' : 'bg-gray-200'}`}>
            3
          </div>
          <span className="font-medium">กรอกข้อมูลคืนเงิน</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Select Customer */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-2 font-semibold">
                <User className="w-5 h-5 text-red-600" />
                ขั้นตอนที่ 1: เลือกลูกค้า
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Input
                  placeholder="ค้นหาลูกค้า (ชื่อ, รหัส, เบอร์โทร)..."
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerDropdown(true);
                    if (selectedCustomer && e.target.value !== selectedCustomer.name) {
                      setSelectedCustomer(null);
                      setStep(1);
                    }
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                />
                {showCustomerDropdown && customerSearch && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                    {filteredCustomers.length === 0 ? (
                      <div className="p-3 text-sm text-gray-500">ไม่พบลูกค้า</div>
                    ) : (
                      filteredCustomers.slice(0, 10).map(customer => (
                        <div
                          key={customer.id}
                          className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                          onClick={() => handleSelectCustomer(customer)}
                        >
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-sm text-gray-500">
                            {customer.code} {customer.phone && `• ${customer.phone}`}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              {selectedCustomer && (
                <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center gap-2 text-red-700">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">{selectedCustomer.name}</span>
                    <span className="text-sm text-red-600">({selectedCustomer.code})</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Select Invoice */}
          {step >= 2 && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-2 font-semibold">
                  <FileText className="w-5 h-5 text-red-600" />
                  ขั้นตอนที่ 2: เลือกใบแจ้งหนี้ที่ต้องการคืนเงิน
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                  </div>
                ) : invoices.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>ไม่พบใบแจ้งหนี้ที่มียอดชำระแล้ว</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {invoices.map(invoice => {
                      const refundable = (invoice.paidAmount || 0) - (invoice.refundedAmount || 0);
                      const isSelected = selectedInvoice?.id === invoice.id;
                      return (
                        <div
                          key={invoice.id}
                          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            isSelected 
                              ? 'border-red-500 bg-red-50' 
                              : 'border-gray-200 hover:border-red-300 hover:bg-gray-50'
                          }`}
                          onClick={() => handleSelectInvoice(invoice)}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium text-gray-900">{invoice.invoiceNumber}</div>
                              <div className="text-sm text-gray-500">{invoice.tourName}</div>
                              <div className="text-xs text-gray-400 mt-1">{invoice.quotationNumber}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-gray-500">ยอดที่คืนได้</div>
                              <div className="font-bold text-red-600">
                                ฿{refundable.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                              </div>
                              <div className="text-xs text-gray-400">
                                ชำระแล้ว ฿{(invoice.paidAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Refund Form */}
          {step >= 3 && selectedInvoice && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-2 font-semibold">
                  <DollarSign className="w-5 h-5 text-red-600" />
                  ขั้นตอนที่ 3: กรอกข้อมูลคืนเงิน
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">ยอดคืนเงิน *</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      สูงสุด: ฿{((selectedInvoice.paidAmount || 0) - (selectedInvoice.refundedAmount || 0)).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">วิธีคืนเงิน</label>
                    <select
                      className="w-full border rounded-lg px-3 py-2"
                      value={refundMethod}
                      onChange={(e) => setRefundMethod(e.target.value)}
                    >
                      <option value="CASH">เงินสด</option>
                      <option value="TRANSFER">โอนเงิน</option>
                      <option value="CHEQUE">เช็ค</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">เหตุผลในการคืนเงิน *</label>
                  <textarea
                    className="w-full border rounded-lg px-3 py-2"
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    rows={2}
                    placeholder="ระบุเหตุผลในการคืนเงิน..."
                  />
                </div>

                {/* Cheque fields */}
                {refundMethod === 'CHEQUE' && (
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">ธนาคาร</label>
                      <select
                        className="w-full border rounded-lg px-3 py-2"
                        value={chequeBankId}
                        onChange={(e) => setChequeBankId(e.target.value)}
                      >
                        <option value="">-- เลือก --</option>
                        {banks.map(bank => (
                          <option key={bank.id} value={bank.id}>{bank.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">เลขที่เช็ค</label>
                      <Input
                        value={chequeNumber}
                        onChange={(e) => setChequeNumber(e.target.value)}
                        placeholder="เลขที่เช็ค"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">วันที่เช็ค</label>
                      <Input
                        type="date"
                        value={chequeDate}
                        onChange={(e) => setChequeDate(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">วันที่และเวลาคืนเงิน</label>
                  <Input
                    type="datetime-local"
                    value={refundDate}
                    onChange={(e) => setRefundDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">แนบหลักฐานการคืนเงิน</label>
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
                  <label className="block text-sm font-medium mb-1">เลขอ้างอิง</label>
                  <Input
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="เลขอ้างอิง (ถ้ามี)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">หมายเหตุ</label>
                  <textarea
                    className="w-full border rounded-lg px-3 py-2"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Summary */}
        <div className="space-y-6">
          {selectedInvoice && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-2 font-semibold">
                  <FileText className="w-5 h-5" />
                  สรุปข้อมูล
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm text-gray-500">ใบแจ้งหนี้</div>
                  <div className="font-medium">{selectedInvoice.invoiceNumber}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">ลูกค้า</div>
                  <div className="font-medium">{selectedCustomer?.name}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">ทัวร์</div>
                  <div className="font-medium">{selectedInvoice.tourName}</div>
                </div>
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">ยอดใบแจ้งหนี้</span>
                    <span>฿{selectedInvoice.grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">ชำระแล้ว</span>
                    <span className="text-green-600">
                      ฿{(selectedInvoice.paidAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {(selectedInvoice.refundedAmount || 0) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">คืนเงินแล้ว</span>
                      <span className="text-red-600">
                        -฿{(selectedInvoice.refundedAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>ยอดที่คืนได้</span>
                    <span className="text-red-600">
                      ฿{Math.max(0, (selectedInvoice.paidAmount || 0) - (selectedInvoice.refundedAmount || 0)).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                
                {refundAmount && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="text-sm text-red-600">จำนวนเงินที่จะคืน</div>
                    <div className="text-2xl font-bold text-red-700">
                      ฿{parseFloat(refundAmount || '0').toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                )}

                <Button
                  className="w-full bg-red-600 hover:bg-red-700"
                  size="lg"
                  onClick={handleSubmit}
                  disabled={submitting || !refundAmount || parseFloat(refundAmount) <= 0 || !refundReason}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      กำลังบันทึก...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      บันทึกคืนเงิน
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
