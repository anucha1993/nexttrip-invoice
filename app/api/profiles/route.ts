import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth, requirePermission } from '@/lib/api-auth';

// GET - รายการ Profiles ทั้งหมด
export async function GET() {
  let conn;
  try {
    // ✅ Check authentication and permission
    const session = await requireAuth();
    requirePermission(session, 'VIEW_PROFILES');
    
    conn = await pool.getConnection();
    
    // Get profiles
    const profiles = await conn.query(`
      SELECT id, code, name, description, isActive, createdAt, updatedAt 
      FROM profiles
      ORDER BY createdAt DESC
    `);
    
    // Get permissions for each profile
    for (const profile of profiles) {
      const permissions = await conn.query(`
        SELECT p.id, p.code, p.name, p.module, p.description
        FROM permissions p
        JOIN profile_permissions pp ON p.id = pp.permissionId
        WHERE pp.profileId = ?
      `, [profile.id]);
      
      profile.permissions = permissions.map((p: any) => ({ permission: p }));
      
      // Get user count
      const userCount = await conn.query(`
        SELECT COUNT(*) as count FROM users WHERE profileId = ?
      `, [profile.id]);
      profile._count = { users: Number(userCount[0].count) };
    }
    
    return NextResponse.json(profiles);
  } catch (error: any) {
    console.error('Error fetching profiles:', error?.message || error);
    return NextResponse.json(
      { error: 'Failed to fetch profiles', details: error?.message },
      { status: 500 }
    );
  } finally {
    if (conn) conn.release();
  }
}

// POST - สร้าง Profile ใหม่
export async function POST(request: NextRequest) {
  let conn;
  try {
    // ✅ Check authentication and permission
    const session = await requireAuth();
    requirePermission(session, 'CREATE_PROFILE');
    const body = await request.json();
    const { code, name, description, isActive, permissionIds } = body;

    conn = await pool.getConnection();

    // Check if code exists
    const existing = await conn.query('SELECT id FROM profiles WHERE code = ?', [code]);
    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'รหัสโปรไฟล์นี้มีอยู่แล้ว' },
        { status: 400 }
      );
    }

    const id = 'c' + require('crypto').randomBytes(12).toString('hex');
    const now = new Date();

    await conn.query(`
      INSERT INTO profiles (id, code, name, description, isActive, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id, code, name, description || null, isActive ?? true, now, now]);

    // Add permissions
    if (permissionIds && permissionIds.length > 0) {
      for (const permissionId of permissionIds) {
        const ppId = 'c' + require('crypto').randomBytes(12).toString('hex');
        await conn.query(`
          INSERT INTO profile_permissions (id, profileId, permissionId, createdAt)
          VALUES (?, ?, ?, ?)
        `, [ppId, id, permissionId, now]);
      }
    }

    // Get created profile with permissions
    const profiles = await conn.query('SELECT * FROM profiles WHERE id = ?', [id]);
    const permissions = await conn.query(`
      SELECT p.id, p.code, p.name, p.module, p.description
      FROM permissions p
      JOIN profile_permissions pp ON p.id = pp.permissionId
      WHERE pp.profileId = ?
    `, [id]);

    const profile = {
      ...profiles[0],
      permissions: permissions.map((p: any) => ({ permission: p })),
    };

    return NextResponse.json(profile, { status: 201 });
  } catch (error: any) {
    console.error('Error creating profile:', error);
    return NextResponse.json(
      { error: 'Failed to create profile', details: error?.message },
      { status: 500 }
    );
  } finally {
    if (conn) conn.release();
  }
}
