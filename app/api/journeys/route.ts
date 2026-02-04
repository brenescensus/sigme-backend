
// app/api/journeys/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);


export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const websiteId = searchParams.get('website_id');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Build query - FIXED: Specify exact foreign key relationship
    let query = supabase
      .from('journeys')
      .select(`
        *,
        website:websites!journeys_website_id_fkey(id, name, domain)
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (websiteId) {
      query = query.eq('website_id', websiteId);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: journeys, error, count } = await query;

    if (error) {
      console.error('[API] Error fetching journeys:', error);
      return NextResponse.json({ error: 'Failed to fetch journeys' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      journeys: journeys || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    });

  } catch (error: any) {
    console.error('[API] Error in GET /api/journeys:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/journeys
 * Create a new journey
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      website_id,
      name,
      description,
      entry_trigger,
      flow_definition,
      exit_rules,
      re_entry_settings,
      settings,
      goal,
    } = body;

    // Validation
    if (!website_id || !name || !entry_trigger || !flow_definition) {
      return NextResponse.json({ 
        error: 'Missing required fields: website_id, name, entry_trigger, flow_definition' 
      }, { status: 400 });
    }

    // Verify website ownership
    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('id')
      .eq('id', website_id)
      .eq('user_id', user.id)
      .single();

    if (websiteError || !website) {
      return NextResponse.json({ error: 'Website not found or access denied' }, { status: 404 });
    }

    // Create journey
    const { data: journey, error: createError } = await supabase
      .from('journeys')
      .insert({
        user_id: user.id,
        website_id,
        name,
        description: description || null,
        status: 'draft',
        entry_trigger,
        flow_definition,
        exit_rules: exit_rules || null,
        re_entry_settings: re_entry_settings || {
          allow_re_entry: false,
          cooldown_days: 0,
          max_entries: 1,
        },
        settings: settings ? {
          ...settings,
          goal: goal || null,
        } : { goal: goal || null },
        total_entered: 0,
        total_active: 0,
        total_completed: 0,
      })
      .select()
      .single();

    if (createError) {
      console.error('[API] Error creating journey:', createError);
      return NextResponse.json({ error: 'Failed to create journey' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      journey,
      message: 'Journey created successfully',
    }, { status: 201 });

  } catch (error: any) {
    console.error('[API] Error in POST /api/journeys:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}