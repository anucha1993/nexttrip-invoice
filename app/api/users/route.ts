import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { randomBytes } from 'crypto';
import { requireAuth, requirePermission } from '@/lib/api-auth';

function generateCuid() {
  return 'c' + randomBytes(12).toString('hex');
}

// GET - รายการ User Accounts ทั้งหมด
// หมายเหตุ: ตัวตน (email/name) มาจาก tour-api; ที่นี่จัดการเฉพาะสิทธิ์ (profile) + สถานะ
export async function GET() {
  let conn;
  try {
    // ✅ Check authentication and permission
    const session = await requireAuth();
    requirePermission(session, 'user.view');
    
    conn = await pool.getConnection();
    
    const users = await conn.query(`
      SELECT u.id, u.email, u.name, u.externalId, u.role, u.profileId, u.isActive, u.createdAt, u.updatedAt,
             p.id as profile_id, p.code as profile_code, p.name as profile_name
      FROM user_accounts u
      LEFT JOIN profiles p ON u.profileId = p.id
      ORDER BY u.createdAt DESC
    `);

    // Get permission counts for each profile
    const profileIds = [...new Set(users.map((u: any) => u.profile_id).filter(Boolean))];
    const permissionCounts: Record<string, number> = {};
    
    if (profileIds.length > 0) {
      const counts = await conn.query(`
        SELECT profileId, COUNT(*) as count 
        FROM profile_permissions 
        WHERE profileId IN (?)
        GROUP BY profileId
      `, [profileIds]);
      
      for (const row of counts) {
        permissionCounts[row.profileId] = Number(row.count);
      }
    }

    // Format users with profile
    const formattedUsers = users.map((u: any) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      externalId: u.externalId,
      role: u.role,
      profileId: u.profileId,
      isActive: u.isActive,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      profile: u.profile_id ? {
        id: u.profile_id,
        code: u.profile_code,
        name: u.profile_name,
        permissions: Array(permissionCounts[u.profile_id] || 0).fill({}),
      } : null,
    }));

    return NextResponse.json(formattedUsers);
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users', details: error?.message },
      { status: 500 }
    );
  } finally {
    if (conn) conn.release();
  }
}

// POST - ผูกบัญชี/กำหนดสิทธิ์ล่วงหน้า (pre-provision)
// ไม่มีรหัสผ่าน: ตัวตนยืนยันผ่าน tour-api ตอน login; แถวนี้จะถูกเชื่อมด้วย email เมื่อผู้ใช้ล็อกอินครั้งแรก
export async function POST(request: NextRequest) {
  let conn;
  try {
    const body = await request.json();
    const { email, name, profileId, isActive } = body;

    if (!email || !name) {
      return NextResponse.json(
        { error: 'กรุณากรอกอีเมลและชื่อ' },
        { status: 400 }
      );
    }

    const id = generateCuid();
    const now = new Date();

    conn = await pool.getConnection();

    // Check if email exists
    const existing = await conn.query('SELECT id FROM user_accounts WHERE email = ?', [email]);
    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'อีเมลนี้มีผู้ใช้งานแล้ว' },
        { status: 400 }
      );
    }

    await conn.query(`
      INSERT INTO user_accounts (id, externalId, email, name, role, profileId, isActive, createdAt, updatedAt)
      VALUES (?, NULL, ?, ?, NULL, ?, ?, ?, ?)
    `, [id, email, name, profileId || null, isActive ?? true, now, now]);

    // Get created account
    const users = await conn.query(`
      SELECT u.id, u.email, u.name, u.externalId, u.role, u.profileId, u.isActive, u.createdAt, u.updatedAt,
             p.id as profile_id, p.code as profile_code, p.name as profile_name
      FROM user_accounts u
      LEFT JOIN profiles p ON u.profileId = p.id
      WHERE u.id = ?
    `, [id]);

    const user = users[0];
    const formattedUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      externalId: user.externalId,
      role: user.role,
      profileId: user.profileId,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      profile: user.profile_id ? {
        id: user.profile_id,
        code: user.profile_code,
        name: user.profile_name,
      } : null,
    };

    return NextResponse.json(formattedUser, { status: 201 });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user', details: error?.message },
      { status: 500 }
    );
  } finally {
    if (conn) conn.release();
  }
}
