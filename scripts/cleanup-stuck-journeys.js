// #!/usr/bin/env node

// /**
//  * Cleanup stuck journey states
//  * Identifies and fixes journeys that have been stuck in processing for too long
//  */

// import { createClient } from '@supabase/supabase-js';

// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL,
//   process.env.SUPABASE_SERVICE_ROLE_KEY
// );

// async function cleanupStuckJourneys() {
//   console.log(' Starting stuck journeys cleanup');
//   console.log(`Current time: ${new Date().toISOString()}`);

//   try {
//     // Find stuck active journeys (active for > 24 hours with no processing)
//     const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
    
//     const { data: stuckJourneys, error } = await supabase
//       .from('user_journey_states')
//       .select('*')
//       .eq('status', 'active')
//       .or(`last_processed_at.is.null,last_processed_at.lt.${oneDayAgo}`)
//       .limit(50);

//     if (error) {
//       throw error;
//     }

//     if (!stuckJourneys || stuckJourneys.length === 0) {
//       console.log(' No stuck journeys found');
//       return;
//     }

//     console.log(` Found ${stuckJourneys.length} potentially stuck journeys`);

//     let fixedCount = 0;
//     let errorCount = 0;

//     for (const journey of stuckJourneys) {
//       try {
//         console.log(`\n Checking journey state ${journey.id}`);
//         console.log(`  Last processed: ${journey.last_processed_at || 'Never'}`);
//         console.log(`  Current step: ${journey.current_step_id}`);

//         // Check if there are any pending scheduled steps
//         const { data: pendingSteps } = await supabase
//           .from('scheduled_journey_steps')
//           .select('*')
//           .eq('user_journey_state_id', journey.id)
//           .eq('status', 'pending')
//           .limit(1);

//         if (pendingSteps && pendingSteps.length > 0) {
//           console.log(`  Has pending scheduled steps, skipping`);
//           continue;
//         }

//         // Log the stuck state
//         await supabase.from('journey_events').insert({
//           journey_id: journey.journey_id,
//           subscriber_id: journey.subscriber_id,
//           user_journey_state_id: journey.id,
//           event_type: 'journey_stuck_detected',
//           step_id: journey.current_step_id,
//           metadata: {
//             last_processed_at: journey.last_processed_at,
//             stuck_duration_hours: journey.last_processed_at 
//               ? Math.floor((Date.now() - new Date(journey.last_processed_at).getTime()) / 3600000)
//               : null,
//           },
//         });

//         // Mark as exited
//         await supabase
//           .from('user_journey_states')
//           .update({
//             status: 'exited',
//             exit_reason: 'stuck_timeout',
//             exited_at: new Date().toISOString(),
//           })
//           .eq('id', journey.id);

//         // Update journey stats
//         const { data: journeyData } = await supabase
//           .from('journeys')
//           .select('total_active')
//           .eq('id', journey.journey_id)
//           .single();

//         if (journeyData && journeyData.total_active > 0) {
//           await supabase
//             .from('journeys')
//             .update({ total_active: journeyData.total_active - 1 })
//             .eq('id', journey.journey_id);
//         }

//         console.log(`   Marked as exited due to stuck timeout`);
//         fixedCount++;

//       } catch (error) {
//         console.error(`   Error processing journey state ${journey.id}:`, error);
//         errorCount++;
//       }
//     }

//     console.log(`\n Cleanup Summary:`);
//     console.log(`   Fixed: ${fixedCount}`);
//     console.log(`   Errors: ${errorCount}`);
//     console.log(`  Total checked: ${stuckJourneys.length}`);

//   } catch (error) {
//     console.error(' Fatal error in cleanup process:', error);
//     process.exit(1);
//   }
// }

// // Run the cleanup
// cleanupStuckJourneys()
//   .then(() => {
//     console.log(' Cleanup completed');
//     process.exit(0);
//   })
//   .catch((error) => {
//     console.error(' Cleanup failed:', error);
//     process.exit(1);
//   });










// scripts/cleanup-stuck-journeys.js
/**
 * Cleanup Stuck Journeys
 * 
 * This script finds and cleans up journey states that are stuck in
 * waiting or active status for too long, indicating a processing error.
 * 
 * Run this daily to maintain data quality.
 * 
 * Usage: node scripts/cleanup-stuck-journeys.js
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const STUCK_THRESHOLD_DAYS = 30; // Days of inactivity before considering stuck

async function cleanupStuckJourneys() {
  console.log(' Starting stuck journey cleanup...');
  
  try {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - STUCK_THRESHOLD_DAYS);

    // Find stuck active states
    const { data: stuckActive, error: activeError } = await supabase
      .from('user_journey_states')
      .select('*')
      .eq('status', 'active')
      .lt('last_processed_at', thresholdDate.toISOString())
      .order('last_processed_at', { ascending: true });

    if (activeError) {
      console.error(' Error fetching stuck active states:', activeError);
    }

    // Find stuck waiting states (past their timeout)
    const { data: stuckWaiting, error: waitingError } = await supabase
      .from('user_journey_states')
      .select('*')
      .eq('status', 'waiting')
      .lt('next_execution_at', new Date().toISOString())
      .lt('last_processed_at', thresholdDate.toISOString())
      .order('last_processed_at', { ascending: true });

    if (waitingError) {
      console.error(' Error fetching stuck waiting states:', waitingError);
    }

    const stuckStates = [...(stuckActive || []), ...(stuckWaiting || [])];

    if (stuckStates.length === 0) {
      console.log(' No stuck journeys found');
      return;
    }

    console.log(` Found ${stuckStates.length} stuck journey states`);

    let cleaned = 0;

    for (const state of stuckStates) {
      try {
        console.log(` Cleaning up state ${state.id} (last processed: ${state.last_processed_at})`);

        // Exit the journey with reason
        const { error: exitError } = await supabase.rpc('exit_journey', {
          p_state_id: state.id,
          p_exit_reason: `stuck_cleanup:inactive_${STUCK_THRESHOLD_DAYS}d`,
        });

        if (exitError) {
          console.error(` Error exiting journey ${state.id}:`, exitError);
          continue;
        }

        cleaned++;
        console.log(` State ${state.id} cleaned up`);

      } catch (error) {
        console.error(` Error processing state ${state.id}:`, error.message);
      }
    }

    console.log(`\n Cleanup Summary:`);
    console.log(`   Cleaned: ${cleaned}`);
    console.log(`   Failed: ${stuckStates.length - cleaned}`);

    // Cleanup old scheduled steps
    console.log('\n  Cleaning up old scheduled steps...');
    
    const { data: cleanupResult, error: cleanupError } = await supabase
      .rpc('cleanup_old_scheduled_steps');

    if (cleanupError) {
      console.error(' Error cleaning scheduled steps:', cleanupError);
    } else {
      console.log(` Deleted ${cleanupResult || 0} old scheduled steps`);
    }

  } catch (error) {
    console.error(' Fatal error in cleanup:', error);
    process.exit(1);
  }
}

// Run cleanup
cleanupStuckJourneys()
  .then(() => {
    console.log(' Cleanup completed');
    process.exit(0);
  })
  .catch(error => {
    console.error(' Cleanup failed:', error);
    process.exit(1);
  });