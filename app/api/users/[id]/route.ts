import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET - ดึงข้อมูล User Account ตาม ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let conn;
  try {
    const { id } = await params;
    conn = await pool.getConnection();

    const users = await conn.query(`
      SELECT u.id, u.email, u.name, u.externalId, u.role, u.profileId, u.isActive, u.createdAt, u.updatedAt,
             p.id as profile_id, p.code as profile_code, p.name as profile_name, p.description as profile_description
      FROM user_accounts u
      LEFT JOIN profiles p ON u.profileId = p.id
      WHERE u.id = ?
    `, [id]);

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = users[0];
    
    // Get profile permissions if profile exists
    let permissions: any[] = [];
    if (user.profile_id) {
      permissions = await conn.query(`
        SELECT p.id, p.code, p.name, p.module, p.description
        FROM permissions p
        JOIN profile_permissions pp ON p.id = pp.permissionId
        WHERE pp.profileId = ?
      `, [user.profile_id]);
    }

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
        description: user.profile_description,
        permissions: permissions.map(p => ({ permission: p })),
      } : null,
    };

    return NextResponse.json(formattedUser);
  } catch (error: any) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user', details: error?.message },
      { status: 500 }
    );
  } finally {
    if (conn) conn.release();
  }
}

// PUT - แก้ไข User Account (สิทธิ์/สถานะ/ชื่อ/อีเมล) — ไม่มีรหัสผ่าน (ตัวตนมาจาก tour-api)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let conn;
  try {
    const { id } = await params;
    const body = await request.json();
    const { email, name, profileId, isActive } = body;

    conn = await pool.getConnection();

    // Check if email exists for other accounts
    const existing = await conn.query('SELECT id FROM user_accounts WHERE email = ? AND id != ?', [email, id]);
    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'อีเมลนี้มีผู้ใช้งานแล้ว' },
        { status: 400 }
      );
    }

    const now = new Date();

    await conn.query(`
      UPDATE user_accounts SET email = ?, name = ?, profileId = ?, isActive = ?, updatedAt = ?
      WHERE id = ?
    `, [email, name, profileId || null, isActive, now, id]);

    // Get updated account
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

    return NextResponse.json(formattedUser);
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user', details: error?.message },
      { status: 500 }
    );
  } finally {
    if (conn) conn.release();
  }
}

// DELETE - ลบ User Account (ยกเลิกการเชื่อมสิทธิ์; ผู้ใช้ล็อกอินใหม่ได้ แต่สิทธิ์จะว่าง)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let conn;
  try {
    const { id } = await params;
    conn = await pool.getConnection();
    
    await conn.query('DELETE FROM user_accounts WHERE id = ?', [id]);

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user', details: error?.message },
      { status: 500 }
    );
  } finally {
    if (conn) conn.release();
  }
}
