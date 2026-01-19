'use client';

import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Invoice } from '@/types';
import { Eye, Edit, Trash2, MoreVertical } from 'lucide-react';
import { useState } from 'react';

interface RecentInvoicesProps {
  invoices: Invoice[];
}

export function RecentInvoices({ invoices }: RecentInvoicesProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const getStatusBadge = (status: Invoice['status']) => {
    const statusConfig = {
      draft: { variant: 'default' as const, label: 'ร่าง' },
      pending: { variant: 'warning' as const, label: 'รอชำระ' },
      paid: { variant: 'success' as const, label: 'ชำระแล้ว' },
      overdue: { variant: 'danger' as const, label: 'เกินกำหนด' },
      cancelled: { variant: 'default' as const, label: 'ยกเลิก' },
    };
    return statusConfig[status];
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">ใบแจ้งหนี้ล่าสุด</h3>
        <a
          href="/dashboard/invoices"
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          ดูทั้งหมด
        </a>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-gray-100">
          {invoices.map((invoice) => {
            const status = getStatusBadge(invoice.status);
            return (
              <div
                key={invoice.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-medium text-gray-900">
                      {invoice.invoiceNumber}
                    </p>
                    <p className="text-sm text-gray-500">{invoice.customerName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {formatCurrency(invoice.total)}
                    </p>
                    <p className="text-sm text-gray-500">{invoice.dueDate}</p>
                  </div>
                  <Badge variant={status.variant}>{status.label}</Badge>
                  <div className="relative">
                    <button
                      onClick={() =>
                        setOpenMenu(openMenu === invoice.id ? null : invoice.id)
                      }
                      className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {openMenu === invoice.id && (
                      <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                        <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                          <Eye className="w-4 h-4" />
                          ดูรายละเอียด
                        </button>
                        <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                          <Edit className="w-4 h-4" />
                          แก้ไข
                        </button>
                        <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                          ลบ
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
