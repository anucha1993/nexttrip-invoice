const { PrismaClient } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
const bcrypt = require('bcryptjs');

const adapter = new PrismaMariaDb({
  host: '103.80.48.25',
  port: 3306,
  user: 'mailfore_nexttrip_invoice',
  password: 'G2pvPm5acsB*o_z0',
  database: 'nexttrip_invoice',
  connectionLimit: 5,
});
const prisma = new PrismaClient({ adapter });

async function seed() {
  console.log('Starting seed...');
  
  // 1. Seed Permissions
  const permissions = [
    { code: 'dashboard.view', name: 'ดูแดชบอร์ด', module: 'แดชบอร์ด' },
    { code: 'quotation.view', name: 'ดูใบเสนอราคา', module: 'งานขาย' },
    { code: 'quotation.create', name: 'สร้างใบเสนอราคา', module: 'งานขาย' },
    { code: 'quotation.edit', name: 'แก้ไขใบเสนอราคา', module: 'งานขาย' },
    { code: 'quotation.delete', name: 'ลบใบเสนอราคา', module: 'งานขาย' },
    { code: 'quotation.approve', name: 'อนุมัติใบเสนอราคา', module: 'งานขาย' },
    { code: 'invoice.view', name: 'ดูใบแจ้งหนี้', module: 'ใบแจ้งหนี้' },
    { code: 'invoice.create', name: 'สร้างใบแจ้งหนี้', module: 'ใบแจ้งหนี้' },
    { code: 'invoice.edit', name: 'แก้ไขใบแจ้งหนี้', module: 'ใบแจ้งหนี้' },
    { code: 'invoice.delete', name: 'ลบใบแจ้งหนี้', module: 'ใบแจ้งหนี้' },
    { code: 'payment.view', name: 'ดูการรับชำระเงิน', module: 'การเงิน' },
    { code: 'payment.create', name: 'บันทึกการรับชำระเงิน', module: 'การเงิน' },
    { code: 'receipt.view', name: 'ดูใบเสร็จ', module: 'การเงิน' },
    { code: 'receipt.create', name: 'สร้างใบเสร็จ', module: 'การเงิน' },
    { code: 'customer.view', name: 'ดูข้อมูลลูกค้า', module: 'ลูกค้า' },
    { code: 'customer.create', name: 'เพิ่มลูกค้า', module: 'ลูกค้า' },
    { code: 'customer.edit', name: 'แก้ไขลูกค้า', module: 'ลูกค้า' },
    { code: 'customer.delete', name: 'ลบลูกค้า', module: 'ลูกค้า' },
    { code: 'tour.view', name: 'ดูข้อมูลทัวร์', module: 'ทัวร์' },
    { code: 'tour.create', name: 'เพิ่มทัวร์', module: 'ทัวร์' },
    { code: 'tour.edit', name: 'แก้ไขทัวร์', module: 'ทัวร์' },
    { code: 'tour.delete', name: 'ลบทัวร์', module: 'ทัวร์' },
    { code: 'report.view', name: 'ดูรายงาน', module: 'รายงาน' },
    { code: 'report.export', name: 'ส่งออกรายงาน', module: 'รายงาน' },
    { code: 'setting.view', name: 'ดูตั้งค่า', module: 'ตั้งค่า' },
    { code: 'setting.edit', name: 'แก้ไขตั้งค่า', module: 'ตั้งค่า' },
    { code: 'user.view', name: 'ดูผู้ใช้งาน', module: 'ผู้ใช้งาน' },
    { code: 'user.create', name: 'เพิ่มผู้ใช้งาน', module: 'ผู้ใช้งาน' },
    { code: 'user.edit', name: 'แก้ไขผู้ใช้งาน', module: 'ผู้ใช้งาน' },
    { code: 'user.delete', name: 'ลบผู้ใช้งาน', module: 'ผู้ใช้งาน' },
    { code: 'profile.view', name: 'ดูโปรไฟล์สิทธิ์', module: 'ผู้ใช้งาน' },
    { code: 'profile.create', name: 'เพิ่มโปรไฟล์สิทธิ์', module: 'ผู้ใช้งาน' },
    { code: 'profile.edit', name: 'แก้ไขโปรไฟล์สิทธิ์', module: 'ผู้ใช้งาน' },
    { code: 'profile.delete', name: 'ลบโปรไฟล์สิทธิ์', module: 'ผู้ใช้งาน' },
    { code: 'auth.login', name: 'เข้าสู่ระบบ', module: 'ระบบ' },
    { code: 'auth.logout', name: 'ออกจากระบบ', module: 'ระบบ' },
    { code: 'auth.change-password', name: 'เปลี่ยนรหัสผ่าน', module: 'ระบบ' },
    { code: 'auth.reset-password', name: 'รีเซ็ตรหัสผ่าน', module: 'ระบบ' },
  ];

  try {
    console.log('\n📋 Seeding Permissions...');
    for (const perm of permissions) {
      await prisma.permission.upsert({
        where: { code: perm.code },
        update: { name: perm.name, module: perm.module },
        create: perm,
      });
      console.log(`  ✓ ${perm.code}`);
    }
    
    // 2. Seed Profiles
    console.log('\n👤 Seeding Profiles...');
    
    // Get all permission IDs
    const allPermissions = await prisma.permission.findMany();
    const permissionMap = allPermissions.reduce((acc, p) => {
      acc[p.code] = p.id;
      return acc;
    }, {});
    
    // Profile: Admin (all permissions)
    const adminProfile = await prisma.profile.upsert({
      where: { code: 'ADMIN' },
      update: { name: 'ผู้ดูแลระบบ', description: 'สิทธิ์ทั้งหมดในระบบ' },
      create: { code: 'ADMIN', name: 'ผู้ดูแลระบบ', description: 'สิทธิ์ทั้งหมดในระบบ' },
    });
    console.log(`  ✓ Profile: ADMIN`);
    
    // Add all permissions to admin
    await prisma.profilePermission.deleteMany({ where: { profileId: adminProfile.id } });
    for (const perm of allPermissions) {
      await prisma.profilePermission.create({
        data: { profileId: adminProfile.id, permissionId: perm.id },
      });
    }
    console.log(`    - Added ${allPermissions.length} permissions`);
    
    // Profile: Manager
    const managerProfile = await prisma.profile.upsert({
      where: { code: 'MANAGER' },
      update: { name: 'ผู้จัดการ', description: 'สิทธิ์จัดการข้อมูลหลัก' },
      create: { code: 'MANAGER', name: 'ผู้จัดการ', description: 'สิทธิ์จัดการข้อมูลหลัก' },
    });
    console.log(`  ✓ Profile: MANAGER`);
    
    const managerPermissions = [
      'dashboard.view', 'quotation.view', 'quotation.create', 'quotation.edit', 'quotation.approve',
      'invoice.view', 'invoice.create', 'invoice.edit',
      'payment.view', 'payment.create', 'receipt.view', 'receipt.create',
      'customer.view', 'customer.create', 'customer.edit',
      'tour.view', 'tour.create', 'tour.edit',
      'report.view', 'report.export', 'user.view',
      'auth.login', 'auth.logout', 'auth.change-password',
    ];
    await prisma.profilePermission.deleteMany({ where: { profileId: managerProfile.id } });
    for (const code of managerPermissions) {
      if (permissionMap[code]) {
        await prisma.profilePermission.create({
          data: { profileId: managerProfile.id, permissionId: permissionMap[code] },
        });
      }
    }
    console.log(`    - Added ${managerPermissions.length} permissions`);
    
    // Profile: Staff
    const staffProfile = await prisma.profile.upsert({
      where: { code: 'STAFF' },
      update: { name: 'พนักงาน', description: 'สิทธิ์พื้นฐานสำหรับพนักงาน' },
      create: { code: 'STAFF', name: 'พนักงาน', description: 'สิทธิ์พื้นฐานสำหรับพนักงาน' },
    });
    console.log(`  ✓ Profile: STAFF`);
    
    const staffPermissions = [
      'dashboard.view', 'quotation.view', 'quotation.create',
      'invoice.view', 'customer.view', 'customer.create',
      'tour.view', 'report.view',
      'auth.login', 'auth.logout', 'auth.change-password',
    ];
    await prisma.profilePermission.deleteMany({ where: { profileId: staffProfile.id } });
    for (const code of staffPermissions) {
      if (permissionMap[code]) {
        await prisma.profilePermission.create({
          data: { profileId: staffProfile.id, permissionId: permissionMap[code] },
        });
      }
    }
    console.log(`    - Added ${staffPermissions.length} permissions`);
    
    // Profile: Accountant
    const accountantProfile = await prisma.profile.upsert({
      where: { code: 'ACCOUNTANT' },
      update: { name: 'บัญชี', description: 'สิทธิ์สำหรับฝ่ายบัญชี' },
      create: { code: 'ACCOUNTANT', name: 'บัญชี', description: 'สิทธิ์สำหรับฝ่ายบัญชี' },
    });
    console.log(`  ✓ Profile: ACCOUNTANT`);
    
    const accountantPermissions = [
      'dashboard.view', 'quotation.view',
      'invoice.view', 'invoice.create', 'invoice.edit',
      'payment.view', 'payment.create', 'receipt.view', 'receipt.create',
      'customer.view', 'report.view', 'report.export',
      'auth.login', 'auth.logout', 'auth.change-password',
    ];
    await prisma.profilePermission.deleteMany({ where: { profileId: accountantProfile.id } });
    for (const code of accountantPermissions) {
      if (permissionMap[code]) {
        await prisma.profilePermission.create({
          data: { profileId: accountantProfile.id, permissionId: permissionMap[code] },
        });
      }
    }
    console.log(`    - Added ${accountantPermissions.length} permissions`);
    
    // Profile: Viewer
    const viewerProfile = await prisma.profile.upsert({
      where: { code: 'VIEWER' },
      update: { name: 'ผู้ชม', description: 'สิทธิ์ดูข้อมูลเท่านั้น' },
      create: { code: 'VIEWER', name: 'ผู้ชม', description: 'สิทธิ์ดูข้อมูลเท่านั้น' },
    });
    console.log(`  ✓ Profile: VIEWER`);
    
    const viewerPermissions = [
      'dashboard.view', 'quotation.view', 'invoice.view',
      'customer.view', 'tour.view', 'report.view',
      'auth.login', 'auth.logout', 'auth.change-password',
    ];
    await prisma.profilePermission.deleteMany({ where: { profileId: viewerProfile.id } });
    for (const code of viewerPermissions) {
      if (permissionMap[code]) {
        await prisma.profilePermission.create({
          data: { profileId: viewerProfile.id, permissionId: permissionMap[code] },
        });
      }
    }
    console.log(`    - Added ${viewerPermissions.length} permissions`);
    
    // 3. Create Admin User
    console.log('\n👤 Creating Admin User...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@nexttrip.com' },
      update: {
        name: 'Admin User',
        password: hashedPassword,
        profileId: adminProfile.id,
        isActive: true,
      },
      create: {
        email: 'admin@nexttrip.com',
        name: 'Admin User',
        password: hashedPassword,
        profileId: adminProfile.id,
        isActive: true,
      },
    });
    console.log(`  ✓ Created admin user: ${adminUser.email}`);
    console.log(`    Email: admin@nexttrip.com`);
    console.log(`    Password: admin123`);
    
    console.log('\n✅ Seed completed successfully!');
    
    // Summary
    const profileCount = await prisma.profile.count();
    const permissionCount = await prisma.permission.count();
    const userCount = await prisma.user.count();
    console.log(`\n📊 Summary:`);
    console.log(`  - Permissions: ${permissionCount}`);
    console.log(`  - Profiles: ${profileCount}`);
    console.log(`  - Users: ${userCount}`);
    
  } catch (error) {
    console.error('Error seeding:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
