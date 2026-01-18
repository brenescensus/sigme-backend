// app/api/websites/route.ts
// Website CRUD operations

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - List all websites for authenticated user
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    //  Get user from cookies
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('[Websites GET] Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Websites GET] User authenticated:', user.id);

    const { data, error } = await supabase
      .from('websites')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Websites GET] Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[Websites GET] Success, count:', data?.length || 0);

    return NextResponse.json({
      success: true,
      websites: data || [],
    });
  } catch (error: any) {
    console.error('[Websites GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new website
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    //  Get user from cookies
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('[Websites POST] Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Websites POST] User authenticated:', user.id);

    const body = await req.json();
    const { name, url, description } = body;

    console.log('[Websites POST] Request body:', { name, url, description });

    if (!name || !url) {
      return NextResponse.json(
        { error: 'Name and URL are required' },
        { status: 400 }
      );
    }

    // Validate URL format
    let domain: string;
    try {
      const urlObj = new URL(url);
      domain = urlObj.hostname;
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Use the VAPID keys from environment
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 
      "BPB0HWKOKaG0V6xpWcnoaZvnJZCRl1OYfyUXFS7Do7OzJpW6WPoJQyd__u3KVDBDJlINatfLcmNwdF6kS5niPWI";
    
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || 'STORED_IN_SECRETS';

    const { data, error } = await supabase
      .from('websites')
      .insert({
        user_id: user.id,
        name,
        url,
        domain,
        description: description || null,
        vapid_public_key: vapidPublicKey,
        vapid_private_key: vapidPrivateKey,
        notifications_sent: 0,
        active_subscribers: 0,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('[Websites POST] Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[Websites POST] Success:', data.id);

    return NextResponse.json({
      success: true,
      website: data,
    }, { status: 201 });
  } catch (error: any) {
    console.error('[Websites POST] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}