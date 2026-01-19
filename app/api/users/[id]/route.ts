import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';

// GET - ดึงข้อมูล User ตาม ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let conn;
  try {
    const { id } = await params;
    conn = await pool.getConnection();

    const users = await conn.query(`
      SELECT u.id, u.email, u.name, u.profileId, u.avatar, u.isActive, u.createdAt, u.updatedAt,
             p.id as profile_id, p.code as profile_code, p.name as profile_name, p.description as profile_description
      FROM users u
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
      profileId: user.profileId,
      avatar: user.avatar,
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

// PUT - แก้ไข User
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let conn;
  try {
    const { id } = await params;
    const body = await request.json();
    const { email, password, name, profileId, isActive } = body;

    conn = await pool.getConnection();

    // Check if email exists for other users
    const existing = await conn.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, id]);
    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'อีเมลนี้มีผู้ใช้งานแล้ว' },
        { status: 400 }
      );
    }

    const now = new Date();

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await conn.query(`
        UPDATE users SET email = ?, password = ?, name = ?, profileId = ?, isActive = ?, updatedAt = ?
        WHERE id = ?
      `, [email, hashedPassword, name, profileId || null, isActive, now, id]);
    } else {
      await conn.query(`
        UPDATE users SET email = ?, name = ?, profileId = ?, isActive = ?, updatedAt = ?
        WHERE id = ?
      `, [email, name, profileId || null, isActive, now, id]);
    }

    // Get updated user
    const users = await conn.query(`
      SELECT u.id, u.email, u.name, u.profileId, u.avatar, u.isActive, u.createdAt, u.updatedAt,
             p.id as profile_id, p.code as profile_code, p.name as profile_name
      FROM users u
      LEFT JOIN profiles p ON u.profileId = p.id
      WHERE u.id = ?
    `, [id]);

    const user = users[0];
    const formattedUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      profileId: user.profileId,
      avatar: user.avatar,
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

// DELETE - ลบ User
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let conn;
  try {
    const { id } = await params;
    conn = await pool.getConnection();
    
    await conn.query('DELETE FROM users WHERE id = ?', [id]);

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
