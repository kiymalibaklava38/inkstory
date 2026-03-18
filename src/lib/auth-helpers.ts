import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export interface AuthUser {
  id: string
  email: string
}

export interface AuthUserWithProfile extends AuthUser {
  profile: {
    username: string
    display_name: string | null
    avatar_url: string | null
    is_admin: boolean
  }
}

/**
 * Verify the current session in an API route.
 * Returns the user or a 401 NextResponse.
 *
 * Always uses supabase.auth.getUser() (not getSession()) because
 * getUser() validates the JWT with the Supabase server — it cannot
 * be forged by a tampered cookie.
 */
export async function requireAuth(): Promise<
  { user: AuthUser; error: null } |
  { user: null; error: NextResponse }
> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      user: null,
      error: NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 }
      ),
    }
  }

  return { user: { id: user.id, email: user.email! }, error: null }
}

/**
 * Verify the current session AND confirm the user is an admin.
 */
export async function requireAdmin(): Promise<
  { user: AuthUserWithProfile; error: null } |
  { user: null; error: NextResponse }
> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }),
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name, avatar_url, is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Forbidden.' }, { status: 403 }),
    }
  }

  return {
    user: {
      id: user.id,
      email: user.email!,
      profile: profile as AuthUserWithProfile['profile'],
    },
    error: null,
  }
}

/**
 * Verify the current user owns a specific resource.
 * Prevents IDOR (Insecure Direct Object Reference) attacks.
 *
 * @param table      - Supabase table name
 * @param resourceId - ID of the resource
 * @param ownerCol   - Column that stores the owner's user ID (default: 'yazar_id')
 */
export async function requireOwnership(
  table: string,
  resourceId: string,
  ownerCol: string = 'yazar_id'
): Promise<
  { owned: true; error: null } |
  { owned: false; error: NextResponse }
> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return {
      owned: false,
      error: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }),
    }
  }

  const { data, error } = await supabase
    .from(table)
    .select('id')
    .eq('id', resourceId)
    .eq(ownerCol, user.id)
    .single()

  if (error || !data) {
    return {
      owned: false,
      error: NextResponse.json(
        { error: 'Resource not found or access denied.' },
        { status: 404 }
      ),
    }
  }

  return { owned: true, error: null }
}
