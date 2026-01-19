'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Eye, Edit, Trash2, MoreVertical, Shield, UserCheck, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Modal } from '@/components/ui/modal';
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

interface User {
  id: string;
  email: string;
  name: string;
  profileId: string | null;
  profile: Profile | null;
  isActive: boolean;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; user: User | null }>({
    open: false,
    user: null,
  });
  const [permissionModal, setPermissionModal] = useState<{ open: boolean; user: User | null }>({
    open: false,
    user: null,
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.user) return;
    
    try {
      await fetch(`/api/users/${deleteModal.user.id}`, {
        method: 'DELETE',
      });
      setUsers(users.filter(u => u.id !== deleteModal.user?.id));
      setDeleteModal({ open: false, user: null });
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const filteredUsers = users.filter((user) => {
    return (
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ผู้ใช้งาน</h1>
          <p className="text-gray-500 mt-1">จัดการผู้ใช้งานและโปรไฟล์สิทธิ์</p>
        </div>
        <Link href="/users/create">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            เพิ่มผู้ใช้งาน
          </Button>
        </Link>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="ค้นหาชื่อ หรืออีเมล..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Users Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ผู้ใช้งาน</TableHead>
              <TableHead>โปรไฟล์</TableHead>
              <TableHead>สิทธิ์</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead>วันที่สร้าง</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => {
              const permissionCount = user.profile?.permissions?.length || 0;
              return (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-medium text-sm">
                          {user.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.profile ? (
                      <Link href={`/profiles/${user.profile.id}`}>
                        <Badge variant="info">{user.profile.name}</Badge>
                      </Link>
                    ) : (
                      <Badge variant="secondary">ไม่มีโปรไฟล์</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.profile ? (
                      <button
                        onClick={() => setPermissionModal({ open: true, user })}
                        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                      >
                        <Shield className="w-4 h-4" />
                        {permissionCount} สิทธิ์
                      </button>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.isActive ? (
                      <div className="flex items-center gap-1 text-green-600">
                        <UserCheck className="w-4 h-4" />
                        <span className="text-sm">ใช้งาน</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-gray-400">
                        <UserX className="w-4 h-4" />
                        <span className="text-sm">ปิดใช้งาน</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString('th-TH')}
                  </TableCell>
                  <TableCell>
                    <div className="relative">
                      <button
                        onClick={() => setOpenMenu(openMenu === user.id ? null : user.id)}
                        className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {openMenu === user.id && (
                        <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                          <Link
                            href={`/users/${user.id}`}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Eye className="w-4 h-4" />
                            ดูรายละเอียด
                          </Link>
                          <Link
                            href={`/users/${user.id}/edit`}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Edit className="w-4 h-4" />
                            แก้ไข
                          </Link>
                          <button
                            onClick={() => {
                              setOpenMenu(null);
                              setDeleteModal({ open: true, user });
                            }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                            ลบ
                          </button>
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            ไม่พบข้อมูลผู้ใช้งาน
          </div>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, user: null })}
        title="ยืนยันการลบ"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            คุณต้องการลบผู้ใช้งาน <strong>{deleteModal.user?.name}</strong> ใช่หรือไม่?
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setDeleteModal({ open: false, user: null })}
            >
              ยกเลิก
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              ลบ
            </Button>
          </div>
        </div>
      </Modal>

      {/* Permission View Modal */}
      <Modal
        isOpen={permissionModal.open}
        onClose={() => setPermissionModal({ open: false, user: null })}
        title={`สิทธิ์ของ ${permissionModal.user?.name}`}
        size="lg"
      >
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {permissionModal.user?.profile && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                โปรไฟล์: <strong>{permissionModal.user.profile.name}</strong> ({permissionModal.user.profile.code})
              </p>
            </div>
          )}
          {permissionModal.user?.profile && Object.entries(groupPermissionsByModule(permissionModal.user.profile.permissions)).map(([module, permissions]) => (
            <div key={module} className="space-y-2">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-600" />
                {module}
              </h4>
              <div className="flex flex-wrap gap-2 pl-6">
                {permissions.map((permission) => (
                  <Badge key={permission.id} variant="info">
                    {permission.name}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
          {(!permissionModal.user?.profile || permissionModal.user.profile.permissions.length === 0) && (
            <p className="text-gray-500 text-center py-4">ไม่มีสิทธิ์ที่กำหนด</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
