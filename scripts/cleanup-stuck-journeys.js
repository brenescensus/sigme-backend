
// scripts/cleanup-stuck-journeys.js


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