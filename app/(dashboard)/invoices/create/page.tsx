'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText, Save, User, Calendar, DollarSign, Loader2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import Link from 'next/link';

interface Customer {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  taxId: string | null;
  address: string | null;
}

interface Quotation {
  id: number;
  quotationNumber: string;
  tourName: string;
  grandTotal: number;
  paxCount: number;
  departureDate: string;
  returnDate: string;
  status: string;
  remainingAmount?: number;
  totalInvoiced?: number;
}

interface InvoiceItem {
  productId: number | null;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export default function CreateInvoicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [quotationSearch, setQuotationSearch] = useState('');
  const [showQuotationDropdown, setShowQuotationDropdown] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [vatAmount, setVatAmount] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const [previousInvoiced, setPreviousInvoiced] = useState(0);
  const [priceAdjusted, setPriceAdjusted] = useState(false);
  const [adjustmentInfo, setAdjustmentInfo] = useState({ originalTotal: 0, adjustedTotal: 0 });

  useEffect(() => {
    fetchCustomers();
    fetchNextInvoiceNumber();
  }, []);

  useEffect(() => {
    console.log('selectedCustomer changed:', selectedCustomer);
    if (selectedCustomer) {
      fetchCustomerQuotations(selectedCustomer.id);
    } else {
      setQuotations([]);
      setSelectedQuotation(null);
    }
  }, [selectedCustomer]);

  useEffect(() => {
    if (selectedQuotation) {
      loadQuotationItems();
    }
  }, [selectedQuotation]);

  useEffect(() => {
    calculateTotals();
  }, [items, previousInvoiced]);

  const fetchCustomers = async () => {
    try {
      console.log('Fetching customers...');
      const response = await fetch('/api/customers');
      console.log('Customers response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Customers data:', data);
        // API returns array directly, not wrapped in { data: [] }
        const customerList = Array.isArray(data) ? data : (data.data || []);
        console.log('Customers array:', customerList);
        setCustomers(customerList);
      } else {
        console.error('Failed to fetch customers, status:', response.status);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchNextInvoiceNumber = async () => {
    try {
      const response = await fetch('/api/invoices/generate-number');
      if (response.ok) {
        const data = await response.json();
        setInvoiceNumber(data.invoiceNumber);
      }
    } catch (error) {
      console.error('Error fetching invoice number:', error);
    }
  };

  const fetchCustomerQuotations = async (customerId: string) => {
    try {
      const response = await fetch(`/api/quotations?customerId=${customerId}&status=CONFIRMED&limit=100`);
      if (response.ok) {
        const data = await response.json();
        console.log('Quotations data:', data);
        // API returns { quotations: [...], pagination: {...} }
        const quotationsList = data.quotations || data.data || [];
        console.log('Quotations list:', quotationsList);
        
        // กรองเฉพาะใบเสนอราคาที่ยังมียอดคงเหลือให้ออกใบแจ้งหนี้ได้
        const availableQuotations = quotationsList.filter((q: Quotation & { remainingAmount?: number; totalInvoiced?: number }) => {
          const remaining = q.remainingAmount ?? (q.grandTotal - (q.totalInvoiced || 0));
          const canCreateInvoice = remaining > 0.01; // ใช้ threshold 0.01 เพื่อหลีกเลี่ยงปัญหา floating point
          console.log(`Quotation ${q.quotationNumber}: grandTotal=${q.grandTotal}, totalInvoiced=${q.totalInvoiced}, remaining=${remaining}, canCreate=${canCreateInvoice}`);
          return canCreateInvoice;
        });
        console.log('Available quotations (with remaining amount):', availableQuotations);
        setQuotations(availableQuotations);
      }
    } catch (error) {
      console.error('Error fetching quotations:', error);
    }
  };

  const loadQuotationItems = async () => {
    if (!selectedQuotation) return;
    
    try {
      const response = await fetch(`/api/quotations/${selectedQuotation.id}`);
      if (response.ok) {
        const data = await response.json();
        
        // คำนวณยอดที่ออกใบแจ้งหนี้ไปแล้ว
        const totalInvoiced = selectedQuotation.totalInvoiced || 0;
        
        // Reset state
        setPriceAdjusted(false);
        setPreviousInvoiced(totalInvoiced);
        
        // Map quotation items to invoice items
        const invoiceItems: InvoiceItem[] = data.items.map((item: any) => ({
          productId: item.productId,
          description: item.productName || item.description,
          quantity: item.quantity,
          unitPrice: parseFloat(item.unitPrice),
          amount: parseFloat(item.amount),
        }));
        
        // ถ้ามีใบแจ้งหนี้เดิมแล้ว ให้แสดงข้อมูล
        if (totalInvoiced > 0) {
          setPriceAdjusted(true);
          setAdjustmentInfo({ 
            originalTotal: selectedQuotation.grandTotal, 
            adjustedTotal: selectedQuotation.grandTotal - totalInvoiced 
          });
        }
        
        setItems(invoiceItems);
      }
    } catch (error) {
      console.error('Error loading quotation items:', error);
    }
  };

  const calculateTotals = () => {
    const sub = items.reduce((sum, item) => sum + item.amount, 0);
    const vat = 0; // No VAT for now
    setSubtotal(sub);
    setVatAmount(vat);
    // หักยอดใบแจ้งหนี้เดิมออก
    setGrandTotal(sub + vat - previousInvoiced);
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone?.includes(customerSearch) ||
    c.code.toLowerCase().includes(customerSearch.toLowerCase())
  );

  console.log('Total customers:', customers.length);
  console.log('Filtered customers:', filteredCustomers.length);
  console.log('Customer search:', customerSearch);

  const filteredQuotations = quotations.filter(q =>
    q.quotationNumber.toLowerCase().includes(quotationSearch.toLowerCase()) ||
    q.tourName?.toLowerCase().includes(quotationSearch.toLowerCase())
  );

  const handleSelectCustomer = (customer: Customer) => {
    console.log('Selected customer:', customer);
    setSelectedCustomer(customer);
    setCustomerSearch(customer.name);
    setShowCustomerDropdown(false);
    // Reset quotation selection
    setSelectedQuotation(null);
    setQuotationSearch('');
    setItems([]);
  };

  const handleSelectQuotation = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setQuotationSearch(`${quotation.quotationNumber} - ${quotation.tourName}`);
    setShowQuotationDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCustomer || !selectedQuotation) {
      alert('กรุณาเลือกลูกค้าและใบเสนอราคา');
      return;
    }

    if (items.length === 0) {
      alert('กรุณาเพิ่มรายการอย่างน้อย 1 รายการ');
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quotationId: selectedQuotation.id,
          invoiceNumber,
          invoiceDate,
          dueDate,
          notes,
          subtotal,
          vatAmount,
          grandTotal,
          items,
          pax: selectedQuotation.paxCount,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Invoice created:', data);
        const invoiceId = data.invoice?.id || data.id;
        alert('สร้างใบแจ้งหนี้สำเร็จ');
        router.push(`/invoices/${invoiceId}/edit`);
      } else {
        const error = await response.json();
        alert(error.error || 'เกิดข้อผิดพลาดในการสร้างใบแจ้งหนี้');
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('เกิดข้อผิดพลาดในการสร้างใบแจ้งหนี้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/invoices">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              กลับ
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg shadow-orange-500/25">
                <FileText className="w-6 h-6 text-white" />
              </div>
              สร้างใบแจ้งหนี้
            </h1>
            <p className="text-gray-500 mt-1 ml-12">กรอกข้อมูลเพื่อสร้างใบแจ้งหนี้ใหม่</p>
          </div>
        </div>
      </div>

      {/* Price Adjustment Warning */}
      {priceAdjusted && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <span className="text-xl">📋</span>
          <div>
            <h3 className="font-semibold text-amber-900 mb-1">มีใบแจ้งหนี้เดิมแล้ว</h3>
            <p className="text-sm text-amber-700">
              ใบเสนอราคานี้มียอดรวม {adjustmentInfo.originalTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿ 
              ออกใบแจ้งหนี้ไปแล้ว {(adjustmentInfo.originalTotal - adjustmentInfo.adjustedTotal).toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿ 
              คงเหลือ {adjustmentInfo.adjustedTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
            </p>
          </div>
        </div>
      )}

      {/* Info Alert */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-blue-900 mb-1">💡 คำแนะนำ</h3>
          <p className="text-sm text-blue-700">
            คุณสามารถแก้ไขรายการและราคาในใบแจ้งหนี้ได้หลังจากออกแล้ว เนื่องจากบางครั้งใบเสนอราคาหนึ่งอาจต้องแบ่งออกเป็นหลายใบแจ้งหนี้
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Selection */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-2 font-semibold">
                  <User className="w-5 h-5" />
                  เลือกลูกค้า
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Input
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    placeholder="พิมพ์ชื่อ, เบอร์โทร, หรือรหัสลูกค้า..."
                    required
                  />
                  {showCustomerDropdown && customerSearch && (
                    <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                      {filteredCustomers.length > 0 ? (
                        filteredCustomers.slice(0, 10).map(customer => (
                          <div
                            key={customer.id}
                            className="px-4 py-2 hover:bg-blue-50 cursor-pointer"
                            onClick={() => handleSelectCustomer(customer)}
                          >
                            <div className="font-medium">{customer.name}</div>
                            <div className="text-sm text-gray-500">
                              {customer.code} {customer.phone && `• ${customer.phone}`}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-2 text-gray-500">ไม่พบลูกค้า</div>
                      )}
                    </div>
                  )}
                </div>

                {selectedCustomer && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="font-medium text-blue-900">{selectedCustomer.name}</div>
                    <div className="text-sm text-blue-700 space-y-1 mt-2">
                      <div>รหัส: {selectedCustomer.code}</div>
                      {selectedCustomer.phone && <div>โทร: {selectedCustomer.phone}</div>}
                      {selectedCustomer.email && <div>อีเมล: {selectedCustomer.email}</div>}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quotation Selection */}
            {selectedCustomer && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <div className="flex items-center gap-2 font-semibold">
                    <FileText className="w-5 h-5" />
                    เลือกใบเสนอราคา
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <Input
                      value={quotationSearch}
                      onChange={(e) => {
                        setQuotationSearch(e.target.value);
                        setShowQuotationDropdown(true);
                      }}
                      onFocus={() => setShowQuotationDropdown(true)}
                      placeholder="พิมพ์เลขที่ใบเสนอราคาหรือชื่อทัวร์..."
                      required
                    />
                    {showQuotationDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                        {filteredQuotations.length > 0 ? (
                          filteredQuotations.map(quotation => {
                            const remaining = quotation.remainingAmount ?? quotation.grandTotal;
                            return (
                              <div
                                key={quotation.id}
                                className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b last:border-0"
                                onClick={() => handleSelectQuotation(quotation)}
                              >
                                <div className="font-medium">{quotation.quotationNumber}</div>
                                <div className="text-sm text-gray-600 mt-1">{quotation.tourName}</div>
                                <div className="text-sm text-gray-500 mt-1 flex items-center gap-3">
                                  <span>จำนวน: {quotation.paxCount} คน</span>
                                  <span>•</span>
                                  <span>฿{quotation.grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                                </div>
                                {quotation.totalInvoiced ? (
                                  <div className="text-xs text-orange-600 mt-1">
                                    ออกแล้ว: ฿{quotation.totalInvoiced.toLocaleString('th-TH', { minimumFractionDigits: 2 })} 
                                    {' '} • คงเหลือ: ฿{remaining.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })
                        ) : (
                          <div className="px-4 py-2 text-gray-500">
                            {quotations.length === 0 
                              ? 'ไม่มีใบเสนอราคาที่สามารถออกใบแจ้งหนี้ได้' 
                              : 'ไม่พบใบเสนอราคาที่ค้นหา'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {selectedQuotation && (
                    <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="font-medium text-green-900">
                        {selectedQuotation.quotationNumber} - {selectedQuotation.tourName}
                      </div>
                      <div className="text-sm text-green-700 space-y-1 mt-2">
                        <div>จำนวนผู้เดินทาง: {selectedQuotation.paxCount} คน</div>
                        <div>
                          วันเดินทาง: {new Date(selectedQuotation.departureDate).toLocaleDateString('th-TH')} - {new Date(selectedQuotation.returnDate).toLocaleDateString('th-TH')}
                        </div>
                        <div className="text-base font-semibold mt-2">
                          ยอดรวม: ฿{selectedQuotation.grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Invoice Items */}
            {selectedQuotation && items.length > 0 && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <div className="flex items-center gap-2 font-semibold">
                    <DollarSign className="w-5 h-5" />
                    รายการ
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left py-2 px-3">#</th>
                          <th className="text-left py-2 px-3">รายการ</th>
                          <th className="text-right py-2 px-3">จำนวน</th>
                          <th className="text-right py-2 px-3">ราคา/หน่วย</th>
                          <th className="text-right py-2 px-3">รวม</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, index) => (
                          <tr key={index} className="border-b">
                            <td className="py-2 px-3">{index + 1}</td>
                            <td className="py-2 px-3">{item.description}</td>
                            <td className="text-right py-2 px-3">{item.quantity}</td>
                            <td className="text-right py-2 px-3">
                              ฿{item.unitPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="text-right py-2 px-3 font-medium">
                              ฿{item.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals */}
                  <div className="mt-4 pt-4 border-t space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">ยอดรวมรายการ:</span>
                      <span className="font-medium">฿{subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {previousInvoiced > 0 && (
                      <div className="flex justify-between text-sm text-red-600">
                        <span>หัก: ออกใบแจ้งหนี้แล้ว</span>
                        <span className="font-medium">-฿{previousInvoiced.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {vatAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">ภาษีมูลค่าเพิ่ม 7%:</span>
                        <span className="font-medium">฿{vatAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold text-blue-600 pt-2 border-t">
                      <span>ยอดรวมทั้งสิ้น:</span>
                      <span>฿{grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Invoice Info */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-2 font-semibold">
                  <Calendar className="w-5 h-5" />
                  ข้อมูลใบแจ้งหนี้
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    เลขที่ใบแจ้งหนี้
                  </label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-medium text-gray-900">
                    {invoiceNumber || 'กำลังโหลด...'}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">เลขที่สร้างอัตโนมัติโดยระบบ</p>
                </div>

                {selectedQuotation && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <label className="block text-xs font-medium text-blue-700 mb-1">
                      อ้างอิงจากใบเสนอราคา
                    </label>
                    <div className="text-sm font-semibold text-blue-900">
                      {selectedQuotation.quotationNumber}
                    </div>
                    <div className="text-xs text-blue-700 mt-1">
                      {selectedQuotation.tourName}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    วันที่ออกใบแจ้งหนี้
                  </label>
                  <Input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    กำหนดชำระ
                  </label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    หมายเหตุ
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="หมายเหตุเพิ่มเติม..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card className="border-0 shadow-lg">
              <CardContent className="p-4 space-y-3">
                <Button 
                  type="submit" 
                  disabled={loading || !selectedCustomer || !selectedQuotation || items.length === 0}
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      กำลังสร้าง...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      สร้างใบแจ้งหนี้
                    </>
                  )}
                </Button>
                <Link href="/invoices">
                  <Button type="button" variant="outline" className="w-full">
                    ยกเลิก
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
