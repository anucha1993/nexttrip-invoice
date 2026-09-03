'use client';

// app/(dashboard)/settings/formulas/page.tsx
// รวมสูตรคำนวณของทุก "ประเภทเอกสาร" (โมดูล) ไว้ที่เดียว — เพิ่มโมดูลใหม่ที่
// lib/formula-modules.ts แล้วจะโผล่มาในหน้านี้อัตโนมัติ ไม่ต้องแก้หน้านี้

import Link from 'next/link';
import { ArrowLeft, TrendingUp, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { FORMULA_MODULE_LIST } from '@/lib/formula-modules';

export default function FormulaModulesIndexPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6" />
            สูตรคำนวณ
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            แยกสูตรตามประเภทเอกสาร — เลือกประเภทที่ต้องการตั้งค่า
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FORMULA_MODULE_LIST.map((mod) => (
          <Link key={mod.key} href={`/settings/formulas/${mod.key}`}>
            <Card className="hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer h-full">
              <CardContent className="flex items-center justify-between gap-3 py-5">
                <div>
                  <p className="font-semibold text-gray-900">{mod.label}</p>
                  <p className="text-xs text-gray-500 mt-1">{mod.variables.length} ตัวแปร</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-3">
        ต้องการตั้งค่าสูตรของเอกสารประเภทอื่น (ใบแจ้งหนี้/ใบเสร็จ/ใบลดหนี้/ใบเพิ่มหนี้ ฯลฯ) ที่ยังไม่เห็นในนี้ —
        แจ้งทีมพัฒนาให้ลงทะเบียนโมดูลเพิ่ม
      </div>
    </div>
  );
}
