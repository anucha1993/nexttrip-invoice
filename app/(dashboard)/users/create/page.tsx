'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import Link from 'next/link';

interface Profile {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export default function CreateUserPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    profileId: '',
    isActive: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const res = await fetch('/api/profiles');
      const data = await res.json();
      console.log('Profiles response:', data);
      const profileList = Array.isArray(data) ? data : [];
      setProfiles(profileList.filter((p: Profile) => p.isActive));
    } catch (error) {
      console.error('Error fetching profiles:', error);
      setProfiles([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.name) newErrors.name = 'กรุณากรอกชื่อ';
    if (!formData.email) newErrors.email = 'กรุณากรอกอีเมล';
    if (!formData.password) newErrors.password = 'กรุณากรอกรหัสผ่าน';
    if (formData.password && formData.password.length < 6) {
      newErrors.password = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          profileId: formData.profileId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setErrors({ submit: data.error || 'เกิดข้อผิดพลาด' });
        return;
      }

      router.push('/users');
    } catch (error) {
      console.error('Error creating user:', error);
      setErrors({ submit: 'เกิดข้อผิดพลาดในการสร้างผู้ใช้งาน' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Link href="/users">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">เพิ่มผู้ใช้งาน</h1>
          <p className="text-gray-500 mt-1">สร้างบัญชีผู้ใช้งานใหม่</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">ข้อมูลผู้ใช้งาน</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="ชื่อ-นามสกุล"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={errors.name}
              placeholder="กรอกชื่อ-นามสกุล"
            />
            <Input
              label="อีเมล"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={errors.email}
              placeholder="example@email.com"
            />
            <div className="relative">
              <Input
                label="รหัสผ่าน"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                error={errors.password}
                placeholder="อย่างน้อย 6 ตัวอักษร"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="โปรไฟล์สิทธิ์"
                value={formData.profileId}
                onChange={(e) => setFormData({ ...formData, profileId: e.target.value })}
                options={[
                  { value: '', label: '-- ไม่มีโปรไฟล์ --' },
                  ...profiles.map((p) => ({ value: p.id, label: p.name })),
                ]}
              />
              <Select
                label="สถานะ"
                value={formData.isActive ? 'true' : 'false'}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}
                options={[
                  { value: 'true', label: 'ใช้งาน' },
                  { value: 'false', label: 'ปิดใช้งาน' },
                ]}
              />
            </div>

            {errors.submit && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                {errors.submit}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <Link href="/users">
            <Button variant="outline" type="button">
              ยกเลิก
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
        </div>
      </form>
    </div>
  );
}
