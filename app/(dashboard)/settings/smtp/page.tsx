'use client';

// app/(dashboard)/settings/smtp/page.tsx
// หน้าตั้งค่า SMTP ผู้ส่งอีเมล (ใช้โดยระบบส่งอีเมล Tracking system เช่น ใบเสนอราคา/ใบจอง/
// ใบเสร็จ) — แทนที่การต้องแก้ .env ด้วยมือ พร้อมปุ่มทดสอบการเชื่อมต่อ/ส่งอีเมลทดสอบ

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, Loader2, CheckCircle2, XCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function SmtpSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [host, setHost] = useState('');
  const [port, setPort] = useState('587');
  const [secure, setSecure] = useState(false);
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [passwordPlaceholder, setPasswordPlaceholder] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fromName, setFromName] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [usingEnvFallback, setUsingEnvFallback] = useState(false);

  const [testTo, setTestTo] = useState('');
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    void loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/smtp');
      if (res.ok) {
        const data = await res.json();
        setHost(data.host || '');
        setPort(String(data.port || '587'));
        setSecure(!!data.secure);
        setUser(data.user || '');
        setPasswordPlaceholder(data.hasPassword ? data.passwordMasked : 'ยังไม่ได้ตั้งค่า');
        setFromName(data.fromName || '');
        setFromEmail(data.fromEmail || '');
        setUsingEnvFallback(!!data.usingEnvFallback);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!host.trim() || !user.trim()) {
      alert('กรุณากรอก Host และ User ให้ครบ');
      return;
    }
    setSaving(true);
    setTestResult(null);
    try {
      const body: Record<string, unknown> = {
        host: host.trim(),
        port: Number(port) || 587,
        secure,
        user: user.trim(),
        fromName: fromName.trim(),
        fromEmail: fromEmail.trim(),
      };
      if (password) body.password = password;
      const res = await fetch('/api/settings/smtp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setPassword('');
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

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/settings/smtp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testTo.trim() || undefined }),
      });
      const data = await res.json();
      setTestResult({ ok: !!data.ok, message: data.message || data.error || 'ทดสอบไม่สำเร็จ' });
    } catch (e) {
      setTestResult({ ok: false, message: e instanceof Error ? e.message : 'เชื่อมต่อไม่สำเร็จ' });
    } finally {
      setTesting(false);
    }
  };

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
            <Mail className="w-5 h-5" />
            SMTP ผู้ส่งอีเมล
          </h1>
          <p className="text-sm text-gray-500">
            ตั้งค่าบัญชีอีเมลที่ใช้ส่งอีเมล Tracking system (ใบเสนอราคา/ใบจอง/ใบเสร็จ) แทนการแก้ .env
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <>
          {usingEnvFallback && (
            <div className="p-3 rounded-lg text-sm bg-amber-50 text-amber-700 border border-amber-200">
              ยังไม่ได้ตั้งค่าในระบบนี้ กำลังใช้ค่าจาก .env ของเซิร์ฟเวอร์อยู่ (ถ้ามี)
            </div>
          )}

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">การเชื่อมต่อ SMTP</h3>
              <p className="text-sm text-gray-500">ข้อมูลบัญชีอีเมลผู้ส่ง (เช่น Gmail SMTP, บริการอีเมลของโฮสต์)</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <Input
                    label="Host"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <Input
                  label="Port"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="587"
                />
              </div>

              <Input
                label="User (อีเมลผู้ส่ง)"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                placeholder="noreply@example.com"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={passwordPlaceholder || 'กรอกรหัสผ่าน'}
                    autoComplete="new-password"
                    name="smtp-password"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-form-type="other"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">เว้นว่างไว้เพื่อคงค่าเดิม กรอกใหม่เพื่อเปลี่ยน</p>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={secure}
                  onChange={(e) => setSecure(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">
                  ใช้ SSL/TLS โดยตรง (secure — ปกติเปิดเมื่อ Port เป็น 465, ปิดสำหรับ 587)
                </span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="ชื่อผู้ส่ง (From Name)"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  placeholder="NextTrip"
                />
                <Input
                  label="อีเมลผู้ส่ง (From Email)"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  placeholder="เว้นว่างจะใช้ค่าเดียวกับ User"
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

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">ทดสอบการเชื่อมต่อ</h3>
              <p className="text-sm text-gray-500">
                ตรวจสอบว่า Host/User/Password ใช้งานได้ และส่งอีเมลทดสอบ (ไม่บังคับ)
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="อีเมลสำหรับส่งทดสอบ (ไม่ระบุก็ได้ จะทดสอบแค่การเชื่อมต่อ)"
                type="email"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                placeholder="you@example.com"
              />
              <Button variant="outline" onClick={handleTest} disabled={testing}>
                {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                ทดสอบเชื่อมต่อ / ส่งอีเมลทดสอบ
              </Button>

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
                  <div className="flex-1">{testResult.message}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
