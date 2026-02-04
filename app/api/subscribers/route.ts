// app/api/subscribers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, getAuthenticatedClient, AuthUser } from '@/lib/auth-middleware';

async function handleGet(req: NextRequest, user: AuthUser) {
  const { searchParams } = new URL(req.url);
  const websiteId = searchParams.get('websiteId');

  if (!websiteId) {
    return NextResponse.json(
      { error: 'websiteId parameter is required' },
      { status: 400 }
    );
  }

  const supabase = await getAuthenticatedClient(req);

  const { data: website } = await supabase
    .from('websites')
    .select('id')
    .eq('id', websiteId)
    .eq('user_id', user.id)
    .single();

  if (!website) {
    return NextResponse.json(
      { error: 'Website not found or unauthorized' },
      { status: 404 }
    );
  }

  const { data, count, error } = await supabase
    .from('subscribers')
    .select('*', { count: 'exact' })
    .eq('website_id', websiteId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    subscribers: data ?? [],
    total: count ?? 0,
  });
}

/**
 * THIS is what Next.js wants to see
 */
export async function GET(req: NextRequest) {
  return withAuth(handleGet)(req);
}
