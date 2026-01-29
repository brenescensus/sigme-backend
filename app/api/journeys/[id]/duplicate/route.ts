// pages/api/journeys/[id]/duplicate.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/journeys/[id]/duplicate - Duplicate a journey
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Journey ID is required' });
  }

  // Extract user ID from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    // Fetch the journey to duplicate
    const { data: journey, error: fetchError } = await supabase
      .from('journeys')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !journey) {
      return res.status(404).json({ error: 'Journey not found' });
    }

    // Create duplicate with modified name
    const duplicateName = `${journey.name} (Copy)`;
    
    const { data: duplicateJourney, error: createError } = await supabase
      .from('journeys')
      .insert({
        website_id: journey.website_id,
        user_id: user.id,
        name: duplicateName,
        description: journey.description,
        entry_trigger: journey.entry_trigger,
        flow_definition: journey.flow_definition,
        exit_rules: journey.exit_rules,
        re_entry_settings: journey.re_entry_settings,
        settings: journey.settings,
        status: 'draft', // Always create duplicates as draft
        total_entered: 0,
        total_active: 0,
        total_completed: 0,
      })
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    console.log(`[Journey ${id}] Duplicated to ${duplicateJourney.id}`);

    return res.status(201).json({
      success: true,
      message: 'Journey duplicated successfully',
      journey: duplicateJourney,
    });

  } catch (error: any) {
    console.error('[Journey Duplicate] Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to duplicate journey' 
    });
  }
}