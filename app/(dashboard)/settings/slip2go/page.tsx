'use client';

// app/(dashboard)/settings/slip2go/page.tsx
// หน้าตั้งค่า Slip2Go: URL, Secret Key, เปิด/ปิดการใช้งาน, ตรวจสอบสลิปซ้ำ, ทดสอบเชื่อมต่อ

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Loader2, CheckCircle2, XCircle, Eye, EyeOff, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface Slip2goSettings {
  apiUrl: string;
  secretKeyMasked: string;
  hasSecretKey: boolean;
  checkDuplicate: boolean;
  enabled: boolean;
}

interface AccountInfo {
  shopName?: string;
  package?: string;
  packageExpiredDate?: string;
  tokenLimit?: number;
  tokenRemaining?: number;
  creditRemaining?: number;
  quotaQrLimit?: number;
  quotaQrRemaining?: number;
  tokenPerSlip?: number;
  estimatedQuotaSlip?: number;
}

function AccountInfoCard({ info }: { info: AccountInfo }) {
  const fmtDate = (d?: string) => {
    if (!d) return '-';
    const dt = new Date(d);
    return isNaN(dt.getTime())
      ? d
      : dt.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
  };
  const rows: { label: string; value: string }[] = [
    { label: 'บัญชี', value: info.shopName || '-' },
    { label: 'แพ็กเกจ', value: info.package || '-' },
    { label: 'หมดอายุ', value: fmtDate(info.packageExpiredDate) },
    {
      label: 'โทเคนคงเหลือ',
      value: info.tokenRemaining != null ? `${info.tokenRemaining} / ${info.tokenLimit ?? '-'}` : '-',
    },
    { label: 'เครดิตคงเหลือ', value: info.creditRemaining != null ? String(info.creditRemaining) : '-' },
    {
      label: 'โควตา QR',
      value: info.quotaQrRemaining != null ? `${info.quotaQrRemaining} / ${info.quotaQrLimit ?? '-'}` : '-',
    },
    {
      label: 'ตรวจได้อีกประมาณ',
      value: info.estimatedQuotaSlip != null ? `${info.estimatedQuotaSlip} สลิป` : '-',
    },
  ];
  return (
    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs bg-white/70 p-3 rounded border border-green-100">
      {rows.map((r) => (
        <div key={r.label} className="flex justify-between gap-2">
          <span className="text-gray-500">{r.label}</span>
          <span className="font-medium text-gray-800">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function Slip2goSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [apiUrl, setApiUrl] = useState('https://connect.slip2go.com');
  const [secretKey, setSecretKey] = useState('');
  const [secretPlaceholder, setSecretPlaceholder] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [checkDuplicate, setCheckDuplicate] = useState(true);
  const [enabled, setEnabled] = useState(false);

  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; data?: unknown } | null>(null);

  // ทดสอบสลิปจริง
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [testAmount, setTestAmount] = useState('');
  const [verifyResult, setVerifyResult] = useState<any>(null);

  useEffect(() => {
    void loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/slip2go');
      if (res.ok) {
        const data: Slip2goSettings = await res.json();
        setApiUrl(data.apiUrl);
        setSecretPlaceholder(data.hasSecretKey ? data.secretKeyMasked : 'ยังไม่ได้ตั้งค่า');
        setCheckDuplicate(data.checkDuplicate);
        setEnabled(data.enabled);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setTestResult(null);
    try {
      const body: Record<string, unknown> = {
        apiUrl,
        checkDuplicate,
        enabled,
      };
      if (secretKey) body.secretKey = secretKey;
      const res = await fetch('/api/settings/slip2go', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setSecretKey('');
        await loadSettings();
        alert('บันทึกการตั้งค่าเรียบร้อย');
      } else {
        const err = await res.json();
        alert(err.error || 'บันทึกไม่สำเร็จ');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/settings/slip2go/test', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.ok) {
        setTestResult({ ok: true, message: 'เชื่อมต่อสำเร็จ', data: data.result });
      } else {
        setTestResult({
          ok: false,
          message: data.error || data.result?.message || 'ทดสอบไม่สำเร็จ',
          data: data.result,
        });
      }
    } catch (e) {
      setTestResult({ ok: false, message: e instanceof Error ? e.message : 'เชื่อมต่อไม่สำเร็จ' });
    } finally {
      setTesting(false);
    }
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setSlipFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setSlipPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
  };

  const handleVerifySlip = async () => {
    if (!slipFile) {
      alert('กรุณาเลือกไฟล์สลิปก่อน');
      return;
    }
    setVerifying(true);
    setVerifyResult(null);
    try {
      const fd = new FormData();
      fd.append('file', slipFile);
      if (testAmount) fd.append('amount', testAmount);
      fd.append('amountType', 'gte');
      const res = await fetch('/api/payments/verify-slip', { method: 'POST', body: fd });
      const data = await res.json();
      setVerifyResult({ status: res.status, ...data });
    } catch (e) {
      setVerifyResult({ status: 0, ok: false, message: e instanceof Error ? e.message : 'error' });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            กลับ
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg shadow-blue-500/25">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            ตั้งค่า SlipAPDev
          </h1>
          <p className="text-gray-500 mt-1">ระบบตรวจสอบสลิปโอนเงินอัตโนมัติผ่าน SlipAPDev API</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: Config */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">การเชื่อมต่อ API</h3>
              <p className="text-sm text-gray-500">
                กรอก Secret Key ที่ได้รับจากผู้ให้บริการ SlipAPDev
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Secret Key</label>
                <div className="relative">
                  <Input
                    type={showSecret ? 'text' : 'password'}
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    placeholder={secretPlaceholder || 'กรอก Secret Key'}
                    autoComplete="new-password"
                    name="slip2go-secret-key"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-form-type="other"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  เว้นว่างไว้เพื่อคงค่าเดิม กรอกใหม่เพื่อเปลี่ยน
                </p>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">เปิดใช้งาน SlipAPDev</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkDuplicate}
                  onChange={(e) => setCheckDuplicate(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">
                  ตรวจสอบสลิปซ้ำอัตโนมัติ (checkDuplicate)
                </span>
              </label>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  บันทึก
                </Button>
                <Button variant="outline" onClick={handleTestConnection} disabled={testing}>
                  {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  ทดสอบเชื่อมต่อ
                </Button>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-lg text-sm flex items-start gap-2 ${
                    testResult.ok
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {testResult.ok ? (
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium">{testResult.message}</div>
                    {(() => {
                      const info = (testResult.data as { data?: AccountInfo } | undefined)?.data;
                      if (testResult.ok && info) return <AccountInfoCard info={info} />;
                      return testResult.data ? (
                        <pre className="mt-2 text-xs bg-white/60 p-2 rounded overflow-auto max-h-40">
                          {JSON.stringify(testResult.data, null, 2)}
                        </pre>
                      ) : null;
                    })()}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 2: Test verify */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">ทดลองตรวจสอบสลิป</h3>
              <p className="text-sm text-gray-500">อัปโหลดสลิปตัวอย่างเพื่อทดสอบระบบ</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ไฟล์สลิป (.png/.jpg)
                </label>
                <label className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <Upload className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {slipFile ? slipFile.name : 'เลือกไฟล์...'}
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={handleFilePick}
                  />
                </label>
                {slipPreview && (
                  <img src={slipPreview} alt="preview" className="mt-2 max-h-48 rounded border" />
                )}
              </div>

              <Input
                label="จำนวนเงินที่คาดหวัง (ไม่บังคับ)"
                type="number"
                value={testAmount}
                onChange={(e) => setTestAmount(e.target.value)}
                placeholder="เช่น 1000"
              />

              <Button onClick={handleVerifySlip} disabled={verifying || !slipFile}>
                {verifying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                ตรวจสอบ
              </Button>

              {verifyResult && (
                <div
                  className={`p-3 rounded-lg text-sm ${
                    verifyResult.ok
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  <div className="font-medium flex items-center gap-2">
                    {verifyResult.ok ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <XCircle className="w-5 h-5" />
                    )}
                    {verifyResult.message || (verifyResult.ok ? 'สลิปถูกต้อง' : 'ตรวจไม่ผ่าน')}
                    {verifyResult.code ? (
                      <span className="text-xs opacity-70">(code: {verifyResult.code})</span>
                    ) : null}
                  </div>
                  {verifyResult.data ? (
                    <pre className="mt-2 text-xs bg-white/60 p-2 rounded overflow-auto max-h-64">
                      {JSON.stringify(verifyResult.data, null, 2)}
                    </pre>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Docs */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">การนำไปใช้งานในหน้ารับชำระเงิน</h3>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-700">
          <p>
            เรียก <code className="px-1 bg-gray-100 rounded">POST /api/payments/verify-slip</code>{' '}
            แบบ <code className="px-1 bg-gray-100 rounded">multipart/form-data</code> ก่อนบันทึก payment:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><code>file</code> — ไฟล์รูปสลิป</li>
            <li><code>amount</code> — จำนวนเงินที่ต้องการตรวจ (optional)</li>
            <li><code>amountType</code> — eq / gte / lte (default: gte)</li>
            <li><code>bankAccountId</code> — id ของบัญชีธนาคารบริษัทที่ใช้ตรวจผู้รับ (optional)</li>
          </ul>
          <p>
            หากผ่าน จะได้ <code>slip.slipRef</code>, <code>slip.slipStatusCode</code>,{' '}
            <code>slip.slipData</code> กลับมา ให้แนบไปพร้อม body ตอนสร้าง customer-transaction
            เพื่อบันทึกลง DB (คอลัมน์ <code>slipRef</code> เป็น UNIQUE จึงกันสลิปซ้ำอัตโนมัติ)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
