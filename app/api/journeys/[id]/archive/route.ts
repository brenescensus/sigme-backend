// pages/api/journeys/[id]/archive.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/journeys/[id]/archive - Archive a journey
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
    // Verify journey ownership
    const { data: journey, error: fetchError } = await supabase
      .from('journeys')
      .select('id, status, total_active')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !journey) {
      return res.status(404).json({ error: 'Journey not found' });
    }

    // Check if already archived
    if (journey.status === 'archived') {
      return res.status(400).json({ error: 'Journey is already archived' });
    }

    // Prevent archiving if there are active users
    if (journey.total_active && journey.total_active > 0) {
      return res.status(400).json({
        error: `Cannot archive journey with ${journey.total_active} active users. Please wait for them to complete or exit.`,
      });
    }

    // Archive journey
    const { data: updatedJourney, error: updateError } = await supabase
      .from('journeys')
      .update({
        status: 'archived',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    console.log(`[Journey ${id}] Archived`);

    return res.status(200).json({
      success: true,
      message: 'Journey archived successfully',
      journey: updatedJourney,
    });

  } catch (error: any) {
    console.error('[Journey Archive] Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to archive journey' 
    });
  }
}