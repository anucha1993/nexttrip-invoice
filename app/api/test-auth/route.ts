import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';

export async function GET() {
  try {
    // Test 1: Check database connection
    const userCount = await prisma.user.count();
    
    // Test 2: Find admin user
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@nexttrip.com' },
      include: {
        profile: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    // Test 3: Test password
    let passwordMatch = false;
    if (adminUser) {
      passwordMatch = await bcrypt.compare('admin123', adminUser.password);
    }

    return NextResponse.json({
      success: true,
      userCount,
      adminExists: !!adminUser,
      adminUser: adminUser ? {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        isActive: adminUser.isActive,
        profileId: adminUser.profileId,
        profileCode: adminUser.profile?.code,
        permissionCount: adminUser.profile?.permissions.length || 0,
      } : null,
      passwordMatch,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
