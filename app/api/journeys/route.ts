// backend/app/api/journeys/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { journeyProcessor } from '@/lib/journeys/processor';
import { withAuth, AuthUser } from '@/lib/auth-middleware'; // 

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// GET /api/journeys - List journeys
export const GET = withAuth(async (request: NextRequest, user: AuthUser) => {
  try {
    const websiteId = request.nextUrl.searchParams.get('website_id');

    let query = supabase
      .from('journeys')
      .select('*')
      .eq('user_id', user.id) // Use user.id from withAuth
      .order('created_at', { ascending: false });

    if (websiteId) {
      query = query.eq('website_id', websiteId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Trigger opportunistic processing (already handled by withAuth now)
    // journeyProcessor.processDueSteps().catch(console.error);

    return NextResponse.json({
      success: true,
      journeys: data || [],
    });
  } catch (error: any) {
    console.error('Error listing journeys:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
});

// POST /api/journeys - Create journey
export const POST = withAuth(async (request: NextRequest, user: AuthUser) => {
  try {
    const body = await request.json();
    const {
      website_id,
      name,
      description,
      entry_trigger,
      flow_definition,
      settings,
    } = body;

    // Validate required fields
    if (!website_id || !name || !entry_trigger || !flow_definition) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify website belongs to user
    const { data: website } = await supabase
      .from('websites')
      .select('id')
      .eq('id', website_id)
      .eq('user_id', user.id) // Use user.id from withAuth
      .single();

    if (!website) {
      return NextResponse.json(
        { error: 'Website not found' },
        { status: 404 }
      );
    }

    // Create journey
    const { data: journey, error } = await supabase
      .from('journeys')
      .insert({
        user_id: user.id, // Use user.id from withAuth
        website_id,
        name,
        description,
        entry_trigger,
        flow_definition,
        settings: settings || {},
        status: 'draft',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      journey,
    });
  } catch (error: any) {
    console.error('Error creating journey:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
});