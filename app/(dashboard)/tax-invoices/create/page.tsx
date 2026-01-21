'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, FileCheck, AlertCircle, CheckCircle, 
  Search, Calendar, User, DollarSign
} from 'lucide-react';
import Link from 'next/link';
import { useCurrentUser } from '@/contexts/AuthContext';

export default function CreateTaxInvoicePage() {
  const router = useRouter();
  const { userId, userName } = useCurrentUser();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Fetch customers
  useEffect(() => {
    fetchCustomers();
  }, []);

  // Fetch invoices when customer is selected
  useEffect(() => {
    if (selectedCustomerId) {
      fetchInvoicesForCustomer(parseInt(selectedCustomerId));
    } else {
      setInvoices([]);
      setSelectedInvoiceId('');
      setSelectedInvoice(null);
    }
  }, [selectedCustomerId]);

  // Load invoice details when selected
  useEffect(() => {
    if (selectedInvoiceId) {
      const invoice = invoices.find(inv => inv.id === parseInt(selectedInvoiceId));
      setSelectedInvoice(invoice || null);
    } else {
      setSelectedInvoice(null);
    }
  }, [selectedInvoiceId, invoices]);

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers');
      if (response.ok) {
        const data = await response.json();
        console.log('Customers response:', data);
        // API returns array directly
        const customersArray = Array.isArray(data) ? data : (data.customers || []);
        setCustomers(customersArray);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchInvoicesForCustomer = async (customerId: number) => {
    try {
      setLoading(true);
      // ดึง invoices ของลูกค้าที่ยังไม่มีใบกำกับภาษี และสถานะไม่เป็น DRAFT, CANCELLED, VOIDED
      const response = await fetch(`/api/invoices?customerId=${customerId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Invoices data:', data);
        
        // กรอง Invoice ที่สามารถออกใบกำกับภาษีได้
        const eligibleInvoices = (data.invoices || []).filter((inv: any) => {
          const canIssue = !inv.hasTaxInvoice && 
            inv.status !== 'DRAFT' && 
            inv.status !== 'CANCELLED' && 
            inv.status !== 'VOIDED';
          
          console.log(`Invoice ${inv.invoiceNumber}:`, {
            hasTaxInvoice: inv.hasTaxInvoice,
            status: inv.status,
            canIssue
          });
          
          return canIssue;
        });

        console.log('Eligible invoices:', eligibleInvoices.length);
        setInvoices(eligibleInvoices);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedInvoiceId) {
      alert('กรุณาเลือก Invoice');
      return;
    }

    if (!userId || !userName) {
      alert('ไม่พบข้อมูลผู้ใช้');
      return;
    }

    const confirmed = window.confirm(
      `ต้องการออกใบกำกับภาษีสำหรับ Invoice "${selectedInvoice?.invoiceNumber}" ใช่หรือไม่?`
    );
    if (!confirmed) return;

    try {
      setSubmitting(true);

      const response = await fetch(`/api/invoices/${selectedInvoiceId}/issue-tax-invoice`, {
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
      alert(`ออกใบกำกับภาษีเรียบร้อย\nเลขที่: ${result.taxInvoiceNumber}`);
      
      // Redirect to tax invoices list
      router.push('/tax-invoices');
    } catch (error: any) {
      console.error('Error issuing tax invoice:', error);
      alert(`ไม่สามารถออกใบกำกับภาษีได้: ${error.message}`);
    } finally {
      setSubmitting(false);
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

  const formatCurrency = (amount: number | string) => {
    return parseFloat(amount?.toString() || '0').toLocaleString('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Filter customers based on search
  const filteredCustomers = customers.filter(customer =>
    customer.name?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
    customer.code?.toLowerCase().includes(customerSearchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/tax-invoices">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            ย้อนกลับ
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ออกใบกำกับภาษี</h1>
          <p className="text-sm text-gray-600 mt-1">เลือก Invoice และออกใบกำกับภาษี</p>
        </div>
      </div>

      {/* Info Alert */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">เงื่อนไข Invoice ที่สามารถออกใบกำกับภาษีได้:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>Invoice ต้องยังไม่มีใบกำกับภาษี</li>
                <li>สถานะต้องไม่เป็น DRAFT, CANCELLED หรือ VOIDED</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Select Customer */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold">1</div>
              เลือกลูกค้า
            </h3>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="ค้นหาชื่อหรือรหัสลูกค้า..."
                value={customerSearchTerm}
                onChange={(e) => {
                  setCustomerSearchTerm(e.target.value);
                  setShowCustomerDropdown(true);
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              
              {/* Customer Dropdown */}
              {showCustomerDropdown && filteredCustomers.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredCustomers.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => {
                        setSelectedCustomerId(customer.id.toString());
                        setCustomerSearchTerm(customer.name);
                        setShowCustomerDropdown(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-purple-50 border-b last:border-b-0"
                    >
                      <p className="font-medium text-gray-900">{customer.name}</p>
                      <p className="text-sm text-gray-500">{customer.code}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedCustomerId && (
              <div className="mt-4 p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-900">
                  <strong>ลูกค้าที่เลือก:</strong> {customers.find(c => c.id.toString() === selectedCustomerId)?.name}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Select Invoice */}
        {selectedCustomerId && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold">2</div>
                เลือก Invoice
              </h3>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-gray-500">กำลังโหลด...</div>
              ) : invoices.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">ไม่มี Invoice ที่สามารถออกใบกำกับภาษีได้</p>
                  <p className="text-sm text-gray-400 mt-1">Invoice ทั้งหมดอาจออกใบกำกับภาษีแล้ว หรือสถานะไม่เหมาะสม</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {invoices.map((invoice) => (
                    <label
                      key={invoice.id}
                      className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedInvoiceId === invoice.id.toString()
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="invoice"
                        value={invoice.id}
                        checked={selectedInvoiceId === invoice.id.toString()}
                        onChange={(e) => setSelectedInvoiceId(e.target.value)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{invoice.invoiceNumber}</p>
                            <p className="text-sm text-gray-600 mt-1">
                              ใบเสนอราคา: {invoice.quotation?.quotationNumber || '-'}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(invoice.invoiceDate)}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                invoice.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                invoice.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                invoice.status === 'PAID' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {invoice.status}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-purple-600">
                              {formatCurrency(invoice.grandTotal)} ฿
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              VAT: {formatCurrency(invoice.vatAmount)} ฿
                            </p>
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Summary & Submit */}
        {selectedInvoice && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold">3</div>
                สรุปข้อมูล
              </h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">เลขที่ Invoice</p>
                    <p className="font-medium">{selectedInvoice.invoiceNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">เลขที่ใบเสนอราคา</p>
                    <p className="font-medium">{selectedInvoice.quotation?.quotationNumber || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">ลูกค้า</p>
                    <p className="font-medium">{selectedInvoice.customer?.name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">วันที่ Invoice</p>
                    <p className="font-medium">{formatDate(selectedInvoice.invoiceDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">ยอดรวม (ก่อน VAT)</p>
                    <p className="font-medium">{formatCurrency(selectedInvoice.subtotal)} ฿</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">VAT 7%</p>
                    <p className="font-medium">{formatCurrency(selectedInvoice.vatAmount)} ฿</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600">ยอดสุทธิ</p>
                    <p className="text-2xl font-bold text-purple-600">{formatCurrency(selectedInvoice.grandTotal)} ฿</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <div className="text-sm text-green-900">
                    <p className="font-medium">พร้อมออกใบกำกับภาษี</p>
                    <p className="text-green-700">ระบบจะสร้างเลขที่ใบกำกับภาษีอัตโนมัติ</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="flex-1"
                  >
                    {submitting ? (
                      <>กำลังออกใบกำกับภาษี...</>
                    ) : (
                      <>
                        <FileCheck className="w-4 h-4 mr-2" />
                        ออกใบกำกับภาษี
                      </>
                    )}
                  </Button>
                  <Link href="/tax-invoices">
                    <Button type="button" variant="outline">
                      ยกเลิก
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </form>
    </div>
  );
}
