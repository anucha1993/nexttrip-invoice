import { NextResponse } from 'next/server';
import { query } from '@/lib/db-direct';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';

export async function GET() {
  try {
    console.log('Testing database connection...');
    
    // Test 1: Check database connection
    const users = await query('SELECT COUNT(*) as count FROM users');
    const userCount = Number(users[0]?.count || 0);
    console.log('User count:', userCount);
    
    // Test 2: Find admin user
    const adminUsers = await query(
      `SELECT u.*, p.code as profileCode, p.name as profileName
       FROM users u
       LEFT JOIN profiles p ON u.profileId = p.id
       WHERE u.email = ?
       LIMIT 1`,
      ['admin@nexttrip.com']
    );
    
    const adminUser = adminUsers[0];
    console.log('Admin user found:', !!adminUser);
    
    // Test 3: Check password
    let passwordMatch = false;
    if (adminUser) {
      passwordMatch = await bcrypt.compare('admin123', adminUser.password);
      console.log('Password match:', passwordMatch);
    }
    
    // Test 4: Get permissions
    let permissions = [];
    if (adminUser && adminUser.profileId) {
      permissions = await query(
        `SELECT perm.code
         FROM profile_permissions pp
         JOIN permissions perm ON pp.permissionId = perm.id
         WHERE pp.profileId = ?`,
        [adminUser.profileId]
      );
    }
    
    return NextResponse.json({
      success: true,
      tests: {
        userCount,
        adminExists: !!adminUser,
        adminEmail: adminUser?.email,
        adminActive: adminUser?.isActive === 1,
        passwordMatch,
        permissionCount: permissions.length,
      }
    });
  } catch (error: any) {
    console.error('Test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
