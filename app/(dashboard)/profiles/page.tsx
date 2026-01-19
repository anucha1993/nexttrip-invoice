'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit, Trash2, Eye, Shield } from 'lucide-react';
import Link from 'next/link';

interface Permission {
  id: string;
  code: string;
  name: string;
  module: string;
}

interface Profile {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  permissions: {
    permission: Permission;
  }[];
  _count: {
    users: number;
  };
}

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const response = await fetch('/api/profiles');
      const data = await response.json();
      setProfiles(data);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('คุณต้องการลบโปรไฟล์นี้หรือไม่?')) return;

    try {
      const response = await fetch(`/api/profiles/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchProfiles();
      } else {
        const error = await response.json();
        alert(error.error || 'เกิดข้อผิดพลาดในการลบ');
      }
    } catch (error) {
      console.error('Error deleting profile:', error);
      alert('เกิดข้อผิดพลาดในการลบ');
    }
  };

  const filteredProfiles = profiles.filter(
    (profile) =>
      profile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group permissions by module
  const groupPermissions = (permissions: { permission: Permission }[]) => {
    const grouped: Record<string, string[]> = {};
    permissions.forEach(({ permission }) => {
      if (!grouped[permission.module]) {
        grouped[permission.module] = [];
      }
      grouped[permission.module].push(permission.name);
    });
    return grouped;
  };

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">โปรไฟล์สิทธิ์</h1>
            <p className="text-gray-600">จัดการโปรไฟล์และกำหนดสิทธิ์การใช้งาน</p>
          </div>
          <Link href="/profiles/create">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              เพิ่มโปรไฟล์
            </Button>
          </Link>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="ค้นหาโปรไฟล์..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Profiles Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 font-semibold">
              <Shield className="w-5 h-5" />
              รายการโปรไฟล์
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">กำลังโหลด...</div>
            ) : filteredProfiles.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                ไม่พบข้อมูลโปรไฟล์
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>รหัส</TableHead>
                    <TableHead>ชื่อโปรไฟล์</TableHead>
                    <TableHead>คำอธิบาย</TableHead>
                    <TableHead>จำนวนสิทธิ์</TableHead>
                    <TableHead>ผู้ใช้งาน</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfiles.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell className="font-medium">{profile.code}</TableCell>
                      <TableCell>{profile.name}</TableCell>
                      <TableCell className="text-gray-500">
                        {profile.description || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {profile.permissions.length} สิทธิ์
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {profile._count.users} คน
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={profile.isActive ? 'success' : 'warning'}>
                          {profile.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Link href={`/profiles/${profile.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Link href={`/profiles/${profile.id}/edit`}>
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(profile.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
