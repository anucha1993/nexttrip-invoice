'use client';

// app/(dashboard)/settings/line-oa/page.tsx
// หน้าตั้งค่า LINE OA: Channel Access Token, Target ID (user/group), เปิด/ปิดการส่งต่อสลิป

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MessageCircle, Loader2, CheckCircle2, XCircle, Eye, EyeOff, Copy, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface LineOaSettings {
  targetId: string;
  channelAccessTokenMasked: string;
  hasChannelAccessToken: boolean;
  channelSecretMasked: string;
  hasChannelSecret: boolean;
  enabled: boolean;
}

interface LineRecentEvent {
  type: string;
  sourceType: string;
  id: string;
  text: string;
  timestamp: number;
}

interface LineFollower {
  userId: string;
  displayName: string | null;
  pictureUrl: string | null;
}

function ConfiguredBadge({ configured }: { configured: boolean }) {
  return configured ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
      <CheckCircle2 className="w-3 h-3" />
      ตั้งค่าแล้ว
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
      <XCircle className="w-3 h-3" />
      ยังไม่ได้ตั้งค่า
    </span>
  );
}

export default function LineOaSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [targetId, setTargetId] = useState('');
  const [channelAccessToken, setChannelAccessToken] = useState('');
  const [tokenPlaceholder, setTokenPlaceholder] = useState('');
  const [hasToken, setHasToken] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [channelSecret, setChannelSecret] = useState('');
  const [secretPlaceholder, setSecretPlaceholder] = useState('');
  const [hasSecret, setHasSecret] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [enabled, setEnabled] = useState(false);

  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // จับ Target ID จาก webhook
  const [recentEvents, setRecentEvents] = useState<LineRecentEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [copied, setCopied] = useState(false);
  const webhookUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/line-oa/webhook` : '';

  // จับ Target ID แบบไม่ต้องแตะ Webhook (เฉพาะผู้ใช้เดี่ยวที่แอดเพื่อนแล้ว)
  const [followers, setFollowers] = useState<LineFollower[]>([]);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [followersError, setFollowersError] = useState('');

  useEffect(() => {
    void loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/line-oa');
      if (res.ok) {
        const data: LineOaSettings = await res.json();
        setTargetId(data.targetId);
        setTokenPlaceholder(data.hasChannelAccessToken ? data.channelAccessTokenMasked : 'ยังไม่ได้ตั้งค่า');
        setHasToken(data.hasChannelAccessToken);
        setSecretPlaceholder(data.hasChannelSecret ? data.channelSecretMasked : 'ยังไม่ได้ตั้งค่า (ไม่บังคับ)');
        setHasSecret(data.hasChannelSecret);
        setEnabled(data.enabled);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadRecentEvents = async () => {
    setLoadingEvents(true);
    try {
      const res = await fetch('/api/settings/line-oa/recent-events');
      if (res.ok) {
        const data = await res.json();
        setRecentEvents(data.events || []);
      }
    } finally {
      setLoadingEvents(false);
    }
  };

  const loadFollowers = async () => {
    setLoadingFollowers(true);
    setFollowersError('');
    try {
      const res = await fetch('/api/settings/line-oa/followers');
      const data = await res.json();
      if (res.ok) {
        setFollowers(data.followers || []);
      } else {
        setFollowersError(data.error || 'ดึงรายชื่อผู้ติดตามไม่สำเร็จ');
      }
    } catch (e) {
      setFollowersError(e instanceof Error ? e.message : 'ดึงรายชื่อผู้ติดตามไม่สำเร็จ');
    } finally {
      setLoadingFollowers(false);
    }
  };

  const handleCopyWebhookUrl = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const sourceTypeLabel = (t: string) => (t === 'group' ? 'กลุ่ม' : t === 'room' ? 'ห้อง' : 'ผู้ใช้');

  const handleSave = async () => {
    setSaving(true);
    setTestResult(null);
    try {
      const body: Record<string, unknown> = { targetId, enabled };
      if (channelAccessToken) body.channelAccessToken = channelAccessToken;
      if (channelSecret) body.channelSecret = channelSecret;
      const res = await fetch('/api/settings/line-oa', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setChannelAccessToken('');
        setChannelSecret('');
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
      const res = await fetch('/api/settings/line-oa/test', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.ok) {
        setTestResult({ ok: true, message: 'ส่งข้อความทดสอบสำเร็จ กรุณาตรวจสอบใน LINE' });
      } else {
        setTestResult({ ok: false, message: data.error || 'ทดสอบไม่สำเร็จ' });
      }
    } catch (e) {
      setTestResult({ ok: false, message: e instanceof Error ? e.message : 'เชื่อมต่อไม่สำเร็จ' });
    } finally {
      setTesting(false);
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
            <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg shadow-green-500/25">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            ตั้งค่า LINE OA
          </h1>
          <p className="text-gray-500 mt-1">
            ส่งต่อสลิปที่ลูกค้าแนบเข้ามาไปยัง LINE กลุ่ม/บัญชีที่กำหนด โดยอัตโนมัติทุกครั้งที่มีการแนบสลิป
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">การเชื่อมต่อ LINE Messaging API</h3>
              <p className="text-sm text-gray-500">
                ใช้ Channel Access Token จาก LINE Developers Console (Messaging API channel)
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  Channel Access Token
                  <ConfiguredBadge configured={hasToken} />
                </label>
                <div className="relative">
                  <Input
                    type={showToken ? 'text' : 'password'}
                    value={channelAccessToken}
                    onChange={(e) => setChannelAccessToken(e.target.value)}
                    placeholder={tokenPlaceholder || 'กรอก Channel Access Token'}
                    autoComplete="new-password"
                    name="line-oa-token"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-form-type="other"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  เว้นว่างไว้เพื่อคงค่าเดิม กรอกใหม่เพื่อเปลี่ยน
                </p>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  Channel Secret
                  <ConfiguredBadge configured={hasSecret} />
                </label>
                <div className="relative">
                  <Input
                    type={showSecret ? 'text' : 'password'}
                    value={channelSecret}
                    onChange={(e) => setChannelSecret(e.target.value)}
                    placeholder={secretPlaceholder || 'กรอก Channel Secret'}
                    autoComplete="new-password"
                    name="line-oa-secret"
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
                  ใช้ตรวจสอบลายเซ็น Webhook (แนะนำให้ตั้งค่า) — อยู่ในแท็บ Basic settings ของ Channel
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  LINE User/Group ID ปลายทาง
                </label>
                <Input
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  placeholder="เช่น U4af4980629... หรือ C4b7... (กลุ่ม)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  ยังไม่มี ID? ใช้กล่อง “รับ Target ID อัตโนมัติจาก LINE” ด้านล่าง
                </p>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">เปิดใช้งานส่งต่อสลิปไปยัง LINE OA</span>
              </label>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  บันทึก
                </Button>
                <Button variant="outline" onClick={handleTest} disabled={testing}>
                  {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  ทดสอบส่งข้อความ
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
                  <div className="flex-1">{testResult.message}</div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">
                วิธีที่ 1: ดึงรายชื่อผู้ติดตาม (แนะนำ ไม่ต้องแตะ Webhook)
              </h3>
              <p className="text-sm text-gray-500">
                ใช้ได้ทันทีถ้า Target ID เป็น &quot;แชทส่วนตัว&quot; (ไม่ใช่กลุ่ม) และมีคนแอด LINE OA นี้เป็นเพื่อนแล้ว —
                ไม่กระทบ Webhook URL เดิมที่ตั้งไว้ (เช่น zaapi.co หรือระบบอื่น)
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button type="button" variant="outline" size="sm" onClick={loadFollowers} disabled={loadingFollowers}>
                {loadingFollowers ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                ดึงรายชื่อผู้ติดตาม
              </Button>

              {followersError && (
                <p className="text-xs text-red-600">{followersError}</p>
              )}

              {followers.length > 0 ? (
                <div className="space-y-2">
                  {followers.map((f) => (
                    <div
                      key={f.userId}
                      className="flex items-center justify-between gap-2 p-2 border rounded-lg text-sm"
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        {f.pictureUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={f.pictureUrl} alt="" className="w-6 h-6 rounded-full flex-shrink-0" />
                        ) : null}
                        <div className="min-w-0">
                          <div className="text-gray-800 truncate">{f.displayName || 'ไม่ทราบชื่อ'}</div>
                          <div className="font-mono text-xs text-gray-500 truncate">{f.userId}</div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={targetId === f.userId ? 'outline' : 'primary'}
                        onClick={() => setTargetId(f.userId)}
                      >
                        ใช้ ID นี้
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                !loadingFollowers &&
                !followersError && (
                  <p className="text-xs text-gray-400">
                    ยังไม่มีรายชื่อ — กดปุ่มด้านบนเพื่อดึงรายชื่อคนที่แอด LINE OA นี้เป็นเพื่อนแล้ว
                  </p>
                )
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">
                วิธีที่ 2: จับ Target ID จาก Webhook (ใช้ได้กับกลุ่ม/ห้องด้วย)
              </h3>
              <p className="text-sm text-gray-500">
                ตั้ง Webhook URL นี้ใน LINE Developers Console แล้วส่งข้อความ/เชิญบอทเข้ากลุ่ม เพื่อจับ userId/groupId
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 rounded-lg text-sm bg-amber-50 text-amber-800 border border-amber-200">
                ⚠️ Channel นี้อาจมี Webhook URL อื่นตั้งไว้อยู่แล้ว (เช่น ระบบแชท zaapi.co) การเปลี่ยนมาชี้ที่นี่จะทำให้ Webhook เดิม
                หยุดทำงานทันที ถ้าไม่แน่ใจว่า Webhook เดิมใช้ทำอะไรอยู่ ให้ใช้ &quot;วิธีที่ 1&quot; ด้านบนแทน หรือถ้าจำเป็นต้องจับ Group ID
                จริงๆ ให้สลับ Webhook มาที่นี่ชั่วคราว จับ ID เสร็จแล้วรีบเปลี่ยนกลับเป็น URL เดิมทันที
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Webhook URL</label>
                <div className="flex gap-2">
                  <Input value={webhookUrl} readOnly className="font-mono text-xs" />
                  <Button type="button" variant="outline" size="sm" onClick={handleCopyWebhookUrl}>
                    {copied ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <ol className="text-sm text-gray-700 space-y-1.5 list-decimal list-inside">
                <li>นำ Webhook URL ด้านบนไปวางใน LINE Developers Console &gt; ช่อง Messaging API &gt; Webhook URL แล้วกด Verify + เปิด &quot;Use webhook&quot;</li>
                <li>เพิ่ม LINE OA เป็นเพื่อน หรือเชิญเข้ากลุ่มที่ต้องการส่งสลิปไปหา</li>
                <li>พิมพ์/ส่งข้อความใดๆ หากัน 1 ครั้ง ในแชท/กลุ่มนั้น</li>
                <li>กด &quot;ตรวจสอบข้อความล่าสุด&quot; ด้านล่าง แล้วกด &quot;ใช้ ID นี้&quot; ข้างข้อความที่ต้องการ</li>
                <li>เสร็จแล้วอย่าลืมเปลี่ยน Webhook URL กลับเป็นของเดิม ถ้ามีระบบอื่นใช้งานอยู่</li>
              </ol>

              <Button type="button" variant="outline" size="sm" onClick={loadRecentEvents} disabled={loadingEvents}>
                {loadingEvents ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                ตรวจสอบข้อความล่าสุด
              </Button>

              {recentEvents.length > 0 ? (
                <div className="space-y-2">
                  {recentEvents.map((ev, i) => (
                    <div
                      key={`${ev.id}-${ev.timestamp}-${i}`}
                      className="flex items-center justify-between gap-2 p-2 border rounded-lg text-sm"
                    >
                      <div className="min-w-0">
                        <div className="font-mono text-xs text-gray-800 truncate">{ev.id || '-'}</div>
                        <div className="text-xs text-gray-500">
                          {sourceTypeLabel(ev.sourceType)}
                          {ev.text ? ` — ${ev.text}` : ''}
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={targetId === ev.id ? 'outline' : 'primary'}
                        onClick={() => setTargetId(ev.id)}
                        disabled={!ev.id}
                      >
                        ใช้ ID นี้
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">
                  ยังไม่มีข้อความเข้ามา — ส่งข้อความใน LINE แล้วกดปุ่มด้านบนอีกครั้ง
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">การทำงาน</h3>
              <p className="text-sm text-gray-500">เมื่อไหร่ที่ระบบจะส่งต่อสลิปไปยัง LINE OA</p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700">
              <p>
                ทุกครั้งที่มีการ<strong>แนบสลิป/หลักฐาน</strong>เข้ามาในระบบ (หน้ารับชำระเงิน / คืนเงิน)
                ระบบจะส่งรูปสลิปพร้อมรายละเอียด (เลขที่รายการ, ยอดเงิน, Ref) ไปยัง LINE User/Group ID
                ที่ตั้งค่าไว้ด้านซ้ายโดยอัตโนมัติ — ไม่ว่าจะเปิดใช้งานการตรวจสอบสลิปด้วย SlipAPDev หรือไม่ก็ตาม
              </p>
              <p className="text-xs text-gray-500">
                หมายเหตุ: การส่งต่อเป็นแบบ best-effort — หากส่งไม่สำเร็จ (เช่น token หมดอายุ)
                จะไม่กระทบต่อการบันทึกรายการชำระเงิน/คืนเงิน
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
