'use client';

import { useState, useEffect, use } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, User, Phone, Mail, MapPin, Globe, Building, FileText, Receipt } from 'lucide-react';
import Link from 'next/link';

interface Customer {
  id: string;
  code: string;
  name: string;
  taxId: string | null;
  email: string | null;
  phone: string | null;
  fax: string | null;
  customerFrom: string | null;
  socialId: string | null;
  address: string | null;
  source: string | null;
  contactName: string | null;
  contactPhone: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    quotations: number;
    invoices: number;
  };
}

const sourceLabels: Record<string, string> = {
  google: 'Google',
  facebook: 'Facebook',
  line: 'LINE',
  website: 'Website',
  tiktok: 'TikTok',
  referral: 'แนะนำ',
  other: 'อื่นๆ',
};

const sourceColors: Record<string, string> = {
  google: 'bg-red-100 text-red-700',
  facebook: 'bg-blue-100 text-blue-700',
  line: 'bg-green-100 text-green-700',
  website: 'bg-purple-100 text-purple-700',
  tiktok: 'bg-pink-100 text-pink-700',
  referral: 'bg-yellow-100 text-yellow-700',
  other: 'bg-gray-100 text-gray-700',
};

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomer();
  }, [id]);

  const fetchCustomer = async () => {
    try {
      const response = await fetch(`/api/customers/${id}`);
      if (response.ok) {
        const data = await response.json();
        setCustomer(data);
      }
    } catch (error) {
      console.error('Error fetching customer:', error);
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

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-gray-500 mb-4">ไม่พบข้อมูลลูกค้า</p>
        <Link href="/customers">
          <Button variant="outline">กลับไปรายการลูกค้า</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/customers">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              กลับ
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
              <Badge variant={customer.isActive ? 'success' : 'warning'}>
                {customer.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}
              </Badge>
            </div>
            <p className="text-gray-600">รหัส: {customer.code}</p>
          </div>
        </div>
        <Link href={`/customers/${id}/edit`}>
          <Button>
            <Edit className="w-4 h-4 mr-2" />
            แก้ไข
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">ใบเสนอราคา</p>
                <p className="text-2xl font-bold">{customer._count?.quotations || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <Receipt className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">ใบแจ้งหนี้</p>
                <p className="text-2xl font-bold">{customer._count?.invoices || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Globe className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">ที่มา</p>
                {customer.source ? (
                  <span className={`inline-block px-2 py-1 rounded-full text-sm font-medium ${sourceColors[customer.source] || 'bg-gray-100 text-gray-700'}`}>
                    {sourceLabels[customer.source] || customer.source}
                  </span>
                ) : (
                  <p className="text-gray-400">-</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ข้อมูลลูกค้า */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 font-semibold">
              <User className="w-5 h-5" />
              ข้อมูลลูกค้า
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-500">รหัสลูกค้า</span>
                <p className="font-medium">{customer.code}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">สถานะ</span>
                <div className="mt-1">
                  <Badge variant={customer.isActive ? 'success' : 'warning'}>
                    {customer.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}
                  </Badge>
                </div>
              </div>
            </div>

            <div>
              <span className="text-sm text-gray-500">ชื่อลูกค้า / ชื่อบริษัท</span>
              <p className="font-medium">{customer.name}</p>
            </div>

            <div>
              <span className="text-sm text-gray-500">เลขประจำตัวผู้เสียภาษี</span>
              <p className="font-medium">{customer.taxId || '-'}</p>
            </div>

            <div>
              <span className="text-sm text-gray-500">Social ID</span>
              <p className="font-medium text-lg">{customer.socialId || '-'}</p>
            </div>
          </CardContent>
        </Card>

        {/* ข้อมูลติดต่อ */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 font-semibold">
              <Phone className="w-5 h-5" />
              ข้อมูลติดต่อ
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-sm text-gray-500">อีเมล</span>
              <div className="flex items-center gap-2 mt-1">
                <Mail className="w-4 h-4 text-gray-400" />
                <p className="font-medium">{customer.email || '-'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-500">เบอร์โทรศัพท์</span>
                <div className="flex items-center gap-2 mt-1">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <p className="font-medium">{customer.phone || '-'}</p>
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-500">Fax</span>
                <p className="font-medium">{customer.fax || '-'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-500">ชื่อผู้ติดต่อ</span>
                <p className="font-medium">{customer.contactName || '-'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">เบอร์ผู้ติดต่อ</span>
                <p className="font-medium">{customer.contactPhone || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ที่อยู่ */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2 font-semibold">
              <MapPin className="w-5 h-5" />
              ที่อยู่และหมายเหตุ
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-sm text-gray-500">ที่อยู่ลูกค้า</span>
              <p className="font-medium whitespace-pre-wrap">{customer.address || '-'}</p>
            </div>

            <div>
              <span className="text-sm text-gray-500">หมายเหตุ</span>
              <p className="font-medium whitespace-pre-wrap">{customer.notes || '-'}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <span className="text-sm text-gray-500">วันที่สร้าง</span>
                <p className="font-medium">
                  {new Date(customer.createdAt).toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">แก้ไขล่าสุด</span>
                <p className="font-medium">
                  {new Date(customer.updatedAt).toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
