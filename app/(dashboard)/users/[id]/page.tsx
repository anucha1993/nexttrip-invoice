'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Shield, Mail, User, UserCheck, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface Permission {
  id: string;
  code: string;
  name: string;
  module: string;
}

interface ProfilePermission {
  permission: Permission;
}

interface Profile {
  id: string;
  code: string;
  name: string;
  permissions: ProfilePermission[];
}

interface UserData {
  id: string;
  email: string;
  name: string;
  profileId: string | null;
  profile: Profile | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function ViewUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser();
  }, [id]);

  const fetchUser = async () => {
    try {
      const res = await fetch(`/api/users/${id}`);
      if (!res.ok) {
        router.push('/users');
        return;
      }
      const data = await res.json();
      setUser(data);
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group permissions by module
  const groupPermissionsByModule = (permissions: ProfilePermission[]) => {
    const grouped: Record<string, Permission[]> = {};
    permissions.forEach(({ permission }) => {
      if (!grouped[permission.module]) {
        grouped[permission.module] = [];
      }
      grouped[permission.module].push(permission);
    });
    return grouped;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">กำลังโหลด...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">ไม่พบข้อมูลผู้ใช้งาน</div>
      </div>
    );
  }

  const groupedPermissions = user.profile ? groupPermissionsByModule(user.profile.permissions) : {};

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/users">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">รายละเอียดผู้ใช้งาน</h1>
            <p className="text-gray-500 mt-1">{user.name}</p>
          </div>
        </div>
        <Link href={`/users/${id}/edit`}>
          <Button>
            <Edit className="w-4 h-4 mr-2" />
            แก้ไข
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">ข้อมูลผู้ใช้งาน</h3>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-6">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-2xl">
                    {user.name.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <User className="w-4 h-4" />
                      <span>{user.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span>{user.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {user.profile ? (
                        <Link href={`/profiles/${user.profile.id}`}>
                          <Badge variant="info">{user.profile.name}</Badge>
                        </Link>
                      ) : (
                        <Badge variant="secondary">ไม่มีโปรไฟล์</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {user.isActive ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <UserCheck className="w-4 h-4" />
                          <span>ใช้งาน</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-gray-400">
                          <UserX className="w-4 h-4" />
                          <span>ปิดใช้งาน</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Permissions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">สิทธิ์การใช้งาน</h3>
              {user.profile && (
                <Badge variant="info">{user.profile.permissions.length} สิทธิ์</Badge>
              )}
            </CardHeader>
            <CardContent>
              {!user.profile ? (
                <div className="text-center py-8 text-gray-500">
                  <Shield className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p>ยังไม่ได้กำหนดโปรไฟล์สิทธิ์</p>
                  <Link href={`/users/${id}/edit`} className="text-blue-600 hover:underline text-sm">
                    กำหนดโปรไฟล์
                  </Link>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                    สิทธิ์จากโปรไฟล์: <strong>{user.profile.name}</strong> ({user.profile.code})
                  </div>
                  {Object.entries(groupedPermissions).map(([module, permissions]) => (
                    <div key={module} className="space-y-2">
                      <h4 className="font-medium text-gray-900 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-blue-600" />
                        {module}
                      </h4>
                      <div className="flex flex-wrap gap-2 pl-6">
                        {permissions.map((permission) => (
                          <Badge key={permission.id} variant="default">
                            {permission.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                  {user.profile.permissions.length === 0 && (
                    <p className="text-gray-500 text-center py-4">ไม่มีสิทธิ์ที่กำหนดในโปรไฟล์นี้</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="p-4">
            <h4 className="font-medium text-gray-900 mb-4">ข้อมูลเพิ่มเติม</h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">วันที่สร้าง</span>
                <span className="text-gray-900">
                  {new Date(user.createdAt).toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">แก้ไขล่าสุด</span>
                <span className="text-gray-900">
                  {new Date(user.updatedAt).toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
