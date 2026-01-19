import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import crypto from 'crypto';

// GET - ดึงข้อมูล Profile ตาม ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let conn;
  try {
    const { id } = await params;
    conn = await pool.getConnection();

    const profiles = await conn.query('SELECT * FROM profiles WHERE id = ?', [id]);
    if (profiles.length === 0) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    const permissions = await conn.query(`
      SELECT p.id, p.code, p.name, p.module, p.description
      FROM permissions p
      JOIN profile_permissions pp ON p.id = pp.permissionId
      WHERE pp.profileId = ?
    `, [id]);

    const users = await conn.query(`
      SELECT id, name, email FROM users WHERE profileId = ?
    `, [id]);

    const profile = {
      ...profiles[0],
      permissions: permissions.map((p: any) => ({ permission: p })),
      users,
    };

    return NextResponse.json(profile);
  } catch (error: any) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile', details: error?.message },
      { status: 500 }
    );
  } finally {
    if (conn) conn.release();
  }
}

// PUT - แก้ไข Profile
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let conn;
  try {
    const { id } = await params;
    const body = await request.json();
    const { code, name, description, isActive, permissionIds } = body;

    conn = await pool.getConnection();

    // Check if code exists for other profiles
    const existing = await conn.query('SELECT id FROM profiles WHERE code = ? AND id != ?', [code, id]);
    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'รหัสโปรไฟล์นี้มีอยู่แล้ว' },
        { status: 400 }
      );
    }

    const now = new Date();

    // Update profile
    await conn.query(`
      UPDATE profiles SET code = ?, name = ?, description = ?, isActive = ?, updatedAt = ?
      WHERE id = ?
    `, [code, name, description || null, isActive, now, id]);

    // Delete existing permissions
    await conn.query('DELETE FROM profile_permissions WHERE profileId = ?', [id]);

    // Add new permissions
    if (permissionIds && permissionIds.length > 0) {
      for (const permissionId of permissionIds) {
        const ppId = 'c' + crypto.randomBytes(12).toString('hex');
        await conn.query(`
          INSERT INTO profile_permissions (id, profileId, permissionId, createdAt)
          VALUES (?, ?, ?, ?)
        `, [ppId, id, permissionId, now]);
      }
    }

    // Get updated profile with permissions
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

    return NextResponse.json(profile);
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile', details: error?.message },
      { status: 500 }
    );
  } finally {
    if (conn) conn.release();
  }
}

// DELETE - ลบ Profile
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let conn;
  try {
    const { id } = await params;
    conn = await pool.getConnection();

    // Check if profile has users
    const userCount = await conn.query('SELECT COUNT(*) as count FROM users WHERE profileId = ?', [id]);
    const count = Number(userCount[0].count);

    if (count > 0) {
      return NextResponse.json(
        { error: `ไม่สามารถลบได้ เนื่องจากมีผู้ใช้งาน ${count} คนใช้โปรไฟล์นี้อยู่` },
        { status: 400 }
      );
    }

    // Delete permissions first
    await conn.query('DELETE FROM profile_permissions WHERE profileId = ?', [id]);
    
    // Delete profile
    await conn.query('DELETE FROM profiles WHERE id = ?', [id]);

    return NextResponse.json({ message: 'Profile deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting profile:', error);
    return NextResponse.json(
      { error: 'Failed to delete profile', details: error?.message },
      { status: 500 }
    );
  } finally {
    if (conn) conn.release();
  }
}
