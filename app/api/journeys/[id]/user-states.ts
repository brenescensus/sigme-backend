// pages/api/journeys/[id]/user-states
import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/journeys/[id]/user-states - Get all user states in a journey
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const { status, limit = '100', offset = '0' } = req.query;

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
    const { data: journey, error: journeyError } = await supabase
      .from('journeys')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (journeyError || !journey) {
      return res.status(404).json({ error: 'Journey not found' });
    }

    // Build query
    let query = supabase
      .from('user_journey_states')
      .select(`
        *,
        subscribers:subscriber_id (
          id,
          endpoint,
          browser,
          os,
          country,
          city,
          created_at
        )
      `, { count: 'exact' })
      .eq('journey_id', id)
      .order('entered_at', { ascending: false });

    // Filter by status if provided
    if (status && status !== 'all') {
      query = query.eq('status', status as string);
    }

    // Pagination
    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);
    query = query.range(offsetNum, offsetNum + limitNum - 1);

    const { data: userStates, error, count } = await query;

    if (error) {
      throw error;
    }

    // Get flow definition to show current step details
    const { data: journeyData } = await supabase
      .from('journeys')
      .select('flow_definition')
      .eq('id', id)
      .single();

    // const flowDefinition = journeyData?.flow_definition;
type FlowDefinition = {
  nodes: { id: string; type: string; data?: any }[]
}

const flowDefinition = journeyData?.flow_definition as FlowDefinition | null
    // Enrich user states with current step info
    const enrichedStates = userStates?.map(state => {
      const currentNode = flowDefinition?.nodes?.find(
        (n: any) => n.id === state.current_step_id
      );

      return {
        ...state,
        current_step: currentNode ? {
          id: currentNode.id,
          type: currentNode.type,
          label: getNodeLabel(currentNode),
        } : null,
      };
    });

    return res.status(200).json({
      success: true,
      user_states: enrichedStates || [],
      pagination: {
        total: count || 0,
        limit: limitNum,
        offset: offsetNum,
        has_more: count ? (offsetNum + limitNum) < count : false,
      },
    });

  } catch (error: any) {
    console.error('[Journey User States] Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to fetch user states' 
    });
  }
}

/**
 * Get human-readable label for a node
 */
function getNodeLabel(node: any): string {
  switch (node.type) {
    case 'send_notification':
      return node.data.title || 'Send Notification';
    case 'wait':
      if (node.data.mode === 'until_event') {
        return `Wait for: ${node.data.event?.name || 'event'}`;
      }
      const seconds = node.data.duration || 86400;
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      
      if (days > 0) return `Wait ${days} day${days > 1 ? 's' : ''}`;
      if (hours > 0) return `Wait ${hours} hour${hours > 1 ? 's' : ''}`;
      return `Wait ${minutes} minute${minutes > 1 ? 's' : ''}`;
    case 'condition':
      const conditionLabels: Record<string, string> = {
        clicked_notification: 'Clicked notification?',
        visited_page: 'Visited page?',
        completed_action: 'Completed action?',
        has_tag: 'Has tag?',
      };
      return conditionLabels[node.data.check] || 'Condition';
    case 'ab_split':
      return `A/B Split (${node.data.branches?.length || 2} variants)`;
    default:
      return 'Unknown';
  }
}