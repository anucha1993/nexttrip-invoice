'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  CreditCard, 
  Plus, 
  Search, 
  Filter,
  Eye,
  FileText,
  Calendar,
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle,
  ArrowUpDown,
  ChevronRight,
  ChevronDown,
  Receipt,
  Users,
  Pencil,
  Save,
  X,
  Loader2
} from 'lucide-react';
import { useCurrentUser } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface Transaction {
  id: number;
  transactionNumber: string;
  transactionType: 'PAYMENT' | 'REFUND';
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  status: string;
  invoiceId: number;
  invoiceNumber: string;
  quotationId: number;
  quotationNumber: string;
  tourName: string;
  customerName: string;
  receiptNumber: string | null;
  creditNoteNumber: string | null;
  referenceNumber: string | null;
  notes: string | null;
  createdAt: string;
}

interface GroupedData {
  quotationId: number;
  quotationNumber: string;
  tourName: string;
  customerName: string;
  invoices: {
    invoiceId: number;
    invoiceNumber: string;
    grandTotal: number;
    totalPaid: number;
    totalRefunded: number;
    transactions: Transaction[];
  }[];
}

interface BankAccount {
  id: number;
  accountName: string;
  accountNumber: string;
  bankId: number;
  bankNameTH: string;
  displayName: string;
}

interface Bank {
  id: number;
  nameTH: string;
  nameEN: string;
}

const paymentMethodLabels: Record<string, string> = {
  CASH: 'เงินสด',
  TRANSFER: 'โอนเงิน',
  CREDIT_CARD: 'บัตรเครดิต',
  CHEQUE: 'เช็ค',
};

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: 'รอยืนยัน', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  CONFIRMED: { label: 'ยืนยันแล้ว', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  CANCELLED: { label: 'ยกเลิก', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export default function PaymentsPage() {
  const router = useRouter();
  const { userId, userName } = useCurrentUser();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [expandedQuotations, setExpandedQuotations] = useState<Set<number>>(new Set());
  const [expandedInvoices, setExpandedInvoices] = useState<Set<number>>(new Set());

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editFormData, setEditFormData] = useState({
    amount: '',
    paymentMethod: 'TRANSFER',
    paymentDate: '',
    referenceNumber: '',
    notes: '',
    refundReason: '',
    bankAccountId: '',
    chequeNumber: '',
    chequeDate: '',
    chequeBankId: '',
  });
  const [saving, setSaving] = useState(false);

  // Banks and accounts for edit modal
  const [banks, setBanks] = useState<Bank[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  useEffect(() => {
    fetchTransactions();
  }, [filterType, filterStatus]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('limit', '500'); // Get more to group properly
      if (filterType) params.set('type', filterType);
      if (filterStatus) params.set('status', filterStatus);

      const response = await fetch(`/api/customer-transactions?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch banks and accounts for edit modal
  const fetchBanksAndAccounts = async () => {
    try {
      const [banksRes, accountsRes] = await Promise.all([
        fetch('/api/banks'),
        fetch('/api/bank-accounts')
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

  // Open edit modal
  const openEditModal = async (tx: Transaction) => {
    // Fetch banks if not loaded
    if (banks.length === 0) {
      await fetchBanksAndAccounts();
    }

    setEditingTransaction(tx);
    // Format datetime for datetime-local input
    const paymentDate = tx.paymentDate ? new Date(tx.paymentDate).toISOString().slice(0, 16) : '';
    setEditFormData({
      amount: tx.amount.toString(),
      paymentMethod: tx.paymentMethod,
      paymentDate: paymentDate,
      referenceNumber: tx.referenceNumber || '',
      notes: tx.notes || '',
      refundReason: '',
      bankAccountId: '',
      chequeNumber: '',
      chequeDate: '',
      chequeBankId: '',
    });
    setEditModalOpen(true);
  };

  // Close edit modal
  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditingTransaction(null);
  };

  // Save transaction edit
  const handleSaveEdit = async () => {
    if (!editingTransaction) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/customer-transactions/${editingTransaction.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(editFormData.amount),
          paymentMethod: editFormData.paymentMethod,
          paymentDate: editFormData.paymentDate,
          referenceNumber: editFormData.referenceNumber,
          notes: editFormData.notes,
          bankAccountId: editFormData.bankAccountId ? parseInt(editFormData.bankAccountId) : null,
          chequeNumber: editFormData.chequeNumber || null,
          chequeDate: editFormData.chequeDate || null,
          chequeBankId: editFormData.chequeBankId ? parseInt(editFormData.chequeBankId) : null,
          updatedById: userId,
          updatedByName: userName,
        }),
      });

      if (response.ok) {
        // Refresh transactions
        await fetchTransactions();
        closeEditModal();
        alert('บันทึกการแก้ไขเรียบร้อย');
      } else {
        const error = await response.json();
        alert(error.error || 'เกิดข้อผิดพลาดในการบันทึก');
      }
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSaving(false);
    }
  };

  // Group transactions by quotation -> invoice
  const groupedData: GroupedData[] = (() => {
    const filtered = transactions.filter(t => 
      t.transactionNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.quotationNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.receiptNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.tourName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const quotationMap = new Map<number, GroupedData>();
    
    filtered.forEach(tx => {
      if (!quotationMap.has(tx.quotationId)) {
        quotationMap.set(tx.quotationId, {
          quotationId: tx.quotationId,
          quotationNumber: tx.quotationNumber,
          tourName: tx.tourName,
          customerName: tx.customerName,
          invoices: [],
        });
      }
      
      const quotation = quotationMap.get(tx.quotationId)!;
      let invoice = quotation.invoices.find(i => i.invoiceId === tx.invoiceId);
      
      if (!invoice) {
        invoice = {
          invoiceId: tx.invoiceId,
          invoiceNumber: tx.invoiceNumber,
          grandTotal: 0,
          totalPaid: 0,
          totalRefunded: 0,
          transactions: [],
        };
        quotation.invoices.push(invoice);
      }
      
      invoice.transactions.push(tx);
      
      if (tx.status === 'CONFIRMED') {
        if (tx.transactionType === 'PAYMENT') {
          invoice.totalPaid += tx.amount;
        } else {
          invoice.totalRefunded += tx.amount;
        }
      }
    });
    
    return Array.from(quotationMap.values()).sort((a, b) => 
      b.quotationNumber.localeCompare(a.quotationNumber)
    );
  })();

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const toggleQuotation = (quotationId: number) => {
    const newExpanded = new Set(expandedQuotations);
    if (newExpanded.has(quotationId)) {
      newExpanded.delete(quotationId);
    } else {
      newExpanded.add(quotationId);
    }
    setExpandedQuotations(newExpanded);
  };

  const toggleInvoice = (invoiceId: number) => {
    const newExpanded = new Set(expandedInvoices);
    if (newExpanded.has(invoiceId)) {
      newExpanded.delete(invoiceId);
    } else {
      newExpanded.add(invoiceId);
    }
    setExpandedInvoices(newExpanded);
  };

  // Calculate totals
  const totalPayments = transactions
    .filter(t => t.transactionType === 'PAYMENT' && t.status === 'CONFIRMED')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalRefunds = transactions
    .filter(t => t.transactionType === 'REFUND' && t.status === 'CONFIRMED')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg shadow-green-500/25">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            การรับชำระเงิน
          </h1>
          <p className="text-gray-500 mt-1 ml-12">จัดการการรับชำระเงินและคืนเงินทั้งหมด</p>
        </div>
        <div className="flex gap-2">
          <Link href="/finance/payments/refund">
            <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">
              <RefreshCw className="w-4 h-4 mr-2" />
              บันทึกคืนเงิน
            </Button>
          </Link>
          <Link href="/finance/payments/create">
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              บันทึกรับเงิน
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">จำนวนใบเสนอราคา</p>
                <p className="text-2xl font-bold text-blue-700">{groupedData.length}</p>
              </div>
              <div className="p-3 bg-blue-200 rounded-full">
                <FileText className="w-6 h-6 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">รับชำระแล้ว</p>
                <p className="text-2xl font-bold text-green-700">
                  ฿{totalPayments.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-3 bg-green-200 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-red-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">คืนเงินแล้ว</p>
                <p className="text-2xl font-bold text-red-700">
                  ฿{totalRefunds.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-3 bg-red-200 rounded-full">
                <RefreshCw className="w-6 h-6 text-red-700" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600">ยอดสุทธิ</p>
                <p className="text-2xl font-bold text-purple-700">
                  ฿{(totalPayments - totalRefunds).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-3 bg-purple-200 rounded-full">
                <CreditCard className="w-6 h-6 text-purple-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="ค้นหาเลขใบเสร็จ, ลูกค้า, ใบเสนอราคา, ทัวร์..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              className="border rounded-lg px-3 py-2 text-sm"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="">ทุกประเภท</option>
              <option value="PAYMENT">รับชำระ</option>
              <option value="REFUND">คืนเงิน</option>
            </select>
            <select
              className="border rounded-lg px-3 py-2 text-sm"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">ทุกสถานะ</option>
              <option value="PENDING">รอยืนยัน</option>
              <option value="CONFIRMED">ยืนยันแล้ว</option>
              <option value="CANCELLED">ยกเลิก</option>
            </select>
            <Button variant="outline" onClick={fetchTransactions}>
              <RefreshCw className="w-4 h-4 mr-2" />
              รีเฟรช
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Grouped Transactions */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : groupedData.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CreditCard className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>ไม่พบรายการธุรกรรม</p>
            </div>
          ) : (
            <div className="divide-y">
              {groupedData.map((quotation) => {
                const isQuotationExpanded = expandedQuotations.has(quotation.quotationId);
                const quotationTotalPaid = quotation.invoices.reduce((sum, inv) => sum + inv.totalPaid, 0);
                const quotationTotalRefunded = quotation.invoices.reduce((sum, inv) => sum + inv.totalRefunded, 0);
                const transactionCount = quotation.invoices.reduce((sum, inv) => sum + inv.transactions.length, 0);
                
                return (
                  <div key={quotation.quotationId} className="bg-white">
                    {/* Quotation Header */}
                    <div 
                      className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleQuotation(quotation.quotationId)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg transition-transform ${isQuotationExpanded ? 'rotate-90' : ''}`}>
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-blue-600">{quotation.quotationNumber}</span>
                            <span className="text-sm text-gray-500">({quotation.invoices.length} ใบแจ้งหนี้)</span>
                          </div>
                          <div className="text-sm text-gray-600">{quotation.tourName}</div>
                          <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                            <Users className="w-3 h-3" />
                            {quotation.customerName}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-xs text-gray-500">รับชำระ</div>
                          <div className="font-semibold text-green-600">
                            ฿{quotationTotalPaid.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        {quotationTotalRefunded > 0 && (
                          <div className="text-right">
                            <div className="text-xs text-gray-500">คืนเงิน</div>
                            <div className="font-semibold text-red-600">
                              -฿{quotationTotalRefunded.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        )}
                        <div className="text-right">
                          <div className="text-xs text-gray-500">สุทธิ</div>
                          <div className="font-bold text-purple-600">
                            ฿{(quotationTotalPaid - quotationTotalRefunded).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                            {transactionCount} รายการ
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Invoices under Quotation */}
                    {isQuotationExpanded && (
                      <div className="bg-gray-50 border-t">
                        {quotation.invoices.map((invoice) => {
                          const isInvoiceExpanded = expandedInvoices.has(invoice.invoiceId);
                          
                          return (
                            <div key={invoice.invoiceId} className="border-b last:border-b-0">
                              {/* Invoice Header */}
                              <div 
                                className="flex items-center justify-between px-4 py-3 pl-12 hover:bg-gray-100 cursor-pointer"
                                onClick={() => toggleInvoice(invoice.invoiceId)}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`transition-transform ${isInvoiceExpanded ? 'rotate-90' : ''}`}>
                                    <ChevronRight className="w-4 h-4 text-gray-400" />
                                  </div>
                                  <Receipt className="w-4 h-4 text-blue-500" />
                                  <span className="font-medium text-gray-700">{invoice.invoiceNumber}</span>
                                  <span className="text-xs text-gray-400">({invoice.transactions.length} รายการ)</span>
                                </div>
                                <div className="flex items-center gap-4 text-sm">
                                  <span className="text-green-600">
                                    +฿{invoice.totalPaid.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                  </span>
                                  {invoice.totalRefunded > 0 && (
                                    <span className="text-red-600">
                                      -฿{invoice.totalRefunded.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Transactions under Invoice */}
                              {isInvoiceExpanded && (
                                <div className="bg-white border-t">
                                  <table className="w-full">
                                    <thead className="bg-gray-100 text-xs text-gray-500">
                                      <tr>
                                        <th className="text-left py-2 px-4 pl-20">วันที่</th>
                                        <th className="text-left py-2 px-4">เลขที่เอกสาร</th>
                                        <th className="text-left py-2 px-4">ประเภท</th>
                                        <th className="text-right py-2 px-4">จำนวนเงิน</th>
                                        <th className="text-left py-2 px-4">วิธีชำระ</th>
                                        <th className="text-left py-2 px-4">สถานะ</th>
                                        <th className="text-center py-2 px-4">จัดการ</th>
                                      </tr>
                                    </thead>
                                    <tbody className="text-sm divide-y">
                                      {invoice.transactions.map((tx) => {
                                        const StatusIcon = statusConfig[tx.status]?.icon || Clock;
                                        return (
                                          <tr key={tx.id} className="hover:bg-gray-50">
                                            <td className="py-2 px-4 pl-20 text-gray-600">
                                              {formatDate(tx.paymentDate)}
                                            </td>
                                            <td className="py-2 px-4">
                                              <div className="font-medium">
                                                {tx.transactionType === 'PAYMENT' ? tx.receiptNumber : tx.creditNoteNumber || '-'}
                                              </div>
                                              <div className="text-xs text-gray-400">{tx.transactionNumber}</div>
                                            </td>
                                            <td className="py-2 px-4">
                                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                tx.transactionType === 'PAYMENT' 
                                                  ? 'bg-green-100 text-green-700' 
                                                  : 'bg-red-100 text-red-700'
                                              }`}>
                                                {tx.transactionType === 'PAYMENT' ? 'รับชำระ' : 'คืนเงิน'}
                                              </span>
                                            </td>
                                            <td className={`py-2 px-4 text-right font-medium ${
                                              tx.transactionType === 'PAYMENT' ? 'text-green-600' : 'text-red-600'
                                            }`}>
                                              {tx.transactionType === 'REFUND' && '-'}
                                              ฿{tx.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-2 px-4 text-gray-600">
                                              {paymentMethodLabels[tx.paymentMethod] || tx.paymentMethod}
                                            </td>
                                            <td className="py-2 px-4">
                                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                                statusConfig[tx.status]?.color || 'bg-gray-100 text-gray-700'
                                              }`}>
                                                <StatusIcon className="w-3 h-3" />
                                                {statusConfig[tx.status]?.label || tx.status}
                                              </span>
                                            </td>
                                            <td className="py-2 px-4 text-center">
                                              <button
                                                onClick={() => openEditModal(tx)}
                                                className="inline-flex items-center justify-center p-1 text-blue-600 hover:bg-blue-50 rounded"
                                                title="แก้ไข"
                                              >
                                                <Pencil className="w-4 h-4" />
                                              </button>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        
                        {/* View Quotation Dashboard Link */}
                        <div className="px-4 py-2 bg-gray-100 border-t">
                          <Link 
                            href={`/quotations/${quotation.quotationId}/dashboard`}
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            ดู Dashboard ใบเสนอราคา
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Transaction Modal */}
      {editModalOpen && editingTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                แก้ไขธุรกรรม: {editingTransaction.transactionNumber}
              </h2>
              <button
                onClick={closeEditModal}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Transaction Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">ประเภท:</span>
                    <span className={`ml-2 font-medium ${
                      editingTransaction.transactionType === 'PAYMENT' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {editingTransaction.transactionType === 'PAYMENT' ? 'รับชำระเงิน' : 'คืนเงิน'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">สถานะ:</span>
                    <span className={`ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      statusConfig[editingTransaction.status]?.color || 'bg-gray-100 text-gray-700'
                    }`}>
                      {statusConfig[editingTransaction.status]?.label || editingTransaction.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">ใบแจ้งหนี้:</span>
                    <span className="ml-2 font-medium">{editingTransaction.invoiceNumber}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">ลูกค้า:</span>
                    <span className="ml-2">{editingTransaction.customerName}</span>
                  </div>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  จำนวนเงิน (บาท) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editFormData.amount}
                  onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                  className="w-full"
                  placeholder="0.00"
                />
              </div>

              {/* Payment Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  วันที่ชำระ <span className="text-red-500">*</span>
                </label>
                <Input
                  type="datetime-local"
                  value={editFormData.paymentDate}
                  onChange={(e) => setEditFormData({ ...editFormData, paymentDate: e.target.value })}
                  className="w-full"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  วิธีชำระเงิน <span className="text-red-500">*</span>
                </label>
                <select
                  value={editFormData.paymentMethod}
                  onChange={(e) => setEditFormData({ ...editFormData, paymentMethod: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="CASH">เงินสด</option>
                  <option value="TRANSFER">โอนเงิน</option>
                  <option value="CREDIT_CARD">บัตรเครดิต</option>
                  <option value="CHEQUE">เช็ค</option>
                </select>
              </div>

              {/* Transfer: Bank Account */}
              {editFormData.paymentMethod === 'TRANSFER' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    บัญชีธนาคารที่รับโอน
                  </label>
                  {bankAccounts.length > 0 ? (
                    <select
                      value={editFormData.bankAccountId}
                      onChange={(e) => setEditFormData({ ...editFormData, bankAccountId: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- เลือกบัญชี --</option>
                      {bankAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.bankNameTH}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-sm text-gray-500 italic py-2">
                      กำลังโหลดรายการบัญชี...
                    </div>
                  )}
                </div>
              )}

              {/* Cheque fields */}
              {editFormData.paymentMethod === 'CHEQUE' && (
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ธนาคารที่ออกเช็ค
                    </label>
                    {banks.length > 0 ? (
                      <select
                        value={editFormData.chequeBankId}
                        onChange={(e) => setEditFormData({ ...editFormData, chequeBankId: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- เลือกธนาคาร --</option>
                        {banks.map(bank => (
                          <option key={bank.id} value={bank.id}>{bank.nameTH}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-sm text-gray-500 italic py-2">
                        กำลังโหลดรายการธนาคาร...
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        เลขที่เช็ค
                      </label>
                      <Input
                        value={editFormData.chequeNumber}
                        onChange={(e) => setEditFormData({ ...editFormData, chequeNumber: e.target.value })}
                        placeholder="เลขที่เช็ค"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        วันที่เช็ค
                      </label>
                      <Input
                        type="date"
                        value={editFormData.chequeDate}
                        onChange={(e) => setEditFormData({ ...editFormData, chequeDate: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Reference Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  เลขอ้างอิง
                </label>
                <Input
                  type="text"
                  value={editFormData.referenceNumber}
                  onChange={(e) => setEditFormData({ ...editFormData, referenceNumber: e.target.value })}
                  className="w-full"
                  placeholder="เลขอ้างอิงการโอน / เช็ค"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  หมายเหตุ
                </label>
                <textarea
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="หมายเหตุเพิ่มเติม..."
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <Button
                variant="outline"
                onClick={closeEditModal}
                disabled={saving}
              >
                ยกเลิก
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={saving || !editFormData.amount || !editFormData.paymentDate}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    บันทึกการแก้ไข
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
