'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { useCurrentUser } from '@/contexts/AuthContext';

interface InvoiceModalProps {
  quotation: {
    id: string;
    quotationNumber: string;
    customerName: string;
    grandTotal: number;
    status: string;
  };
  onClose: () => void;
  onSuccess: (invoiceId: number) => void;
}

interface InvoiceItem {
  productId: number | null;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  itemType: 'INCOME' | 'DISCOUNT';
  vatType: 'NO_VAT' | 'VAT' | 'VAT_EXEMPT';
  hasWithholdingTax: boolean;
}

interface QuotationData {
  id: number;
  quotationNumber: string;
  customerName: string;
  paxCount: number;
  grandTotal: number;
  subtotal: number;
  discountAmount: number;
  vatExemptAmount: number;
  preTaxAmount: number;
  vatAmount: number;
  withholdingTax: number;
  hasWithholdingTax: boolean;
  depositAmount: number;  // เงินมัดจำรวมจากใบเสนอราคา
  totalInvoiced: number;  // ยอดที่ออกใบแจ้งหนี้ไปแล้ว
  remainingAmount: number;  // ยอดคงเหลือ
  items: Array<{
    id: string;
    productId: number | null;
    productName: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    itemType: string;
    vatType: string;
    hasWithholdingTax: boolean;
  }>;
}

export default function InvoiceModal({ quotation, onClose, onSuccess }: InvoiceModalProps) {
  const { userId, userName } = useCurrentUser();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string>('');
  const [quotationData, setQuotationData] = useState<QuotationData | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  
  const [invoiceDate, setInvoiceDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState<string>('');
  const [depositAmount, setDepositAmount] = useState<number>(0);

  useEffect(() => {
    fetchQuotationData();
    fetchNextInvoiceNumber();
  }, []);

  const fetchQuotationData = async () => {
    try {
      setLoadingData(true);
      const response = await fetch(`/api/quotations/${quotation.id}`);
      if (response.ok) {
        const data = await response.json();
        setQuotationData(data);
      }
    } catch (error) {
      console.error('Error fetching quotation data:', error);
    } finally {
      setLoadingData(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!quotationData) {
      setError('ไม่สามารถโหลดข้อมูลใบเสนอราคาได้');
      return;
    }

    // Validation
    if (quotation.status !== 'CONFIRMED' && quotation.status !== 'COMPLETED') {
      setError('ใบเสนอราคาต้องมีสถานะ ยืนยัน ก่อนสร้างใบแจ้งหนี้');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // ใช้ยอดคงเหลือสำหรับ invoice (ถ้าเป็นใบที่ 2+ จะใช้ remainingAmount)
      const invoiceGrandTotal = quotationData.totalInvoiced > 0 
        ? quotationData.remainingAmount 
        : parseFloat(String(quotationData.grandTotal)) || 0;
      
      // คำนวณสัดส่วนของ invoice นี้เทียบกับ quotation
      const ratio = invoiceGrandTotal / (parseFloat(String(quotationData.grandTotal)) || 1);
      
      // Copy items จาก quotation และปรับราคาตามสัดส่วน (ถ้าเป็นใบที่ 2+)
      const items: InvoiceItem[] = quotationData.items.map((item) => {
        const originalAmount = parseFloat(String(item.amount)) || 0;
        const adjustedAmount = quotationData.totalInvoiced > 0 ? originalAmount * ratio : originalAmount;
        const adjustedUnitPrice = item.quantity > 0 ? adjustedAmount / item.quantity : 0;
        
        return {
          productId: item.productId || null,
          description: item.productName,
          quantity: item.quantity,
          unitPrice: quotationData.totalInvoiced > 0 ? adjustedUnitPrice : (parseFloat(String(item.unitPrice)) || 0),
          amount: adjustedAmount,
          itemType: (item.itemType === 'DISCOUNT' ? 'DISCOUNT' : 'INCOME') as 'INCOME' | 'DISCOUNT',
          vatType: (item.vatType || 'NO_VAT') as 'NO_VAT' | 'VAT' | 'VAT_EXEMPT',
          hasWithholdingTax: item.hasWithholdingTax || false,
        };
      });

      // คำนวณยอดต่างๆ ตามสัดส่วน
      const invoiceSubtotal = quotationData.totalInvoiced > 0 
        ? (parseFloat(String(quotationData.subtotal)) || 0) * ratio 
        : parseFloat(String(quotationData.subtotal)) || 0;
      const invoiceDiscountAmount = quotationData.totalInvoiced > 0 
        ? (parseFloat(String(quotationData.discountAmount)) || 0) * ratio 
        : parseFloat(String(quotationData.discountAmount)) || 0;
      const invoiceVatExemptAmount = quotationData.totalInvoiced > 0 
        ? (parseFloat(String(quotationData.vatExemptAmount)) || 0) * ratio 
        : parseFloat(String(quotationData.vatExemptAmount)) || 0;
      const invoicePreTaxAmount = quotationData.totalInvoiced > 0 
        ? (parseFloat(String(quotationData.preTaxAmount)) || 0) * ratio 
        : parseFloat(String(quotationData.preTaxAmount)) || 0;
      const invoiceVatAmount = quotationData.totalInvoiced > 0 
        ? (parseFloat(String(quotationData.vatAmount)) || 0) * ratio 
        : parseFloat(String(quotationData.vatAmount)) || 0;
      const invoiceWithholdingTax = quotationData.totalInvoiced > 0 
        ? (parseFloat(String(quotationData.withholdingTax)) || 0) * ratio 
        : parseFloat(String(quotationData.withholdingTax)) || 0;

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quotationId: parseInt(quotation.id),
          pax: quotationData.paxCount || 1,
          invoiceDate,
          dueDate,
          items,
          subtotal: invoiceSubtotal,
          discountAmount: invoiceDiscountAmount,
          vatExemptAmount: invoiceVatExemptAmount,
          preTaxAmount: invoicePreTaxAmount,
          vatAmount: invoiceVatAmount,
          grandTotal: invoiceGrandTotal,
          withholdingTax: invoiceWithholdingTax,
          depositAmount: depositAmount || 0,
          notes,
          createdById: userId,
          createdByName: userName,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Invoice creation response:', data);
        const invoiceId = data.invoice?.id || data.id;
        console.log('Invoice ID:', invoiceId);
        if (invoiceId) {
          onSuccess(invoiceId);
        } else {
          console.error('No invoice ID in response:', data);
          setError('สร้างใบแจ้งหนี้สำเร็จแต่ไม่สามารถดึง ID ได้');
        }
      } else {
        const data = await response.json();
        setError(data.error || 'เกิดข้อผิดพลาดในการสร้างใบแจ้งหนี้');
      }
    } catch (error: any) {
      setError(error.message || 'เกิดข้อผิดพลาดในการสร้างใบแจ้งหนี้');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num || 0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">สร้างใบแจ้งหนี้</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
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

          {/* Quotation Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">ใบเสนอราคา</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">เลขที่:</span>
                <span className="font-medium">{quotation.quotationNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">ลูกค้า:</span>
                <span className="font-medium">{quotation.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">จำนวน Pax:</span>
                <span className="font-medium">{quotationData?.paxCount || '-'} คน</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">ยอดรวมใบเสนอราคา:</span>
                <span className="font-medium">{formatNumber(quotationData?.grandTotal || quotation.grandTotal)} บาท</span>
              </div>
              {quotationData && quotationData.totalInvoiced > 0 && (
                <>
                  <div className="flex justify-between text-orange-600">
                    <span>ออกใบแจ้งหนี้แล้ว:</span>
                    <span className="font-medium">- {formatNumber(quotationData.totalInvoiced)} บาท</span>
                  </div>
                  <div className="border-t border-blue-200 pt-1 mt-1">
                    <div className="flex justify-between">
                      <span className="font-medium text-green-700">ยอดคงเหลือ:</span>
                      <span className="font-bold text-green-600">{formatNumber(quotationData.remainingAmount)} บาท</span>
                    </div>
                  </div>
                </>
              )}
              {(!quotationData || quotationData.totalInvoiced === 0) && (
                <div className="flex justify-between">
                  <span className="text-gray-600">ยอดที่จะออกใบแจ้งหนี้:</span>
                  <span className="font-bold text-blue-600">{formatNumber(quotationData?.grandTotal || quotation.grandTotal)} บาท</span>
                </div>
              )}
            </div>
          </div>

          {/* Items from Quotation */}
          {loadingData ? (
            <div className="text-center py-4 text-gray-500">กำลังโหลดข้อมูล...</div>
          ) : quotationData?.items && quotationData.items.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-900 mb-2">รายการสินค้า/บริการ (Copy จากใบเสนอราคา)</h3>
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-2 px-3 font-medium">รายการ</th>
                      <th className="text-center py-2 px-3 font-medium w-16">จำนวน</th>
                      <th className="text-right py-2 px-3 font-medium w-24">ราคา</th>
                      <th className="text-right py-2 px-3 font-medium w-24">รวม</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotationData.items.map((item, index) => (
                      <tr key={index} className="border-t border-gray-200">
                        <td className="py-2 px-3">
                          {item.productName}
                          {item.itemType === 'DISCOUNT' && (
                            <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">ส่วนลด</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">{item.quantity}</td>
                        <td className="py-2 px-3 text-right">{formatNumber(parseFloat(String(item.unitPrice)))}</td>
                        <td className="py-2 px-3 text-right font-medium">
                          {item.itemType === 'DISCOUNT' ? '-' : ''}{formatNumber(parseFloat(String(item.amount)))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t border-gray-300">
                    <tr>
                      <td colSpan={3} className="py-2 px-3 text-right font-medium">ยอดรวมสุทธิ / Grand Total:</td>
                      <td className="py-2 px-3 text-right font-bold text-blue-600">
                        {formatNumber(parseFloat(String(quotationData.grandTotal)))}
                      </td>
                    </tr>
                    {depositAmount > 0 && (
                      <>
                        <tr className="border-t border-gray-200">
                          <td colSpan={3} className="py-2 px-3 text-right font-medium text-green-600">หักเงินมัดจำ / Less Deposit:</td>
                          <td className="py-2 px-3 text-right font-bold text-green-600">
                            -{formatNumber(depositAmount)}
                          </td>
                        </tr>
                        <tr className="border-t border-gray-300 bg-blue-50">
                          <td colSpan={3} className="py-2 px-3 text-right font-bold text-blue-700">ยอดคงเหลือ / Balance Due:</td>
                          <td className="py-2 px-3 text-right font-bold text-blue-700 text-lg">
                            {formatNumber(parseFloat(String(quotationData.grandTotal)) - depositAmount)}
                          </td>
                        </tr>
                      </>
                    )}
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Status Warning */}
          {quotation.status !== 'CONFIRMED' && quotation.status !== 'COMPLETED' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900">ใบเสนอราคายังไม่ได้รับอนุมัติ</p>
                <p className="text-sm text-yellow-700">ต้องเปลี่ยนสถานะเป็น APPROVED ก่อนสร้างใบแจ้งหนี้</p>
              </div>
            </div>
          )}

          {/* Invoice Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              เลขที่ใบแจ้งหนี้
            </label>
            <input
              type="text" 
              value={invoiceNumber}
              readOnly
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              placeholder="Auto-generated"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                วันที่ออกใบแจ้งหนี้ <span className="text-red-500">*</span>
              </label>
              <input
                type="date" 
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                กำหนดชำระ <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>

          {/* Deposit Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              หักเงินมัดจำ / Deposit
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={depositAmount || ''}
              onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="0.00"
            />
            {depositAmount > 0 && quotationData && (
              <p className="mt-1 text-sm text-blue-600">
                ยอดคงเหลือ: {formatNumber(parseFloat(String(quotationData.grandTotal)) - depositAmount)} บาท
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              หมายเหตุ
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="หมายเหตุเพิ่มเติม..."
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t  border-gray-300">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading || (quotation.status !== 'CONFIRMED' && quotation.status !== 'COMPLETED')}>
              {loading ? 'กำลังสร้าง...' : 'สร้างใบแจ้งหนี้'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
