'use client';

// app/(dashboard)/settings/checklist-items/page.tsx
// ตั้งค่า "ระบบติดตามงานหลังการขาย" (Tracking System) — ดู migrations/021 และ
// lib/checklist-auto.ts. รองรับจัดกลุ่มรายการ + Auto Trigger + บังคับก่อนจ่ายคอม.

import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ListChecks, Loader2, Plus, Trash2, Pencil, ChevronDown, ChevronRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
        checked ? 'bg-blue-600' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

// Mirrors lib/checklist-auto.ts CHECKLIST_EVENT_KEYS — duplicated here (plain
// data, no server deps) so this client component doesn't import server-only
// code (that file pulls in the mariadb pool).
const CHECKLIST_EVENT_KEYS: { key: string; label: string }[] = [
  { key: 'QUOTATION_EMAIL_SENT', label: 'ส่งอีเมลใบเสนอราคาให้ลูกค้า' },
  { key: 'BOOKING_EMAIL_SENT', label: 'ส่งอีเมลใบจองทัวร์ให้โฮลเซลล์' },
  { key: 'RECEIPT_DEPOSIT_EMAIL_SENT', label: 'ส่งอีเมลใบเสร็จมัดจำให้ลูกค้า' },
  { key: 'RECEIPT_FULL_EMAIL_SENT', label: 'ส่งอีเมลใบเสร็จยอดเต็มให้ลูกค้า' },
  { key: 'CUSTOMER_WHT_DOC_UPLOADED', label: 'อัปโหลดใบหัก ณ ที่จ่ายของลูกค้า' },
  { key: 'WHT_ISSUED_TO_WHOLESALER', label: 'บันทึกใบภาษีซื้อแบบมีหัก ณ ที่จ่าย (ออกให้โฮลเซลล์)' },
  { key: 'PURCHASE_TAX_RECORDED', label: 'บันทึกใบภาษีซื้อ (ได้รับจากโฮลเซลล์)' },
  { key: 'WHOLESALE_REFUND_CONFIRMED', label: 'ยืนยันรับเงินคืนจากโฮลเซลล์' },
  { key: 'CUSTOMER_REFUND_CONFIRMED', label: 'ยืนยันคืนเงินให้ลูกค้า' },
];

interface ChecklistItemRow {
  id: number;
  parentId: number | null;
  label: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean | number;
  requiredForCommission: boolean | number;
  autoEventKey: string | null;
  allowManualOverride: boolean | number;
}

export default function ChecklistItemsSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ChecklistItemRow[]>([]);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

  // Single modal handles BOTH "add new item" and "edit item" — keeps the
  // table itself read-only/simple (label + badges + on/off + edit/delete).
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [modalItemId, setModalItemId] = useState<number | null>(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [formLabel, setFormLabel] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formParentId, setFormParentId] = useState<string>('');
  const [formAutoEventKey, setFormAutoEventKey] = useState<string>('');
  const [formRequired, setFormRequired] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/checklist-items');
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (e) {
      console.error('Error loading checklist items:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Quick inline toggle for "เปิดใช้งาน" only \u2014 the one field left directly
  // editable in the table since it's a single common on/off action.
  const toggleActive = async (id: number, nextActive: boolean) => {
    setSavingId(id);
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, isActive: nextActive } : it)));
    try {
      const res = await fetch(`/api/settings/checklist-items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: nextActive }),
      });
      if (!res.ok) {
        setItems((prev) => prev.map((it) => (it.id === id ? { ...it, isActive: !nextActive } : it)));
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'บันทึกไม่สำเร็จ');
      }
    } catch (e) {
      console.error('Error toggling checklist item:', e);
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, isActive: !nextActive } : it)));
    } finally {
      setSavingId(null);
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    setModalItemId(null);
    setFormLabel('');
    setFormDescription('');
    setFormParentId('');
    setFormAutoEventKey('');
    setFormRequired(false);
    setModalOpen(true);
  };

  const openEditModal = (item: ChecklistItemRow) => {
    setModalMode('edit');
    setModalItemId(item.id);
    setFormLabel(item.label);
    setFormDescription(item.description || '');
    setFormParentId(item.parentId ? String(item.parentId) : '');
    setFormAutoEventKey(item.autoEventKey || '');
    setFormRequired(!!item.requiredForCommission);
    setModalOpen(true);
  };

  const handleModalSave = async () => {
    if (!formLabel.trim()) {
      alert('กรุณาระบุชื่อรายการ');
      return;
    }
    setModalSaving(true);
    const body = {
      label: formLabel.trim(),
      description: formDescription.trim() || null,
      parentId: formParentId ? Number(formParentId) : null,
      requiredForCommission: formRequired,
      autoEventKey: formAutoEventKey || null,
    };
    try {
      if (modalMode === 'create') {
        const res = await fetch('/api/settings/checklist-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const data = await res.json();
          setItems((prev) => [...prev, data.item]);
          setModalOpen(false);
        } else {
          const data = await res.json().catch(() => ({}));
          alert(data.error || 'เพิ่มรายการไม่สำเร็จ');
        }
      } else if (modalItemId != null) {
        const res = await fetch(`/api/settings/checklist-items/${modalItemId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const data = await res.json();
          setItems((prev) => prev.map((it) => (it.id === modalItemId ? { ...it, ...data.item } : it)));
          setModalOpen(false);
        } else {
          const data = await res.json().catch(() => ({}));
          alert(data.error || 'บันทึกไม่สำเร็จ');
        }
      }
    } catch (e) {
      console.error('Error saving checklist item:', e);
      alert('บันทึกไม่สำเร็จ');
    } finally {
      setModalSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('ลบรายการเช็คลิสต์นี้? สถานะที่เคยติ๊กไว้ในทุกใบเสนอราคาจะถูกลบไปด้วย (ถ้าเป็นหัวข้อกลุ่ม รายการย่อยจะถูกแยกออกมาเป็นรายการเดี่ยว)')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/settings/checklist-items/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setItems((prev) => prev.filter((it) => it.id !== id).map((it) => (it.parentId === id ? { ...it, parentId: null } : it)));
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'ลบไม่สำเร็จ');
      }
    } catch (e) {
      console.error('Error deleting checklist item:', e);
      alert('ลบไม่สำเร็จ');
    } finally {
      setDeletingId(null);
    }
  };

  const topLevel = items.filter((i) => !i.parentId).sort((a, b) => a.sortOrder - b.sortOrder);
  const childrenOf = (parentId: number) =>
    items.filter((i) => i.parentId === parentId).sort((a, b) => a.sortOrder - b.sortOrder);
  const groupOptions = items.filter((i) => !i.parentId);

  const renderGroupRow = (item: ChecklistItemRow, hasChildren: boolean, isCollapsed: boolean) => {
    const isActive = !!item.isActive;
    return (
      <tr key={item.id} className={`border-b bg-purple-50 ${isActive ? '' : 'opacity-50'}`}>
        <td className="p-2 text-center align-middle w-8">
          {hasChildren && (
            <button
              onClick={() => setCollapsed((c) => ({ ...c, [item.id]: !c[item.id] }))}
              className="text-purple-600 hover:bg-purple-100 rounded p-0.5"
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </td>
        <td className="p-3 align-middle">
          <span className="font-semibold text-sm text-purple-700">{item.label}</span>
          {item.description && <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>}
        </td>
        <td className="p-2 text-center align-middle w-24">
          <ToggleSwitch
            checked={isActive}
            disabled={savingId === item.id}
            onChange={(v) => toggleActive(item.id, v)}
          />
        </td>
        <td className="p-2 align-middle w-24">
          <div className="flex items-center justify-center gap-1">
            {savingId === item.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
            <button
              onClick={() => openEditModal(item)}
              className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"
              title="แก้ไข"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(item.id)}
              disabled={deletingId === item.id}
              className="p-1.5 text-red-500 hover:bg-red-50 rounded"
              title="ลบรายการ"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  const renderItemRow = (item: ChecklistItemRow, isChild: boolean) => {
    const isActive = !!item.isActive;
    const isRequired = !!item.requiredForCommission;
    const eventLabel = CHECKLIST_EVENT_KEYS.find((e) => e.key === item.autoEventKey)?.label;

    return (
      <tr key={item.id} className={`border-b hover:bg-gray-50 ${isActive ? '' : 'bg-gray-50 opacity-50'}`}>
        <td className="p-2 align-top"></td>
        <td className={`p-3 align-top ${isChild ? 'pl-6' : ''}`}>
          <div className="text-sm text-gray-800">{item.label}</div>
          {item.description && <div className="text-xs text-gray-400 mt-0.5">{item.description}</div>}
          {(isRequired || eventLabel) && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {isRequired && (
                <span className="text-[10px] font-medium text-orange-700 bg-orange-100 rounded-full px-2 py-0.5">
                  บังคับก่อนจ่ายคอม
                </span>
              )}
              {eventLabel && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">
                  <Zap className="w-3 h-3" /> {eventLabel}
                </span>
              )}
            </div>
          )}
        </td>
        <td className="p-2 text-center align-top pt-3.5 w-24">
          <ToggleSwitch
            checked={isActive}
            disabled={savingId === item.id}
            onChange={(v) => toggleActive(item.id, v)}
          />
        </td>
        <td className="p-2 align-top pt-2.5 w-24">
          <div className="flex items-center justify-center gap-1">
            {savingId === item.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
            <button
              onClick={() => openEditModal(item)}
              className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"
              title="แก้ไข"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(item.id)}
              disabled={deletingId === item.id}
              className="p-1.5 text-red-500 hover:bg-red-50 rounded"
              title="ลบรายการ"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ListChecks className="w-6 h-6 text-blue-600" />
            ระบบติดตามงานหลังการขาย (Tracking System)
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            จัดกลุ่มรายการ, กำหนด Auto Trigger (ติ๊กอัตโนมัติเมื่อเหตุการณ์จริงเกิดขึ้น) หรือปล่อยว่างไว้เพื่อติ๊กเอง (manual),
            และติ๊ก &quot;บังคับก่อนจ่ายคอม&quot; สำหรับรายการที่ต้องทำให้เสร็จครบก่อนถึงจะกดจ่ายคอมมิชชั่นได้
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">รายการติดตาม</h3>
            <Button size="sm" onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-1" />
              เพิ่มรายการ
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-center text-gray-500 py-8 text-sm">ยังไม่มีรายการติดตาม</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                    <th className="p-2 w-8"></th>
                    <th className="p-2 text-left min-w-[220px]">ชื่อรายการ</th>
                    <th className="p-2 text-center w-24">เปิดใช้งาน</th>
                    <th className="p-2 text-center w-24">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {topLevel.map((top) => {
                    const children = childrenOf(top.id);
                    const isGroup = children.length > 0;
                    const isCollapsed = !!collapsed[top.id];
                    if (isGroup) {
                      return (
                        <Fragment key={top.id}>
                          {renderGroupRow(top, true, isCollapsed)}
                          {!isCollapsed && children.map((c) => renderItemRow(c, true))}
                        </Fragment>
                      );
                    }
                    return renderItemRow(top, false);
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalMode === 'create' ? 'เพิ่มรายการติดตาม' : 'แก้ไขรายการติดตาม'}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="ชื่อรายการ"
            value={formLabel}
            onChange={(e) => setFormLabel(e.target.value)}
            placeholder="เช่น ส่งใบนัดหมายรับกระเป๋า"
          />

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">คำอธิบาย (ไม่บังคับ)</label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="อธิบายวิธีทำ หรือเงื่อนไขเพิ่มเติม"
              rows={2}
              className="w-full text-sm border rounded-lg px-3 py-2 resize-none focus:ring-1 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">กลุ่ม (ไม่บังคับ)</label>
            <select
              value={formParentId}
              onChange={(e) => setFormParentId(e.target.value)}
              className="w-full text-sm border rounded-lg px-3 py-2 bg-white"
            >
              <option value="">— ไม่มีกลุ่ม (รายการเดี่ยว) —</option>
              {groupOptions.filter((g) => g.id !== modalItemId).map((g) => (
                <option key={g.id} value={g.id}>{g.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Auto Trigger — ติ๊กอัตโนมัติเมื่อเหตุการณ์นี้เกิดขึ้น (ไม่บังคับ)
            </label>
            <select
              value={formAutoEventKey}
              onChange={(e) => setFormAutoEventKey(e.target.value)}
              className="w-full text-sm border rounded-lg px-3 py-2 bg-white"
            >
              <option value="">✋ ติ๊กเอง (manual)</option>
              {CHECKLIST_EVENT_KEYS.map((ev) => (
                <option key={ev.key} value={ev.key}>⚡ {ev.label}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={formRequired}
              onChange={(e) => setFormRequired(e.target.checked)}
              className="w-4 h-4 text-orange-600 rounded"
            />
            บังคับก่อนจ่ายคอม
          </label>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={modalSaving}>
              ยกเลิก
            </Button>
            <Button onClick={handleModalSave} disabled={modalSaving}>
              {modalSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'บันทึก'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

