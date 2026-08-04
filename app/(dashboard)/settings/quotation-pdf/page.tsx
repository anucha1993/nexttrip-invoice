'use client';

// app/(dashboard)/settings/quotation-pdf/page.tsx
// ตั้งค่าหัวเอกสาร PDF ใบเสนอราคา: โลโก้, ลายเซ็นผู้อนุมัติ, ข้อมูลบริษัท, บัญชีธนาคาร

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, Loader2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface LetterheadSettings {
  quotation_pdf_logo_url: string;
  quotation_pdf_signature_url: string;
  quotation_pdf_signature_name: string;
  quotation_pdf_company_name: string;
  quotation_pdf_company_address: string;
  quotation_pdf_company_phone: string;
  quotation_pdf_company_hotline: string;
  quotation_pdf_company_license: string;
  quotation_pdf_company_website: string;
  quotation_pdf_company_email: string;
  quotation_pdf_bank_name: string;
  quotation_pdf_bank_type: string;
  quotation_pdf_bank_branch: string;
  quotation_pdf_bank_account: string;
  quotation_pdf_footer_note: string;
}

const EMPTY: LetterheadSettings = {
  quotation_pdf_logo_url: '',
  quotation_pdf_signature_url: '',
  quotation_pdf_signature_name: '',
  quotation_pdf_company_name: '',
  quotation_pdf_company_address: '',
  quotation_pdf_company_phone: '',
  quotation_pdf_company_hotline: '',
  quotation_pdf_company_license: '',
  quotation_pdf_company_website: '',
  quotation_pdf_company_email: '',
  quotation_pdf_bank_name: '',
  quotation_pdf_bank_type: '',
  quotation_pdf_bank_branch: '',
  quotation_pdf_bank_account: '',
  quotation_pdf_footer_note: '',
};

function ImageUploadField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'letterhead');
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        onChange(data.url);
      } else {
        alert('อัปโหลดไม่สำเร็จ');
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex items-center gap-3">
        <div className="w-32 h-20 border border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt={label} className="max-w-full max-h-full object-contain" />
          ) : (
            <span className="text-xs text-gray-400">ไม่มีรูป</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = '';
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            อัปโหลดรูป
          </Button>
          {value && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange('')}>
              <X className="w-4 h-4 mr-1" /> ลบรูป
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function QuotationPdfSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<LetterheadSettings>(EMPTY);

  useEffect(() => {
    void loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/quotation-pdf');
      if (res.ok) {
        const data = await res.json();
        setForm({ ...EMPTY, ...data });
      }
    } finally {
      setLoading(false);
    }
  };

  const set = (key: keyof LetterheadSettings, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/quotation-pdf', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        alert('บันทึกการตั้งค่าเรียบร้อย');
      } else {
        const err = await res.json();
        alert(err.error || 'บันทึกไม่สำเร็จ');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/settings">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            กลับ
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            หัวเอกสาร PDF ใบเสนอราคา
          </h1>
          <p className="text-sm text-gray-500">โลโก้ ลายเซ็น และข้อมูลบริษัทที่แสดงบน PDF ใบเสนอราคา</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <h3 className="font-semibold text-gray-900">โลโก้ / ลายเซ็น</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <ImageUploadField
            label="โลโก้บริษัท"
            value={form.quotation_pdf_logo_url}
            onChange={(url) => set('quotation_pdf_logo_url', url)}
          />
          <ImageUploadField
            label="ลายเซ็นผู้อนุมัติ"
            value={form.quotation_pdf_signature_url}
            onChange={(url) => set('quotation_pdf_signature_url', url)}
          />
          <Input
            label="ชื่อ/ตำแหน่งผู้อนุมัติ"
            value={form.quotation_pdf_signature_name}
            onChange={(e) => set('quotation_pdf_signature_name', e.target.value)}
            placeholder="ผู้อนุมัติ"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="font-semibold text-gray-900">ข้อมูลบริษัท</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="ชื่อบริษัท"
            value={form.quotation_pdf_company_name}
            onChange={(e) => set('quotation_pdf_company_name', e.target.value)}
          />
          <Input
            label="ที่อยู่"
            value={form.quotation_pdf_company_address}
            onChange={(e) => set('quotation_pdf_company_address', e.target.value)}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="เบอร์โทรศัพท์"
              value={form.quotation_pdf_company_phone}
              onChange={(e) => set('quotation_pdf_company_phone', e.target.value)}
            />
            <Input
              label="Hotline"
              value={form.quotation_pdf_company_hotline}
              onChange={(e) => set('quotation_pdf_company_hotline', e.target.value)}
            />
          </div>
          <Input
            label="เลขที่ใบอนุญาต (TAT / TTAA)"
            value={form.quotation_pdf_company_license}
            onChange={(e) => set('quotation_pdf_company_license', e.target.value)}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="เว็บไซต์"
              value={form.quotation_pdf_company_website}
              onChange={(e) => set('quotation_pdf_company_website', e.target.value)}
            />
            <Input
              label="อีเมล"
              value={form.quotation_pdf_company_email}
              onChange={(e) => set('quotation_pdf_company_email', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="font-semibold text-gray-900">บัญชีธนาคารสำหรับแจ้งชำระเงิน</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="ธนาคาร"
              value={form.quotation_pdf_bank_name}
              onChange={(e) => set('quotation_pdf_bank_name', e.target.value)}
            />
            <Input
              label="ประเภทบัญชี"
              value={form.quotation_pdf_bank_type}
              onChange={(e) => set('quotation_pdf_bank_type', e.target.value)}
            />
            <Input
              label="สาขา"
              value={form.quotation_pdf_bank_branch}
              onChange={(e) => set('quotation_pdf_bank_branch', e.target.value)}
            />
            <Input
              label="เลขบัญชี"
              value={form.quotation_pdf_bank_account}
              onChange={(e) => set('quotation_pdf_bank_account', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="font-semibold text-gray-900">หมายเหตุท้ายเอกสาร</h3>
        </CardHeader>
        <CardContent>
          <textarea
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            value={form.quotation_pdf_footer_note}
            onChange={(e) => set('quotation_pdf_footer_note', e.target.value)}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          บันทึกการตั้งค่า
        </Button>
      </div>
    </div>
  );
}
