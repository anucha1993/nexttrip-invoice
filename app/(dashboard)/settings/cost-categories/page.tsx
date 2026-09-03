'use client';

// app/(dashboard)/settings/cost-categories/page.tsx
// ตั้งค่า "ประเภทต้นทุน" ที่ใช้ในแท็บ "ระบบจัดการต้นทุน" (scope=GENERAL) และ
// "ต้นทุนโฮลเซลล์" (scope=WHOLESALE) บนหน้าใบเสนอราคาแต่ละใบ — เพิ่ม/แก้ไข/ปิดใช้งานได้
// จากที่นี่ที่เดียว แทนการแก้โค้ด costTypeOptions ในไฟล์ dashboard โดยตรง

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Wallet, Loader2, Plus, Trash2, Pencil } from 'lucide-react';
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

interface CostCategoryRow {
  id: number;
  scope: 'GENERAL' | 'WHOLESALE';
  key: string;
  label: string;
  isActive: boolean | number;
  sortOrder: number;
}

const SCOPE_TABS: { scope: 'GENERAL' | 'WHOLESALE'; label: string }[] = [
  { scope: 'GENERAL', label: 'ระบบจัดการต้นทุน' },
  { scope: 'WHOLESALE', label: 'ต้นทุนโฮลเซลล์' },
];

export default function CostCategoriesSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CostCategoryRow[]>([]);
  const [activeScope, setActiveScope] = useState<'GENERAL' | 'WHOLESALE'>('GENERAL');
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [modalId, setModalId] = useState<number | null>(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [formLabel, setFormLabel] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/cost-categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (e) {
      console.error('Error loading cost categories:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleActive = async (id: number, nextActive: boolean) => {
    setSavingId(id);
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, isActive: nextActive } : c)));
    try {
      const res = await fetch(`/api/settings/cost-categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: nextActive }),
      });
      if (!res.ok) {
        setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, isActive: !nextActive } : c)));
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'บันทึกไม่สำเร็จ');
      }
    } catch (e) {
      console.error('Error toggling cost category:', e);
      setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, isActive: !nextActive } : c)));
    } finally {
      setSavingId(null);
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    setModalId(null);
    setFormLabel('');
    setModalOpen(true);
  };

  const openEditModal = (cat: CostCategoryRow) => {
    setModalMode('edit');
    setModalId(cat.id);
    setFormLabel(cat.label);
    setModalOpen(true);
  };

  const handleModalSave = async () => {
    if (!formLabel.trim()) {
      alert('กรุณาระบุชื่อประเภทต้นทุน');
      return;
    }
    setModalSaving(true);
    try {
      if (modalMode === 'create') {
        const res = await fetch('/api/settings/cost-categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scope: activeScope, label: formLabel.trim() }),
        });
        if (res.ok) {
          const data = await res.json();
          setCategories((prev) => [...prev, data.category]);
          setModalOpen(false);
        } else {
          const data = await res.json().catch(() => ({}));
          alert(data.error || 'เพิ่มรายการไม่สำเร็จ');
        }
      } else if (modalId != null) {
        const res = await fetch(`/api/settings/cost-categories/${modalId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ label: formLabel.trim() }),
        });
        if (res.ok) {
          const data = await res.json();
          setCategories((prev) => prev.map((c) => (c.id === modalId ? { ...c, ...data.category } : c)));
          setModalOpen(false);
        } else {
          const data = await res.json().catch(() => ({}));
          alert(data.error || 'บันทึกไม่สำเร็จ');
        }
      }
    } catch (e) {
      console.error('Error saving cost category:', e);
      alert('บันทึกไม่สำเร็จ');
    } finally {
      setModalSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('ลบประเภทต้นทุนนี้? (รายการต้นทุนที่เคยบันทึกไปแล้วจะไม่ถูกลบ แค่จะไม่มีในลิสต์ให้เลือกอีก)')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/settings/cost-categories/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCategories((prev) => prev.filter((c) => c.id !== id));
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'ลบไม่สำเร็จ');
      }
    } catch (e) {
      console.error('Error deleting cost category:', e);
      alert('ลบไม่สำเร็จ');
    } finally {
      setDeletingId(null);
    }
  };

  const rows = categories
    .filter((c) => c.scope === activeScope)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wallet className="w-6 h-6" />
            ประเภทต้นทุน
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            จัดการรายการ "ประเภทต้นทุน" ที่เลือกได้ในแท็บระบบจัดการต้นทุน/ต้นทุนโฮลเซลล์ของใบเสนอราคา
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
              {SCOPE_TABS.map((t) => (
                <button
                  key={t.scope}
                  onClick={() => setActiveScope(t.scope)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    activeScope === t.scope ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <Button size="sm" onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-2" />
              เพิ่มประเภทต้นทุน
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-400 text-sm flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> กำลังโหลด...
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">ยังไม่มีประเภทต้นทุนในหมวดนี้</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-left">
                    <th className="px-3 py-2 font-medium">ชื่อประเภท</th>
                    <th className="px-3 py-2 font-medium text-xs text-gray-400">Key</th>
                    <th className="px-3 py-2 font-medium text-center w-24">เปิดใช้งาน</th>
                    <th className="px-3 py-2 font-medium text-center w-24">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((cat) => (
                    <tr key={cat.id} className={!cat.isActive ? 'opacity-50' : ''}>
                      <td className="px-3 py-2 font-medium">{cat.label}</td>
                      <td className="px-3 py-2 text-xs text-gray-400 font-mono">{cat.key}</td>
                      <td className="px-3 py-2 text-center">
                        <ToggleSwitch
                          checked={!!cat.isActive}
                          disabled={savingId === cat.id}
                          onChange={(v) => toggleActive(cat.id, v)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center gap-1">
                          {savingId === cat.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
                          <button
                            onClick={() => openEditModal(cat)}
                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"
                            title="แก้ไข"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(cat.id)}
                            disabled={deletingId === cat.id}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                            title="ลบ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={modalMode === 'create' ? 'เพิ่มประเภทต้นทุน' : 'แก้ไขประเภทต้นทุน'} size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">ชื่อประเภทต้นทุน *</label>
            <Input value={formLabel} onChange={(e) => setFormLabel(e.target.value)} placeholder="เช่น ค่าวีซ่า" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleModalSave} disabled={modalSaving}>
              {modalSaving ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
