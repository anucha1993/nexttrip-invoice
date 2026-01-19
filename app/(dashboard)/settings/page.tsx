'use client';

import { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { User, Building, CreditCard, Bell, Shield, Palette } from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('company');

  const tabs = [
    { id: 'company', label: 'ข้อมูลบริษัท', icon: Building },
    { id: 'invoice', label: 'ตั้งค่าใบแจ้งหนี้', icon: CreditCard },
    { id: 'notification', label: 'การแจ้งเตือน', icon: Bell },
    { id: 'account', label: 'บัญชี', icon: User },
    { id: 'security', label: 'ความปลอดภัย', icon: Shield },
    { id: 'appearance', label: 'การแสดงผล', icon: Palette },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">ตั้งค่า</h1>
        <p className="text-gray-500 mt-1">จัดการการตั้งค่าระบบ</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Tabs */}
        <div className="lg:w-64 flex-shrink-0">
          <Card className="p-2">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </nav>
          </Card>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          {activeTab === 'company' && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900">ข้อมูลบริษัท</h3>
                <p className="text-sm text-gray-500">ข้อมูลนี้จะแสดงในใบแจ้งหนี้</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input label="ชื่อบริษัท" defaultValue="NextTrip Travel Co., Ltd." />
                <Input label="เลขประจำตัวผู้เสียภาษี" defaultValue="0123456789012" />
                <Input label="ที่อยู่" defaultValue="123 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110" />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="เบอร์โทรศัพท์" defaultValue="02-123-4567" />
                  <Input label="อีเมล" defaultValue="info@nexttrip.co.th" />
                </div>
                <Input label="เว็บไซต์" defaultValue="https://nexttrip.co.th" />
                <div className="pt-4">
                  <Button>บันทึกการเปลี่ยนแปลง</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'invoice' && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900">ตั้งค่าใบแจ้งหนี้</h3>
                <p className="text-sm text-gray-500">กำหนดรูปแบบและค่าเริ่มต้นของใบแจ้งหนี้</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input label="คำนำหน้าเลขที่ใบแจ้งหนี้" defaultValue="INV-" />
                <Input label="หมายเลขใบแจ้งหนี้ถัดไป" defaultValue="2026-007" type="text" />
                <Select
                  label="กำหนดชำระเริ่มต้น (วัน)"
                  options={[
                    { value: '7', label: '7 วัน' },
                    { value: '14', label: '14 วัน' },
                    { value: '30', label: '30 วัน' },
                    { value: '60', label: '60 วัน' },
                  ]}
                  defaultValue="30"
                />
                <Select
                  label="อัตราภาษีมูลค่าเพิ่ม"
                  options={[
                    { value: '0', label: 'ไม่รวม VAT' },
                    { value: '7', label: '7%' },
                  ]}
                  defaultValue="7"
                />
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">หมายเหตุเริ่มต้น</label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    defaultValue="ขอบคุณที่ใช้บริการ NextTrip Travel"
                  />
                </div>
                <div className="pt-4">
                  <Button>บันทึกการเปลี่ยนแปลง</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'notification' && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900">การแจ้งเตือน</h3>
                <p className="text-sm text-gray-500">ตั้งค่าการแจ้งเตือนทางอีเมลและในระบบ</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <p className="font-medium text-gray-900">ใบแจ้งหนี้ใหม่</p>
                    <p className="text-sm text-gray-500">รับการแจ้งเตือนเมื่อมีใบแจ้งหนี้ใหม่</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <p className="font-medium text-gray-900">การชำระเงิน</p>
                    <p className="text-sm text-gray-500">รับการแจ้งเตือนเมื่อมีการชำระเงิน</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <p className="font-medium text-gray-900">ใบแจ้งหนี้เกินกำหนด</p>
                    <p className="text-sm text-gray-500">รับการแจ้งเตือนเมื่อใบแจ้งหนี้เกินกำหนดชำระ</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-gray-900">รายงานประจำสัปดาห์</p>
                    <p className="text-sm text-gray-500">รับสรุปรายงานทุกสัปดาห์ทางอีเมล</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'account' && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900">บัญชี</h3>
                <p className="text-sm text-gray-500">จัดการข้อมูลบัญชีของคุณ</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 pb-4 border-b">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-10 h-10 text-blue-600" />
                  </div>
                  <div>
                    <Button variant="outline" size="sm">เปลี่ยนรูปโปรไฟล์</Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="ชื่อ" defaultValue="Admin" />
                  <Input label="นามสกุล" defaultValue="User" />
                </div>
                <Input label="อีเมล" defaultValue="admin@nexttrip.com" type="email" />
                <Input label="เบอร์โทรศัพท์" defaultValue="081-234-5678" />
                <div className="pt-4">
                  <Button>บันทึกการเปลี่ยนแปลง</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'security' && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900">ความปลอดภัย</h3>
                <p className="text-sm text-gray-500">จัดการการตั้งค่าความปลอดภัยของบัญชี</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">เปลี่ยนรหัสผ่าน</h4>
                  <Input label="รหัสผ่านปัจจุบัน" type="password" />
                  <Input label="รหัสผ่านใหม่" type="password" />
                  <Input label="ยืนยันรหัสผ่านใหม่" type="password" />
                  <Button>อัปเดตรหัสผ่าน</Button>
                </div>
                <hr />
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">การยืนยันตัวตนแบบสองขั้นตอน (2FA)</h4>
                  <p className="text-sm text-gray-500">
                    เพิ่มความปลอดภัยให้บัญชีของคุณด้วยการยืนยันตัวตนแบบสองขั้นตอน
                  </p>
                  <Button variant="outline">เปิดใช้งาน 2FA</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'appearance' && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900">การแสดงผล</h3>
                <p className="text-sm text-gray-500">ปรับแต่งการแสดงผลของระบบ</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select
                  label="ธีม"
                  options={[
                    { value: 'light', label: 'สว่าง' },
                    { value: 'dark', label: 'มืด' },
                    { value: 'system', label: 'ตามระบบ' },
                  ]}
                  defaultValue="light"
                />
                <Select
                  label="ภาษา"
                  options={[
                    { value: 'th', label: 'ไทย' },
                    { value: 'en', label: 'English' },
                  ]}
                  defaultValue="th"
                />
                <Select
                  label="รูปแบบวันที่"
                  options={[
                    { value: 'dd/mm/yyyy', label: 'DD/MM/YYYY' },
                    { value: 'mm/dd/yyyy', label: 'MM/DD/YYYY' },
                    { value: 'yyyy-mm-dd', label: 'YYYY-MM-DD' },
                  ]}
                  defaultValue="dd/mm/yyyy"
                />
                <div className="pt-4">
                  <Button>บันทึกการเปลี่ยนแปลง</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
