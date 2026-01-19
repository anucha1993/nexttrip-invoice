import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db-direct';
import { setSession } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user with raw query
    const users = await query(
      `SELECT u.*, p.code as profileCode, p.name as profileName
       FROM users u
       LEFT JOIN profiles p ON u.profileId = p.id
       WHERE u.email = ?
       LIMIT 1`,
      [email]
    );

    if (!users || users.length === 0) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const user = users[0];

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account is not active' },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Get permissions
    const permissions = await query(
      `SELECT perm.code
       FROM profile_permissions pp
       JOIN permissions perm ON pp.permissionId = perm.id
       WHERE pp.profileId = ?`,
      [user.profileId]
    );

    const permissionCodes = permissions.map((p: any) => p.code);

    // Create session payload
    const sessionData = {
      userId: user.id,
      email: user.email,
      name: user.name,
      profileId: user.profileId,
      profileCode: user.profileCode || null,
      permissions: permissionCodes,
    };

    // Set session cookie
    await setSession(sessionData);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        profileCode: user.profileCode,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
