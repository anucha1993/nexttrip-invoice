'use client';

import { useState, useEffect, use } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Shield, Users } from 'lucide-react';
import Link from 'next/link';

interface Permission {
  id: string;
  code: string;
  name: string;
  module: string;
}

interface User {
  id: string;
  name: string;
  email: string;
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
  users: User[];
}

export default function ViewProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`/api/profiles/${id}`);
      const data = await response.json();
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group permissions by module
  const groupedPermissions = profile?.permissions.reduce((acc, { permission }) => {
    if (!acc[permission.module]) {
      acc[permission.module] = [];
    }
    acc[permission.module].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>) || {};

  if (loading) {
    return (
      <div className="text-center py-8">กำลังโหลด...</div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-8">ไม่พบข้อมูลโปรไฟล์</div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/profiles">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                กลับ
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{profile.name}</h1>
              <p className="text-gray-600">รายละเอียดโปรไฟล์และสิทธิ์</p>
            </div>
          </div>
          <Link href={`/profiles/${id}/edit`}>
            <Button>
              <Edit className="w-4 h-4 mr-2" />
              แก้ไข
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Info */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 font-semibold">
                  <Shield className="w-5 h-5" />
                  ข้อมูลโปรไฟล์
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="text-sm text-gray-500">รหัส</span>
                  <p className="font-medium">{profile.code}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">ชื่อโปรไฟล์</span>
                  <p className="font-medium">{profile.name}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">คำอธิบาย</span>
                  <p className="font-medium">{profile.description || '-'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">สถานะ</span>
                  <div className="mt-1">
                    <Badge variant={profile.isActive ? 'success' : 'warning'}>
                      {profile.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-sm text-gray-500">จำนวนสิทธิ์</span>
                  <p className="font-medium">{profile.permissions.length} สิทธิ์</p>
                </div>
              </CardContent>
            </Card>

            {/* Users using this profile */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 font-semibold">
                  <Users className="w-5 h-5" />
                  ผู้ใช้งานในโปรไฟล์นี้ ({profile.users.length})
                </div>
              </CardHeader>
              <CardContent>
                {profile.users.length === 0 ? (
                  <p className="text-gray-500 text-sm">ยังไม่มีผู้ใช้งาน</p>
                ) : (
                  <div className="space-y-2">
                    {profile.users.map((user) => (
                      <Link
                        key={user.id}
                        href={`/users/${user.id}`}
                        className="block p-2 rounded-lg hover:bg-gray-50"
                      >
                        <p className="font-medium text-sm">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Permissions */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="font-semibold">สิทธิ์การใช้งาน</div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {Object.entries(groupedPermissions).map(([module, modulePermissions]) => (
                    <div key={module} className="border rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        {module}
                        <Badge variant="outline">{modulePermissions.length}</Badge>
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {modulePermissions.map((permission) => (
                          <Badge key={permission.id} variant="secondary">
                            {permission.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                  {Object.keys(groupedPermissions).length === 0 && (
                    <p className="text-gray-500 text-center py-4">ยังไม่มีสิทธิ์ที่กำหนด</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
    </div>
  );
}
