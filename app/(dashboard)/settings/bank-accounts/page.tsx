'use client';

// app/(dashboard)/settings/bank-accounts/page.tsx
// หน้าตั้งค่าบัญชีธนาคารของบริษัท (เลขที่บัญชี/ชื่อบัญชี) — ใช้เทียบผู้รับโอนกับ SlipAPDev
// ตอนแนบสลิปโอนเงินแล้วเลือก "บัญชีธนาคารที่รับโอน" ระบบจะส่งเลขบัญชี/ชื่อบัญชีของแถวนั้นไปให้ Slip2Go ตรวจว่าโอนเข้าบัญชีนี้จริงหรือไม่

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Landmark, Loader2, Save, Plus, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface BankAccountRow {
  id: number;
  bankId: number;
  accountNumber: string;
  accountName: string;
  accountType: string;
  branchName: string | null;
  isDefault: boolean;
  isActive: boolean;
  bankNameTH: string;
  bankCode: string;
}

interface Bank {
  id: number;
  code: string;
  nameTH: string;
}

const ACCOUNT_TYPES = [
  { value: 'SAVINGS', label: 'ออมทรัพย์' },
  { value: 'CURRENT', label: 'กระแสรายวัน' },
  { value: 'FIXED', label: 'ฝากประจำ' },
];

export default function BankAccountsSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<BankAccountRow[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newAccount, setNewAccount] = useState({
    bankId: '',
    accountNumber: '',
    accountName: '',
    accountType: 'SAVINGS',
    branchName: '',
    isActive: true,
    isDefault: false,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [accRes, bankRes] = await Promise.all([
        fetch('/api/bank-accounts?activeOnly=false'),
        fetch('/api/banks?activeOnly=false'),
      ]);
      if (accRes.ok) {
        const data = await accRes.json();
        setAccounts(data.bankAccounts || []);
      }
      if (bankRes.ok) {
        const data = await bankRes.json();
        setBanks(data.banks || []);
      }
    } catch (e) {
      console.error('Error loading bank accounts:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const updateRow = (id: number, patch: Partial<BankAccountRow>) => {
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const saveRow = async (row: BankAccountRow) => {
    setSavingId(row.id);
    setSavedId(null);
    try {
      const res = await fetch(`/api/bank-accounts/${row.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountNumber: row.accountNumber,
          accountName: row.accountName,
          accountType: row.accountType,
          branchName: row.branchName || '',
          isActive: row.isActive,
          isDefault: row.isDefault,
        }),
      });
      if (res.ok) {
        setSavedId(row.id);
        setTimeout(() => setSavedId(null), 2000);
        await loadData();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(`บันทึกไม่สำเร็จ: ${data.error || res.statusText}`);
      }
    } catch (e) {
      alert(`บันทึกไม่สำเร็จ: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSavingId(null);
    }
  };

  const submitNewAccount = async () => {
    if (!newAccount.bankId || !newAccount.accountNumber || !newAccount.accountName) {
      alert('กรุณาเลือกธนาคาร และกรอกเลขที่บัญชี/ชื่อบัญชีให้ครบ');
      return;
    }
    setAdding(true);
    try {
      const res = await fetch('/api/bank-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankId: Number(newAccount.bankId),
          accountNumber: newAccount.accountNumber,
          accountName: newAccount.accountName,
          accountType: newAccount.accountType,
          branchName: newAccount.branchName || null,
          isActive: newAccount.isActive,
          isDefault: newAccount.isDefault,
        }),
      });
      if (res.ok) {
        setNewAccount({
          bankId: '',
          accountNumber: '',
          accountName: '',
          accountType: 'SAVINGS',
          branchName: '',
          isActive: true,
          isDefault: false,
        });
        setShowAddForm(false);
        await loadData();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(`เพิ่มบัญชีไม่สำเร็จ: ${data.error || res.statusText}`);
      }
    } catch (e) {
      alert(`เพิ่มบัญชีไม่สำเร็จ: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setAdding(false);
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
              <Landmark className="w-6 h-6 text-white" />
            </div>
            ตั้งค่าบัญชีธนาคาร
          </h1>
          <p className="text-gray-500 mt-1">
            เลขที่บัญชี/ชื่อบัญชีจริงของบริษัท — ใช้เทียบผู้รับโอนกับสลิปตอนตรวจสอบผ่าน SlipAPDev
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">บัญชีธนาคาร</h3>
              <p className="text-sm text-gray-500">
                กรอกเลขที่บัญชี/ชื่อบัญชีจริงแทนค่าตัวอย่าง แล้วกด บันทึก ทีละแถว
              </p>
            </div>
            <Button size="sm" onClick={() => setShowAddForm((v) => !v)}>
              <Plus className="w-4 h-4 mr-1" />
              เพิ่มบัญชี
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {showAddForm && (
              <div className="p-4 border rounded-lg bg-blue-50/50 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">ธนาคาร *</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2"
                    value={newAccount.bankId}
                    onChange={(e) => setNewAccount((v) => ({ ...v, bankId: e.target.value }))}
                  >
                    <option value="">-- เลือกธนาคาร --</option>
                    {banks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nameTH}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">ประเภทบัญชี</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2"
                    value={newAccount.accountType}
                    onChange={(e) => setNewAccount((v) => ({ ...v, accountType: e.target.value }))}
                  >
                    {ACCOUNT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  label="เลขที่บัญชี *"
                  value={newAccount.accountNumber}
                  onChange={(e) => setNewAccount((v) => ({ ...v, accountNumber: e.target.value }))}
                  placeholder="เช่น 123-4-56789-0"
                />
                <Input
                  label="ชื่อบัญชี *"
                  value={newAccount.accountName}
                  onChange={(e) => setNewAccount((v) => ({ ...v, accountName: e.target.value }))}
                  placeholder="เช่น บริษัท เน็กซ์ทริป จำกัด"
                />
                <Input
                  label="สาขา"
                  value={newAccount.branchName}
                  onChange={(e) => setNewAccount((v) => ({ ...v, branchName: e.target.value }))}
                />
                <div className="flex items-end gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={newAccount.isActive}
                      onChange={(e) => setNewAccount((v) => ({ ...v, isActive: e.target.checked }))}
                    />
                    เปิดใช้งาน
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={newAccount.isDefault}
                      onChange={(e) => setNewAccount((v) => ({ ...v, isDefault: e.target.checked }))}
                    />
                    ตั้งเป็นบัญชีหลักของธนาคารนี้
                  </label>
                </div>
                <div className="md:col-span-2 flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowAddForm(false)}>
                    ยกเลิก
                  </Button>
                  <Button size="sm" onClick={submitNewAccount} disabled={adding}>
                    {adding ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                    บันทึกบัญชีใหม่
                  </Button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-2 pr-3">ธนาคาร</th>
                    <th className="py-2 pr-3">เลขที่บัญชี</th>
                    <th className="py-2 pr-3">ชื่อบัญชี</th>
                    <th className="py-2 pr-3">สาขา</th>
                    <th className="py-2 pr-3">ประเภท</th>
                    <th className="py-2 pr-3 text-center">หลัก</th>
                    <th className="py-2 pr-3 text-center">เปิดใช้งาน</th>
                    <th className="py-2 pr-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((row) => {
                    const isPlaceholder = row.accountNumber === '000-0-00000-0';
                    return (
                      <tr key={row.id} className="border-b last:border-0">
                        <td className="py-2 pr-3 whitespace-nowrap font-medium text-gray-700">
                          {row.bankNameTH}
                        </td>
                        <td className="py-2 pr-3">
                          <input
                            className={`w-40 border rounded px-2 py-1 ${isPlaceholder ? 'border-amber-300 bg-amber-50' : ''}`}
                            value={row.accountNumber}
                            onChange={(e) => updateRow(row.id, { accountNumber: e.target.value })}
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <input
                            className="w-48 border rounded px-2 py-1"
                            value={row.accountName}
                            onChange={(e) => updateRow(row.id, { accountName: e.target.value })}
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <input
                            className="w-32 border rounded px-2 py-1"
                            value={row.branchName || ''}
                            onChange={(e) => updateRow(row.id, { branchName: e.target.value })}
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <select
                            className="border rounded px-2 py-1"
                            value={row.accountType}
                            onChange={(e) => updateRow(row.id, { accountType: e.target.value })}
                          >
                            {ACCOUNT_TYPES.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 pr-3 text-center">
                          <input
                            type="checkbox"
                            checked={row.isDefault}
                            onChange={(e) => updateRow(row.id, { isDefault: e.target.checked })}
                          />
                        </td>
                        <td className="py-2 pr-3 text-center">
                          <input
                            type="checkbox"
                            checked={row.isActive}
                            onChange={(e) => updateRow(row.id, { isActive: e.target.checked })}
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <Button
                            size="sm"
                            variant={savedId === row.id ? 'outline' : 'default'}
                            onClick={() => saveRow(row)}
                            disabled={savingId === row.id}
                          >
                            {savingId === row.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : savedId === row.id ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-amber-600">
              แถวที่มีกรอบสีเหลืองคือเลขบัญชีตัวอย่าง (ยังไม่ใช่เลขจริง) กรุณาแก้ไขก่อนใช้เทียบผู้รับโอนกับสลิป
              มิฉะนั้นการตรวจสอบผู้รับโอนจะไม่ทำงาน (Slip2Go จะข้ามการเทียบถ้าไม่พบบัญชีที่ใช้งานได้จริง)
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
