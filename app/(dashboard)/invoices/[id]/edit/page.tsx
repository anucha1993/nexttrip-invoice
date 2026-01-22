'use client';

import { useState, useEffect, use, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { 
  ArrowLeft, Save, Plus, Trash2, CheckCircle, AlertCircle, DollarSign 
} from 'lucide-react';
import Link from 'next/link';
import { useCurrentUser } from '@/contexts/AuthContext';

interface InvoiceItem {
  id?: number;
  productId: number | null;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  itemType: 'INCOME' | 'DISCOUNT';
  vatType: 'NO_VAT' | 'VAT' | 'VAT_EXEMPT';
  hasWithholdingTax: boolean;
  sortOrder: number;
}

interface Product {
  id: number;
  name: string;
  calculationType: 'INCOME' | 'DISCOUNT' | 'FREE';
  includePax: boolean;
}

export default function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { userId, userName } = useCurrentUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  
  // Invoice data
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [quotationId, setQuotationId] = useState<number | null>(null);
  const [quotationNumber, setQuotationNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [pax, setPax] = useState(1);
  const [invoiceDate, setInvoiceDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [vatMode, setVatMode] = useState<'INCLUDE' | 'EXCLUDE'>('EXCLUDE');
  const [hasWithholdingTax, setHasWithholdingTax] = useState(false);
  
  // Deposit Amount - กรอกเองได้ (ไม่ได้ดึงจาก Quotation)
  const [depositAmount, setDepositAmount] = useState(0);
  
  // Items
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Fetch invoice data
  const fetchInvoice = useCallback(async () => {
    try {
      const response = await fetch(`/api/invoices/${resolvedParams.id}`);
      if (response.ok) {
        const data = await response.json();
        const invoice = data.invoice;
        
        setInvoiceNumber(invoice.invoiceNumber);
        setQuotationId(invoice.quotationId);
        setQuotationNumber(invoice.quotationNumber || '');
        setCustomerName(invoice.customerName || '');
        setPax(invoice.pax || 1);
        setInvoiceDate(invoice.invoiceDate?.split('T')[0] || '');
        setDueDate(invoice.dueDate?.split('T')[0] || '');
        setNotes(invoice.notes || '');
        setStatus(invoice.status);
        setDepositAmount(parseFloat(invoice.depositAmount) || 0);
        
        // Map items
        const mappedItems: InvoiceItem[] = (data.items || []).map((item: any, index: number) => ({
          id: item.id,
          productId: item.productId || null,
          description: item.description,
          quantity: Number(item.quantity) || 1,
          unitPrice: parseFloat(item.unitPrice) || 0,
          amount: parseFloat(item.amount) || 0,
          itemType: item.itemType || 'INCOME',
          vatType: item.vatType || 'VAT',
          hasWithholdingTax: item.hasWithholdingTax || false,
          sortOrder: item.sortOrder || index,
        }));
        setItems(mappedItems);
      } else {
        router.push('/invoices');
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
      router.push('/invoices');
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.id, router]);

  // Fetch products
  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products?limit=1000');
      if (res.ok) {
        const data = await res.json();
        setProducts(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  useEffect(() => {
    fetchInvoice();
    fetchProducts();
  }, [fetchInvoice]);

  // Add item
  const addItem = (type: 'INCOME' | 'DISCOUNT' = 'INCOME') => {
    setItems([...items, {
      productId: null,
      description: '',
      quantity: 1,
      unitPrice: 0,
      amount: 0,
      itemType: type,
      vatType: type === 'INCOME' ? 'VAT' : 'NO_VAT',
      hasWithholdingTax: false,
      sortOrder: items.length,
    }]);
  };

  // Remove item
  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  // Update item
  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number | boolean | null) => {
    setItems(items.map((item, i) => {
      if (i !== index) return item;
      
      const updated = { ...item, [field]: value };
      
      // When product changes, update description from product name
      if (field === 'productId' && value) {
        const product = products.find(p => p.id === Number(value));
        if (product) {
          updated.description = product.name;
        }
      }
      
      // Calculate amount when quantity or unitPrice changes
      if (field === 'quantity' || field === 'unitPrice') {
        const qty = field === 'quantity' ? Number(value) : item.quantity;
        const price = field === 'unitPrice' ? Number(value) : item.unitPrice;
        updated.amount = qty * price;
      }

      return updated;
    }));
  };

  // Calculate PAX count from items with includePax products (เหมือน quotation-form.tsx)
  useEffect(() => {
    let totalPax = 0;
    items.forEach(item => {
      if (item.productId) {
        const product = products.find(p => p.id === item.productId);
        if (product && product.includePax) {
          totalPax += item.quantity;
        }
      }
    });
    setPax(totalPax || 1);
  }, [items, products]);

  // Calculate totals - เหมือน quotation-form.tsx 100%
  const totals = useMemo(() => {
    let sumTotalNonVat = 0;   // ยอดรวมยกเว้นภาษี (VAT Exempt)
    let sumTotalVat = 0;      // ราคาสุทธิสินค้าที่เสียภาษี (has VAT)
    let sumDiscount = 0;      // ส่วนลด
    let sum3Percent = 0;      // ยอดรวม 3% จากรายการที่ติ๊ก
    const vatRate = 0.07;

    items.forEach(item => {
      if (item.itemType === 'INCOME') {
        const amount = Number(item.amount) || 0;
        let rowTotal = amount;
        if (item.hasWithholdingTax) {
          const plus3 = amount * 0.03;
          sum3Percent += plus3;
          rowTotal = amount + plus3;
        }
        
        if (item.vatType === 'VAT') {
          sumTotalVat += rowTotal;
        } else {
          sumTotalNonVat += rowTotal;
        }
      } else if (item.itemType === 'DISCOUNT') {
        sumDiscount += Number(item.amount) || 0;
      }
    });

    // VAT Calculation
    let sumPreVat = 0;
    let sumVat = 0;
    let sumIncludeVat = 0;
    let grandTotal = 0;

    const listVatTotal = sumTotalVat;

    if (listVatTotal === 0) {
      sumPreVat = 0;
      sumVat = 0;
      sumIncludeVat = 0;
      grandTotal = sumTotalNonVat - sumDiscount;
    } else {
      if (vatMode === 'INCLUDE') {
        const vatBase = listVatTotal - sumDiscount;
        sumPreVat = vatBase * 100 / 107;
        sumVat = sumPreVat * vatRate;
        sumIncludeVat = sumPreVat + sumVat;
        grandTotal = sumTotalNonVat + sumIncludeVat;
      } else {
        if (sumDiscount < listVatTotal) {
          sumPreVat = listVatTotal - sumDiscount;
          sumVat = sumPreVat * vatRate;
          sumIncludeVat = sumPreVat + sumVat;
          grandTotal = sumTotalNonVat + sumIncludeVat;
        } else {
          sumPreVat = 0;
          sumVat = 0;
          sumIncludeVat = 0;
          grandTotal = sumTotalNonVat;
        }
      }
    }

    const withholdingTax = hasWithholdingTax ? sumPreVat * 0.03 : 0;
    const netPayable = grandTotal - withholdingTax;
    const subtotal = sumTotalVat + sumTotalNonVat;

    return {
      subtotal,
      vatExemptAmount: sumTotalNonVat,
      preTaxAmountRaw: sumTotalVat,  // ราคาสุทธิสินค้าที่เสียภาษี (ก่อนหักส่วนลด)
      preTaxAmount: sumPreVat,        // ราคาก่อนภาษีมูลค่าเพิ่ม (หลังหักส่วนลด)
      discount: sumDiscount,
      vatAmount: sumVat,
      includeVatAmount: sumIncludeVat,
      grandTotal,
      withholdingTax,
      netPayable,
    };
  }, [items, vatMode, hasWithholdingTax]);

  // Format number
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  // Save
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = {
        invoiceDate,
        dueDate,
        pax,
        status,
        items: items.map((item, index) => ({
          ...item,
          sortOrder: index,
        })),
        subtotal: totals.subtotal,
        discountAmount: totals.discount,
        vatExemptAmount: totals.vatExemptAmount,
        preTaxAmount: totals.preTaxAmount,
        vatAmount: totals.vatAmount,
        grandTotal: totals.grandTotal,
        withholdingTax: totals.withholdingTax,
        depositAmount: depositAmount || 0,
        notes,
        updatedById: userId,
        updatedByName: userName,
      };

      const response = await fetch(`/api/invoices/${resolvedParams.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSuccessMessage('บันทึกใบแจ้งหนี้สำเร็จ!');
        setTimeout(() => {
          router.push(`/quotations/${quotationId}/dashboard?tab=invoice`);
        }, 1500);
      } else {
        const data = await response.json();
        setError(data.error || 'เกิดข้อผิดพลาดในการบันทึก');
      }
    } catch (error: any) {
      setError(error.message || 'เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">กำลังโหลดข้อมูล...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2 shadow-lg">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-green-800">{successMessage}</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-800">{error}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={quotationId ? `/quotations/${quotationId}/dashboard?tab=invoice` : '/invoices'}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              กลับ
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-blue-600">แก้ไขใบแจ้งหนี้</h1>
            <p className="text-gray-500">{invoiceNumber}</p>
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'กำลังบันทึก...' : 'บันทึก'}
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Invoice Info & Items */}
          <div className="lg:col-span-2 space-y-6">
            {/* Invoice Info */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">ข้อมูลใบแจ้งหนี้</h2>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">เลขที่ใบแจ้งหนี้</label>
                    <Input value={invoiceNumber} disabled className="bg-gray-50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ใบเสนอราคา</label>
                    <Input value={quotationNumber} disabled className="bg-gray-50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ลูกค้า</label>
                    <Input value={customerName} disabled className="bg-gray-50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">จำนวน Pax</label>
                    <Input 
                      type="number" 
                      value={pax} 
                      disabled
                      className="bg-gray-50"
                    />
                    <p className="text-xs text-gray-500 mt-1">คำนวณจากรายการที่มี (PAX)</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">วันที่ออกใบแจ้งหนี้ *</label>
                    <Input 
                      type="date" 
                      value={invoiceDate} 
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">กำหนดชำระ *</label>
                    <Input 
                      type="date" 
                      value={dueDate} 
                      onChange={(e) => setDueDate(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">สถานะ</label>
                    <select 
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="DRAFT">ฉบับร่าง</option>
                      <option value="ISSUED">ออกแล้ว</option>
                      <option value="PAID">ชำระแล้ว</option>
                      <option value="PARTIAL_PAID">ชำระบางส่วน</option>
                      <option value="CANCELLED">ยกเลิก</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items - รายได้ */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-green-600">
                    <DollarSign className="w-5 h-5" />
                    รายได้ / ค่าบริการ
                  </div>
                  <Button type="button" size="sm" onClick={() => addItem('INCOME')}>
                    <Plus className="w-4 h-4 mr-2" />
                    เพิ่มรายการ
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-visible">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-2 px-2 font-medium">รายการ</th>
                        <th className="text-center py-2 px-2 w-10 font-medium">3%</th>
                        <th className="text-center py-2 px-2 w-10 font-medium">VAT</th>
                        <th className="text-center py-2 px-2 w-20 font-medium">จำนวน</th>
                        <th className="text-right py-2 px-2 w-28 font-medium">ราคา/หน่วย</th>
                        <th className="text-right py-2 px-2 w-28 font-medium">รวม</th>
                        <th className="text-center py-2 px-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.filter(item => item.itemType === 'INCOME').map((item) => {
                        const index = items.indexOf(item);
                        return (
                          <tr key={index} className="border-b border-gray-200">
                            <td className="py-2 px-2">
                              <SearchableSelect
                                value={item.productId?.toString() || ''}
                                onChange={(value) => updateItem(index, 'productId', value ? Number(value) : null)}
                                placeholder="-- เลือกรายการรายได้ --"
                                options={products
                                  .filter(p => p.calculationType === 'INCOME')
                                  .map(product => ({
                                    value: product.id.toString(),
                                    label: product.name,
                                    subLabel: product.includePax ? '(PAX)' : undefined
                                  }))}
                              />
                            </td>
                            <td className="py-2 px-2 text-center">
                              <input
                                type="checkbox"
                                checked={item.hasWithholdingTax}
                                onChange={(e) => updateItem(index, 'hasWithholdingTax', e.target.checked)}
                                className="w-4 h-4 accent-blue-600"
                              />
                            </td>
                            <td className="py-2 px-2 text-center">
                              <input
                                type="checkbox"
                                checked={item.vatType === 'VAT'}
                                onChange={(e) => updateItem(index, 'vatType', e.target.checked ? 'VAT' : 'NO_VAT')}
                                className="w-4 h-4 accent-blue-600"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                className="text-center text-sm"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                className="text-right text-sm"
                              />
                            </td>
                            <td className="py-2 px-2 text-right font-medium">
                              {formatNumber(item.hasWithholdingTax ? item.amount * 1.03 : item.amount)}
                            </td>
                            <td className="py-2 px-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(index)}
                                disabled={items.filter(i => i.itemType === 'INCOME').length === 1}
                                className="text-red-600 hover:text-red-700 p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Items - ส่วนลด */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-red-600">
                    <DollarSign className="w-5 h-5" />
                    ส่วนลด
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => addItem('DISCOUNT')}>
                    <Plus className="w-4 h-4 mr-2" />
                    เพิ่มส่วนลด
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-visible">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-2 px-2 font-medium">รายการส่วนลด</th>
                        <th className="text-center py-2 px-2 w-20 font-medium">จำนวน</th>
                        <th className="text-right py-2 px-2 w-28 font-medium">ราคา/หน่วย</th>
                        <th className="text-right py-2 px-2 w-28 font-medium">รวม</th>
                        <th className="text-center py-2 px-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.filter(item => item.itemType === 'DISCOUNT').length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-gray-400">
                            ไม่มีส่วนลด
                          </td>
                        </tr>
                      ) : (
                        items.filter(item => item.itemType === 'DISCOUNT').map((item) => {
                          const index = items.indexOf(item);
                          return (
                            <tr key={index} className="border-b border-gray-200">
                              <td className="py-2 px-2">
                                <SearchableSelect
                                  value={item.productId?.toString() || ''}
                                  onChange={(value) => updateItem(index, 'productId', value ? Number(value) : null)}
                                  placeholder="-- เลือกรายการส่วนลด --"
                                  options={products
                                    .filter(p => p.calculationType === 'DISCOUNT')
                                    .map(product => ({
                                      value: product.id.toString(),
                                      label: product.name,
                                    }))}
                                />
                              </td>
                              <td className="py-2 px-2">
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                  className="text-center text-sm"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.unitPrice}
                                  onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                  className="text-right text-sm"
                                />
                              </td>
                              <td className="py-2 px-2 text-right font-medium text-red-600">
                                -{formatNumber(item.amount)}
                              </td>
                              <td className="py-2 px-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeItem(index)}
                                  className="text-red-600 hover:text-red-700 p-1"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
         {/* Notes */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">หมายเหตุ</h2>
          </CardHeader>
          <CardContent>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={3}
              placeholder="หมายเหตุเพิ่มเติม..."
            />
          </CardContent>
        </Card>

          </div>

          {/* Right Column - VAT Settings, Summary, Notes */}
          <div className="space-y-6">
            {/* VAT Settings */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">การคำนวณภาษี</h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">VAT Mode:</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={vatMode === 'EXCLUDE'}
                          onChange={() => setVatMode('EXCLUDE')}
                        />
                        <span className="text-sm">ไม่รวม VAT</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={vatMode === 'INCLUDE'}
                          onChange={() => setVatMode('INCLUDE')}
                        />
                        <span className="text-sm">รวม VAT แล้ว</span>
                      </label>
                    </div>
                  </div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={hasWithholdingTax}
                      onChange={(e) => setHasWithholdingTax(e.target.checked)}
                    />
                    <span className="text-sm font-medium text-gray-700">หัก ณ ที่จ่าย 3%</span>
                  </label>
                </div>
              </CardContent>
            </Card>

             {/* Deposit Amount */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-purple-700">หักเงินมัดจำ / Deposit</h2>
              </CardHeader>
              <CardContent>
                <Input 
                  type="number" 
                  min={0}
                  step="0.01"
                  value={depositAmount || ''} 
                  onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
                {depositAmount > 0 && (
                  <p className="mt-2 text-sm text-blue-600 font-medium">
                    ยอดคงเหลือ: {formatNumber(totals.grandTotal - depositAmount - (hasWithholdingTax ? totals.withholdingTax : 0))} บาท
                  </p>
                )}
              </CardContent>
            </Card>

        {/* Summary */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="text-green-600">$</span>
              สรุปยอด
            </h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {/* ยอดรวมยกเว้นภาษี */}
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">ยอดรวมยกเว้นภาษี / Vat-Exempted Amount</span>
                <span className="font-medium">{formatNumber(totals.vatExemptAmount)}</span>
              </div>
              
              {/* ราคาสุทธิสินค้าที่เสียภาษี */}
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">ราคาสุทธิสินค้าที่เสียภาษี / Pre-Tax Amount</span>
                <span className="font-medium">{formatNumber(totals.preTaxAmountRaw)}</span>
              </div>
              
              {/* ส่วนลด */}
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">ส่วนลด / Discount</span>
                <span className="font-medium text-red-600">-{formatNumber(totals.discount)}</span>
              </div>
              
              <div className="border-t border-gray-300 my-2"></div>
              
              {/* ราคาก่อนภาษีมูลค่าเพิ่ม */}
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">ราคาก่อนภาษีมูลค่าเพิ่ม / Pre-VAT Amount</span>
                <span className="font-medium">{formatNumber(totals.preTaxAmount)}</span>
              </div>
              
              {/* ภาษีมูลค่าเพิ่ม VAT 7% */}
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">ภาษีมูลค่าเพิ่ม VAT : 7%</span>
                <span className="font-medium">{formatNumber(totals.vatAmount)}</span>
              </div>
              
              {/* ราคารวมภาษีมูลค่าเพิ่ม */}
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">ราคารวมภาษีมูลค่าเพิ่ม / Include VAT</span>
                <span className="font-medium">{formatNumber(totals.includeVatAmount)}</span>
              </div>
              
              {/* Grand Total */}
              <div className="flex justify-between py-3 bg-blue-50 rounded-lg px-4 mt-2">
                <span className="font-semibold text-blue-800">จำนวนเงินรวมทั้งสิ้น / Grand Total</span>
                <span className="text-2xl font-bold text-blue-600">{formatNumber(totals.grandTotal)}</span>
              </div>
              
              {/* หักภาษี ณ ที่จ่าย 3% */}
              {hasWithholdingTax && (
                <div className="flex justify-between py-3 bg-orange-50 rounded-lg px-4 mt-2">
                  <span className="text-orange-700">หักภาษี ณ ที่จ่าย 3%</span>
                  <span className="font-medium text-orange-600">-{formatNumber(totals.withholdingTax)}</span>
                </div>
              )}

              {/* Net Payable */}
              {(hasWithholdingTax || depositAmount > 0) && (
                <div className="flex justify-between py-3 bg-green-50 rounded-lg px-4 mt-2">
                  <span className="font-semibold text-green-800">ยอดสุทธิที่ต้องชำระ / Net Payable</span>
                  <span className="text-xl font-bold text-green-600">
                    {formatNumber(totals.grandTotal - (hasWithholdingTax ? totals.withholdingTax : 0))}
                  </span>
                </div>
              )}
              
              <div className="text-right text-xs text-gray-500 mt-2">บาท (THB)</div>
            </div>
          </CardContent>
        </Card>

           

       
        {/* Submit Button */}
        <div className="flex flex-col gap-3">
          <Button type="submit" disabled={saving} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'กำลังบันทึก...' : 'บันทึกใบแจ้งหนี้'}
          </Button>
          <Link href={quotationId ? `/quotations/${quotationId}/dashboard?tab=invoice` : '/invoices'} className="w-full">
            <Button type="button" variant="outline" className="w-full">
              ยกเลิก
            </Button>
          </Link>
        </div>
          </div>
        </div>
      </form>
    </div>
  );
}
