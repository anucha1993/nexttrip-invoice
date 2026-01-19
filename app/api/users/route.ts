import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

function generateCuid() {
  return 'c' + randomBytes(12).toString('hex');
}

// GET - รายการ Users ทั้งหมด
export async function GET() {
  let conn;
  try {
    conn = await pool.getConnection();
    
    const users = await conn.query(`
      SELECT u.id, u.email, u.name, u.profileId, u.avatar, u.isActive, u.createdAt, u.updatedAt,
             p.id as profile_id, p.code as profile_code, p.name as profile_name
      FROM users u
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
      profileId: u.profileId,
      avatar: u.avatar,
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

// POST - สร้าง User ใหม่
export async function POST(request: NextRequest) {
  let conn;
  try {
    const body = await request.json();
    const { email, password, name, profileId, isActive } = body;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const id = generateCuid();
    const now = new Date();

    conn = await pool.getConnection();

    // Check if email exists
    const existing = await conn.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'อีเมลนี้มีผู้ใช้งานแล้ว' },
        { status: 400 }
      );
    }

    await conn.query(`
      INSERT INTO users (id, email, password, name, profileId, isActive, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, email, hashedPassword, name, profileId || null, isActive ?? true, now, now]);

    // Get created user
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
