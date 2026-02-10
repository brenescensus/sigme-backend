// scripts/debug-journey-flow.ts
// Run this to check your journey structure
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function debugJourneyFlow(journeyName: string) {
  console.log(`\nDebugging Journey: "${journeyName}"\n`);

  // Get journey
  const { data: journey } = await supabase
    .from('journeys')
    .select('*')
    .eq('name', journeyName)
    .single();

  if (!journey) {
    console.error('❌ Journey not found!');
    return;
  }

  const flow = journey.flow_definition as any;
  
  console.log('📋 NODES:');
  console.log('─────────────────────────────────────────');
  flow.nodes.forEach((node: any, idx: number) => {
    console.log(`${idx + 1}. ${node.id}`);
    console.log(`   Type: ${node.type}`);
    if (node.type === 'send_notification') {
      console.log(`   Title: "${node.data.title}"`);
    }
    if (node.type === 'wait') {
      console.log(`   Duration: ${node.data.duration}s (${node.data.duration / 60} min)`);
    }
    console.log('');
  });

  console.log('🔗 EDGES (Connections):');
  console.log('─────────────────────────────────────────');
  if (!flow.edges || flow.edges.length === 0) {
    console.error('❌ NO EDGES FOUND! This is the problem!');
    console.log('\nYour nodes are not connected. You need to:');
    console.log('1. Open the journey in the builder');
    console.log('2. Connect each node to the next one');
    console.log('3. Save the journey');
  } else {
    flow.edges.forEach((edge: any, idx: number) => {
      const fromNode = flow.nodes.find((n: any) => n.id === edge.from);
      const toNode = flow.nodes.find((n: any) => n.id === edge.to);
      
      console.log(`${idx + 1}. ${edge.from} → ${edge.to}`);
      console.log(`   ${fromNode?.type || 'UNKNOWN'} → ${toNode?.type || 'UNKNOWN'}`);
      if (edge.type) {
        console.log(`   Type: ${edge.type}`);
      }
      console.log('');
    });
  }

  // Validate flow
  console.log('✅ VALIDATION:');
  console.log('─────────────────────────────────────────');
  
  const issues: string[] = [];
  
  // Check if all nodes (except exit) have outgoing edges
  flow.nodes.forEach((node: any) => {
    if (node.type === 'exit') return;
    
    const hasOutgoing = flow.edges.some((e: any) => e.from === node.id);
    if (!hasOutgoing) {
      issues.push(`❌ Node "${node.id}" (${node.type}) has NO outgoing edge`);
    }
  });

  // Check if all edges point to existing nodes
  flow.edges.forEach((edge: any) => {
    const fromExists = flow.nodes.some((n: any) => n.id === edge.from);
    const toExists = flow.nodes.some((n: any) => n.id === edge.to);
    
    if (!fromExists) {
      issues.push(`❌ Edge references non-existent "from" node: ${edge.from}`);
    }
    if (!toExists) {
      issues.push(`❌ Edge references non-existent "to" node: ${edge.to}`);
    }
  });

  if (issues.length === 0) {
    console.log('✅ Flow structure looks good!');
  } else {
    console.log('❌ ISSUES FOUND:\n');
    issues.forEach(issue => console.log(issue));
  }

  // Check current states
  console.log('\n👥 CURRENT STATES:');
  console.log('─────────────────────────────────────────');
  const { data: states } = await supabase
    .from('user_journey_states')
    .select('*')
    .eq('journey_id', journey.id)
    .order('created_at', { ascending: false })
    .limit(5);

  if (!states || states.length === 0) {
    console.log('No active states');
  } else {
    states.forEach((state: any) => {
      console.log(`Subscriber: ${state.subscriber_id.substring(0, 8)}...`);
      console.log(`  Status: ${state.status}`);
      console.log(`  Current Step: ${state.current_step_id}`);
      console.log(`  Entered: ${new Date(state.entered_at).toLocaleString()}`);
      if (state.completed_at) {
        console.log(`  Completed: ${new Date(state.completed_at).toLocaleString()}`);
      }
      console.log('');
    });
  }
}

// Run it
debugJourneyFlow('testing wait').then(() => process.exit(0));