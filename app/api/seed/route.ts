import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// POST - สร้างข้อมูลตัวอย่าง
export async function POST() {
  try {
    // สร้าง Permissions
    const permissionsData = [
      // Dashboard
      { code: 'dashboard.view', name: 'ดูแดชบอร์ด', module: 'แดชบอร์ด' },
      
      // งานขาย
      { code: 'quotation.view', name: 'ดูใบเสนอราคา', module: 'งานขาย' },
      { code: 'quotation.create', name: 'สร้างใบเสนอราคา', module: 'งานขาย' },
      { code: 'quotation.edit', name: 'แก้ไขใบเสนอราคา', module: 'งานขาย' },
      { code: 'quotation.delete', name: 'ลบใบเสนอราคา', module: 'งานขาย' },
      { code: 'quotation.approve', name: 'อนุมัติใบเสนอราคา', module: 'งานขาย' },
      
      // ใบแจ้งหนี้
      { code: 'invoice.view', name: 'ดูใบแจ้งหนี้', module: 'ใบแจ้งหนี้' },
      { code: 'invoice.create', name: 'สร้างใบแจ้งหนี้', module: 'ใบแจ้งหนี้' },
      { code: 'invoice.edit', name: 'แก้ไขใบแจ้งหนี้', module: 'ใบแจ้งหนี้' },
      { code: 'invoice.delete', name: 'ลบใบแจ้งหนี้', module: 'ใบแจ้งหนี้' },
      
      // การเงิน
      { code: 'payment.view', name: 'ดูการรับชำระเงิน', module: 'การเงิน' },
      { code: 'payment.create', name: 'บันทึกการรับชำระเงิน', module: 'การเงิน' },
      { code: 'receipt.view', name: 'ดูใบเสร็จ', module: 'การเงิน' },
      { code: 'receipt.create', name: 'สร้างใบเสร็จ', module: 'การเงิน' },
      
      // ลูกค้า
      { code: 'customer.view', name: 'ดูข้อมูลลูกค้า', module: 'ลูกค้า' },
      { code: 'customer.create', name: 'เพิ่มลูกค้า', module: 'ลูกค้า' },
      { code: 'customer.edit', name: 'แก้ไขลูกค้า', module: 'ลูกค้า' },
      { code: 'customer.delete', name: 'ลบลูกค้า', module: 'ลูกค้า' },
      
      // ทัวร์
      { code: 'tour.view', name: 'ดูข้อมูลทัวร์', module: 'ทัวร์' },
      { code: 'tour.create', name: 'เพิ่มทัวร์', module: 'ทัวร์' },
      { code: 'tour.edit', name: 'แก้ไขทัวร์', module: 'ทัวร์' },
      { code: 'tour.delete', name: 'ลบทัวร์', module: 'ทัวร์' },
      
      // รายงาน
      { code: 'report.view', name: 'ดูรายงาน', module: 'รายงาน' },
      { code: 'report.export', name: 'ส่งออกรายงาน', module: 'รายงาน' },
      
      // ตั้งค่า
      { code: 'setting.view', name: 'ดูตั้งค่า', module: 'ตั้งค่า' },
      { code: 'setting.edit', name: 'แก้ไขตั้งค่า', module: 'ตั้งค่า' },
      
      // ผู้ใช้งาน
      { code: 'user.view', name: 'ดูผู้ใช้งาน', module: 'ผู้ใช้งาน' },
      { code: 'user.create', name: 'เพิ่มผู้ใช้งาน', module: 'ผู้ใช้งาน' },
      { code: 'user.edit', name: 'แก้ไขผู้ใช้งาน', module: 'ผู้ใช้งาน' },
      { code: 'user.delete', name: 'ลบผู้ใช้งาน', module: 'ผู้ใช้งาน' },
    ];

    // Upsert permissions
    for (const perm of permissionsData) {
      await prisma.permission.upsert({
        where: { code: perm.code },
        update: { name: perm.name, module: perm.module },
        create: perm,
      });
    }

    // Get all permissions for admin
    const allPermissions = await prisma.permission.findMany();

    // สร้าง Users ตัวอย่าง
    const usersData = [
      {
        email: 'admin@nexttrip.com',
        password: 'admin123',
        name: 'ผู้ดูแลระบบ',
        role: 'ADMIN' as const,
        isActive: true,
        permissions: allPermissions.map(p => p.id), // Admin has all permissions
      },
      {
        email: 'manager@nexttrip.com',
        password: 'manager123',
        name: 'สมชาย จัดการ',
        role: 'STAFF' as const,
        isActive: true,
        permissions: allPermissions
          .filter(p => !p.code.startsWith('user.') && !p.code.startsWith('setting.edit'))
          .map(p => p.id),
      },
      {
        email: 'sales@nexttrip.com',
        password: 'sales123',
        name: 'สมหญิง ขายดี',
        role: 'STAFF' as const,
        isActive: true,
        permissions: allPermissions
          .filter(p => 
            p.code.startsWith('dashboard') || 
            p.code.startsWith('quotation') || 
            p.code.startsWith('customer.view') ||
            p.code.startsWith('tour.view')
          )
          .map(p => p.id),
      },
      {
        email: 'finance@nexttrip.com',
        password: 'finance123',
        name: 'วิชัย การเงิน',
        role: 'STAFF' as const,
        isActive: true,
        permissions: allPermissions
          .filter(p => 
            p.code.startsWith('dashboard') || 
            p.code.startsWith('invoice') || 
            p.code.startsWith('payment') || 
            p.code.startsWith('receipt') ||
            p.code.startsWith('report')
          )
          .map(p => p.id),
      },
      {
        email: 'viewer@nexttrip.com',
        password: 'viewer123',
        name: 'มาลี ดูอย่างเดียว',
        role: 'VIEWER' as const,
        isActive: true,
        permissions: allPermissions
          .filter(p => p.code.endsWith('.view'))
          .map(p => p.id),
      },
    ];

    const createdUsers = [];
    for (const userData of usersData) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email },
      });

      if (existingUser) {
        // Update existing user
        await prisma.userPermission.deleteMany({
          where: { userId: existingUser.id },
        });

        const user = await prisma.user.update({
          where: { email: userData.email },
          data: {
            password: hashedPassword,
            name: userData.name,
            role: userData.role,
            isActive: userData.isActive,
            permissions: {
              create: userData.permissions.map(permissionId => ({
                permissionId,
              })),
            },
          },
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        });
        createdUsers.push(user);
      } else {
        // Create new user
        const user = await prisma.user.create({
          data: {
            email: userData.email,
            password: hashedPassword,
            name: userData.name,
            role: userData.role,
            isActive: userData.isActive,
            permissions: {
              create: userData.permissions.map(permissionId => ({
                permissionId,
              })),
            },
          },
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        });
        createdUsers.push(user);
      }
    }

    return NextResponse.json({
      message: 'Seed completed successfully',
      permissions: allPermissions.length,
      users: createdUsers.length,
    });
  } catch (error) {
    console.error('Error seeding data:', error);
    return NextResponse.json(
      { error: 'Failed to seed data' },
      { status: 500 }
    );
  }
}
