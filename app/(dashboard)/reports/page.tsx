'use client';

import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useState } from 'react';
import { Download, TrendingUp, TrendingDown, DollarSign, FileText, Users } from 'lucide-react';

export default function ReportsPage() {
  const [period, setPeriod] = useState('month');

  // Mock data for reports
  const summaryData = {
    totalRevenue: 2640000,
    revenueChange: 12.5,
    totalInvoices: 156,
    invoiceChange: 8.3,
    newCustomers: 15,
    customerChange: 25,
    averageInvoice: 16923,
    avgChange: 5.2,
  };

  const monthlyData = [
    { month: 'มกราคม', invoices: 12, revenue: 185000, paid: 10, pending: 2 },
    { month: 'กุมภาพันธ์', invoices: 15, revenue: 225000, paid: 13, pending: 2 },
    { month: 'มีนาคม', invoices: 18, revenue: 270000, paid: 16, pending: 2 },
    { month: 'เมษายน', invoices: 22, revenue: 350000, paid: 20, pending: 2 },
    { month: 'พฤษภาคม', invoices: 14, revenue: 210000, paid: 12, pending: 2 },
    { month: 'มิถุนายน', invoices: 11, revenue: 165000, paid: 10, pending: 1 },
  ];

  const topCustomers = [
    { name: 'ประเสริฐ มั่งมี', invoices: 12, totalSpent: 285000 },
    { name: 'วิชัย เดินทาง', invoices: 8, totalSpent: 142000 },
    { name: 'สมชาย ใจดี', invoices: 5, totalSpent: 85000 },
    { name: 'นิภา ท่องเที่ยว', invoices: 4, totalSpent: 68000 },
    { name: 'สมหญิง รักเที่ยว', invoices: 3, totalSpent: 56000 },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">รายงาน</h1>
          <p className="text-gray-500 mt-1">ดูสรุปรายงานและวิเคราะห์ข้อมูล</p>
        </div>
        <div className="flex gap-3">
          <Select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            options={[
              { value: 'week', label: 'สัปดาห์นี้' },
              { value: 'month', label: 'เดือนนี้' },
              { value: 'quarter', label: 'ไตรมาสนี้' },
              { value: 'year', label: 'ปีนี้' },
            ]}
            className="w-36"
          />
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            ดาวน์โหลดรายงาน
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">รายได้รวม</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(summaryData.totalRevenue)}</p>
              <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
                <TrendingUp className="w-4 h-4" />
                +{summaryData.revenueChange}%
              </div>
            </div>
            <div className="p-3 bg-green-100 rounded-xl">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">ใบแจ้งหนี้ทั้งหมด</p>
              <p className="text-2xl font-bold mt-1">{summaryData.totalInvoices}</p>
              <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
                <TrendingUp className="w-4 h-4" />
                +{summaryData.invoiceChange}%
              </div>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">ลูกค้าใหม่</p>
              <p className="text-2xl font-bold mt-1">{summaryData.newCustomers}</p>
              <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
                <TrendingUp className="w-4 h-4" />
                +{summaryData.customerChange}%
              </div>
            </div>
            <div className="p-3 bg-purple-100 rounded-xl">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">มูลค่าเฉลี่ย/ใบ</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(summaryData.averageInvoice)}</p>
              <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
                <TrendingUp className="w-4 h-4" />
                +{summaryData.avgChange}%
              </div>
            </div>
            <div className="p-3 bg-yellow-100 rounded-xl">
              <DollarSign className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Report Table */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">รายงานรายเดือน</h3>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">เดือน</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">ใบแจ้งหนี้</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">รายได้</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">ชำระแล้ว</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {monthlyData.map((row) => (
                  <tr key={row.month} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{row.month}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">{row.invoices}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">
                      {formatCurrency(row.revenue)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className="text-green-600">{row.paid}</span>
                      <span className="text-gray-400"> / </span>
                      <span className="text-yellow-600">{row.pending}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">ลูกค้ายอดซื้อสูงสุด</h3>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {topCustomers.map((customer, index) => (
                <div
                  key={customer.name}
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-sm font-medium flex items-center justify-center">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{customer.name}</p>
                      <p className="text-sm text-gray-500">{customer.invoices} ใบแจ้งหนี้</p>
                    </div>
                  </div>
                  <p className="font-medium text-gray-900">
                    {formatCurrency(customer.totalSpent)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Status Chart */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">สถานะใบแจ้งหนี้</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <div className="text-3xl font-bold text-gray-600">8</div>
              <div className="text-sm text-gray-500 mt-1">ร่าง</div>
              <div className="w-full h-2 bg-gray-200 rounded-full mt-2">
                <div className="h-2 bg-gray-400 rounded-full" style={{ width: '5%' }}></div>
              </div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-xl">
              <div className="text-3xl font-bold text-yellow-600">23</div>
              <div className="text-sm text-gray-500 mt-1">รอชำระ</div>
              <div className="w-full h-2 bg-yellow-200 rounded-full mt-2">
                <div className="h-2 bg-yellow-500 rounded-full" style={{ width: '15%' }}></div>
              </div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-xl">
              <div className="text-3xl font-bold text-green-600">120</div>
              <div className="text-sm text-gray-500 mt-1">ชำระแล้ว</div>
              <div className="w-full h-2 bg-green-200 rounded-full mt-2">
                <div className="h-2 bg-green-500 rounded-full" style={{ width: '77%' }}></div>
              </div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-xl">
              <div className="text-3xl font-bold text-red-600">5</div>
              <div className="text-sm text-gray-500 mt-1">เกินกำหนด</div>
              <div className="w-full h-2 bg-red-200 rounded-full mt-2">
                <div className="h-2 bg-red-500 rounded-full" style={{ width: '3%' }}></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
