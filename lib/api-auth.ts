import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

/**
 * Require authentication for API routes
 * @throws Response with 401 if not authenticated
 */
export async function requireAuth(request?: NextRequest) {
  const session = await getSession();
  
  if (!session) {
    throw new Response(
      JSON.stringify({ error: 'Unauthorized', message: 'Authentication required' }), 
      { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  return session;
}

/**
 * Check if user has specific permission
 */
export function hasPermission(session: any, permission: string): boolean {
  if (!session?.permissions) return false;
  return session.permissions.includes(permission);
}

/**
 * Require specific permission
 * @throws Response with 403 if no permission
 */
export function requirePermission(session: any, permission: string) {
  if (!hasPermission(session, permission)) {
    throw new Response(
      JSON.stringify({ 
        error: 'Forbidden', 
        message: `Permission '${permission}' required` 
      }), 
      { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Wrapper to handle auth errors
 */
export async function withAuth<T>(
  handler: (session: any) => Promise<T>
): Promise<T | Response> {
  try {
    const session = await requireAuth();
    return await handler(session);
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    throw error;
  }
}
