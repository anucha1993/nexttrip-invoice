'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Search, Shield, Lock } from 'lucide-react';

interface Permission {
  id: string;
  code: string;
  name: string;
  module: string;
  description: string | null;
  createdAt: string;
}

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      const response = await fetch('/api/permissions');
      const data = await response.json();
      setPermissions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  // Group permissions by module
  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = [];
    }
    acc[permission.module].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  const filteredPermissions = permissions.filter(
    (permission) =>
      permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.module.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group filtered permissions by module
  const filteredGrouped = filteredPermissions.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = [];
    }
    acc[permission.module].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">สิทธิ์การใช้งาน</h1>
          <p className="text-gray-600">รายการสิทธิ์ทั้งหมดในระบบ (จัดการผ่าน Profile)</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Lock className="w-4 h-4" />
          ทั้งหมด {permissions.length} สิทธิ์
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="ค้นหาสิทธิ์..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Permissions by Module */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">กำลังโหลด...</div>
      ) : Object.keys(filteredGrouped).length === 0 ? (
        <div className="text-center py-8 text-gray-500">ไม่พบข้อมูลสิทธิ์</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Object.entries(filteredGrouped).map(([module, modulePermissions]) => (
            <Card key={module}>
              <CardHeader>
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <Shield className="w-5 h-5 text-blue-600" />
                  {module}
                  <Badge variant="info" className="ml-auto">
                    {modulePermissions.length} สิทธิ์
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>รหัส</TableHead>
                      <TableHead>ชื่อสิทธิ์</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modulePermissions.map((permission) => (
                      <TableRow key={permission.id}>
                        <TableCell>
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {permission.code}
                          </code>
                        </TableCell>
                        <TableCell>{permission.name}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Info Box */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-blue-900">การจัดการสิทธิ์</h3>
              <p className="text-sm text-blue-700 mt-1">
                สิทธิ์การใช้งานจะถูกกำหนดผ่าน <strong>โปรไฟล์สิทธิ์ (Profile)</strong> 
                โดยสามารถจัดการได้ที่หน้า{' '}
                <a href="/profiles" className="underline hover:no-underline">
                  โปรไฟล์สิทธิ์
                </a>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
