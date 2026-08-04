'use client';

// app/(dashboard)/settings/email-templates/page.tsx
// ตั้งค่าหัวข้อ/เนื้อหา template ของอีเมล Tracking system (ที่แสดงใน Modal "ส่งอีเมล"
// บนแท็บเช็คลิสต์ของหน้าใบเสนอราคา) — แก้ไขได้ทีละประเภท พร้อมปุ่มคืนค่าเริ่มต้น

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Mail, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import QuillEditor from '@/components/ui/quill-editor';

type EmailType = 'QUOTATION' | 'BOOKING' | 'RECEIPT_DEPOSIT' | 'RECEIPT_FULL';

interface TemplateConfig {
  subject: string;
  body: string;
}

const EMAIL_TYPES: EmailType[] = ['QUOTATION', 'BOOKING', 'RECEIPT_DEPOSIT', 'RECEIPT_FULL'];

export default function EmailTemplatesSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeType, setActiveType] = useState<EmailType>('QUOTATION');
  const [templates, setTemplates] = useState<Record<EmailType, TemplateConfig> | null>(null);
  const [defaults, setDefaults] = useState<Record<EmailType, TemplateConfig> | null>(null);
  const [labels, setLabels] = useState<Record<EmailType, string>>({
    QUOTATION: 'ส่งใบเสนอราคาให้ลูกค้า',
    BOOKING: 'ส่งใบจองทัวร์ให้โฮลเซลล์',
    RECEIPT_DEPOSIT: 'ส่งใบเสร็จรับเงินมัดจำให้ลูกค้า',
    RECEIPT_FULL: 'ส่งใบเสร็จรับเงินยอดเต็มให้ลูกค้า',
  });
  const [placeholders, setPlaceholders] = useState<Record<EmailType, { key: string; label: string }[]>>(
    {} as Record<EmailType, { key: string; label: string }[]>
  );

  useEffect(() => {
    void loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/email-templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates);
        setDefaults(data.defaults);
        setLabels(data.labels);
        setPlaceholders(data.placeholders);
      }
    } finally {
      setLoading(false);
    }
  };

  const current = templates?.[activeType];

  const setCurrent = (patch: Partial<TemplateConfig>) => {
    setTemplates((prev) => (prev ? { ...prev, [activeType]: { ...prev[activeType], ...patch } } : prev));
  };

  const handleResetToDefault = () => {
    if (!defaults) return;
    setCurrent({ ...defaults[activeType] });
  };

  const handleSave = async () => {
    if (!current) return;
    setSaving(true);
    try {
      const res = await fetch('/api/settings/email-templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activeType, subject: current.subject, body: current.body }),
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

  if (loading || !templates) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/settings">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            กลับ
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Template อีเมล (Tracking system)
          </h1>
          <p className="text-sm text-gray-500">
            หัวข้อและเนื้อหาที่จะแสดงในตัวอย่างและใช้ส่งจริง เมื่อพนักงานกด &quot;ส่งอีเมล&quot; ในแท็บเช็คลิสต์
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {EMAIL_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setActiveType(t)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeType === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {labels[t]}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">{labels[activeType]}</h3>
            <p className="text-sm text-gray-500">
              ตัวแปรที่ใช้ได้:{' '}
              {(placeholders[activeType] || []).map((p) => (
                <code key={p.key} className="bg-gray-100 px-1.5 py-0.5 rounded text-xs mr-1" title={p.label}>
                  {`{{${p.key}}}`}
                </code>
              ))}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleResetToDefault}>
            <RotateCcw className="w-4 h-4 mr-2" />
            คืนค่าเริ่มต้น
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="หัวข้ออีเมล (Subject)"
            value={current?.subject || ''}
            onChange={(e) => setCurrent({ subject: e.target.value })}
            placeholder="เช่น ใบเสนอราคา {{quotationNumber}} - {{tourName}}"
          />
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">เนื้อหาอีเมล</label>
            <QuillEditor
              value={current?.body || ''}
              onChange={(html) => setCurrent({ body: html })}
              placeholder="เขียนเนื้อหาอีเมลที่นี่..."
            />
          </div>
          <div className="pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              บันทึกการเปลี่ยนแปลง
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
