'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ArrowLeft, Save, Package } from 'lucide-react';
import Link from 'next/link';

const calculationTypeOptions = [
  { value: 'INCOME', label: 'รายได้' },
  { value: 'DISCOUNT', label: 'ส่วนลด' },
  { value: 'FREE', label: 'ฟรี' },
];

export default function CreateProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    calculationType: 'INCOME',
    includePax: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.name) newErrors.name = 'กรุณากรอกชื่อรายการ';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.push('/products');
      } else {
        const error = await response.json();
        setErrors({ submit: error.error || 'เกิดข้อผิดพลาดในการสร้างรายการ' });
      }
    } catch (error) {
      console.error('Error creating product:', error);
      setErrors({ submit: 'เกิดข้อผิดพลาดในการสร้างรายการ' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/products">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            กลับ
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">เพิ่มรายการสินค้า/บริการ</h1>
          <p className="text-gray-600">กรอกข้อมูลรายการสินค้าหรือบริการใหม่</p>
        </div>
      </div>

      {errors.submit && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {errors.submit}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card className="max-w-2xl">
          <CardHeader>
            <div className="flex items-center gap-2 font-semibold">
              <Package className="w-5 h-5" />
              ข้อมูลรายการ
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ชื่อรายการสินค้า/บริการ *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="เช่น ค่าทัวร์ญี่ปุ่น, ค่าตั๋วเครื่องบิน"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ประเภทการคำนวณ
              </label>
              <Select
                value={formData.calculationType}
                onChange={(e) => setFormData({ ...formData, calculationType: e.target.value })}
              >
                {calculationTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                รายได้ = บวกเข้ายอดรวม | ส่วนลด = หักออกจากยอด | ฟรี = ไม่คิดเงิน
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ตัวเลือกนี้รวมผล PAX
              </label>
              <Select
                value={formData.includePax ? '1' : '0'}
                onChange={(e) => setFormData({ ...formData, includePax: e.target.value === '1' })}
              >
                <option value="0">ไม่รวม PAX</option>
                <option value="1">รวม PAX (คูณจำนวนคน)</option>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                รวม PAX = ราคาจะถูกคูณด้วยจำนวนผู้โดยสาร
              </p>
            </div>
             {/* Actions */}
        <div className="flex justify-end gap-4 mt-6">
          <Link href="/products">
            <Button type="button" variant="outline">
              ยกเลิก
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
        </div>
          </CardContent>
        </Card>

       
      </form>
    </div>
  );
}
