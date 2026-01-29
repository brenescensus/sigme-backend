// // //backend\scripts\process-scheduled-steps.js

// // /**
// //  * Process all scheduled journey steps that are due for execution
// //  * Run by GitHub Actions cron job every 5 minutes
// //  */

// // import { createClient } from '@supabase/supabase-js';
// // import { processJourneyStep } from '../lib/journey-processor.js';

// // const supabase = createClient(
// //   process.env.NEXT_PUBLIC_SUPABASE_URL,
// //   process.env.SUPABASE_SERVICE_ROLE_KEY
// // );

// // async function processScheduledSteps() {
// //   console.log('🔄 Starting scheduled journey steps processor');
// //   console.log(`⏰ Current time: ${new Date().toISOString()}`);

// //   try {
// //     // Get all pending scheduled steps that are due
// //     const { data: scheduledSteps, error } = await supabase
// //       .from('scheduled_journey_steps')
// //       .select('*')
// //       .eq('status', 'pending')
// //       .lte('execute_at', new Date().toISOString())
// //       .order('execute_at', { ascending: true })
// //       .limit(100); // Process max 100 steps per run

// //     if (error) {
// //       throw error;
// //     }

// //     if (!scheduledSteps || scheduledSteps.length === 0) {
// //       console.log('✅ No scheduled steps due for execution');
// //       return;
// //     }

// //     console.log(`📋 Found ${scheduledSteps.length} scheduled steps to process`);

// //     let successCount = 0;
// //     let errorCount = 0;

// //     // Process each scheduled step
// //     for (const step of scheduledSteps) {
// //       console.log(`\n🔄 Processing scheduled step ${step.id}`);
// //       console.log(`  Journey State: ${step.user_journey_state_id}`);
// //       console.log(`  Scheduled for: ${step.execute_at}`);

// //       try {
// //         // Mark as processing
// //         await supabase
// //           .from('scheduled_journey_steps')
// //           .update({ 
// //             status: 'processing',
// //             started_at: new Date().toISOString(),
// //           })
// //           .eq('id', step.id);

// //         // Get the journey state
// //         const { data: journeyState } = await supabase
// //           .from('user_journey_states')
// //           .select('*')
// //           .eq('id', step.user_journey_state_id)
// //           .single();

// //         if (!journeyState) {
// //           console.warn(`⚠️  Journey state ${step.user_journey_state_id} not found`);
// //           await supabase
// //             .from('scheduled_journey_steps')
// //             .update({ 
// //               status: 'failed',
// //               error: 'Journey state not found',
// //               completed_at: new Date().toISOString(),
// //             })
// //             .eq('id', step.id);
// //           errorCount++;
// //           continue;
// //         }

// //         // Check if journey is still waiting
// //         if (journeyState.status !== 'waiting') {
// //           console.log(`ℹ️  Journey state ${step.user_journey_state_id} is no longer waiting (${journeyState.status})`);
// //           await supabase
// //             .from('scheduled_journey_steps')
// //             .update({ 
// //               status: 'cancelled',
// //               error: 'Journey no longer waiting',
// //               completed_at: new Date().toISOString(),
// //             })
// //             .eq('id', step.id);
// //           continue;
// //         }

// //         // Check if this is a timeout
// //         const isTimeout = step.payload?.timeout === true;

// //         if (isTimeout) {
// //           console.log('⏱️  Wait timeout reached');
          
// //           // Log timeout event
// //           await supabase.from('journey_events').insert({
// //             journey_id: journeyState.journey_id,
// //             subscriber_id: journeyState.subscriber_id,
// //             user_journey_state_id: journeyState.id,
// //             event_type: 'wait_timeout',
// //             step_id: step.step_id,
// //             metadata: {
// //               wait_duration: step.payload?.duration_seconds,
// //               event_name: journeyState.context?.waiting_for_event,
// //             },
// //           });
// //         }

// //         // Update journey state to active and move to next step
// //         const nextNodeId = step.payload?.next_node_id;
        
// //         if (nextNodeId) {
// //           await supabase
// //             .from('user_journey_states')
// //             .update({
// //               status: 'active',
// //               current_step_id: nextNodeId,
// //               next_execution_at: null,
// //             })
// //             .eq('id', step.user_journey_state_id);
// //         } else {
// //           // No next node, reactivate current node to continue processing
// //           await supabase
// //             .from('user_journey_states')
// //             .update({
// //               status: 'active',
// //               next_execution_at: null,
// //             })
// //             .eq('id', step.user_journey_state_id);
// //         }

// //         // Process the journey step
// //         await processJourneyStep(step.user_journey_state_id);

// //         // Mark scheduled step as completed
// //         await supabase
// //           .from('scheduled_journey_steps')
// //           .update({ 
// //             status: 'completed',
// //             completed_at: new Date().toISOString(),
// //           })
// //           .eq('id', step.id);

// //         console.log(`✅ Scheduled step ${step.id} processed successfully`);
// //         successCount++;

// //       } catch (error) {
// //         console.error(`❌ Error processing scheduled step ${step.id}:`, error);
        
// //         await supabase
// //           .from('scheduled_journey_steps')
// //           .update({ 
// //             status: 'failed',
// //             error: error.message,
// //             completed_at: new Date().toISOString(),
// //           })
// //           .eq('id', step.id);

// //         errorCount++;
// //       }
// //     }

// //     console.log(`\n📊 Processing Summary:`);
// //     console.log(`  ✅ Successful: ${successCount}`);
// //     console.log(`  ❌ Failed: ${errorCount}`);
// //     console.log(`  📋 Total: ${scheduledSteps.length}`);

// //     // Write summary to GitHub Actions output
// //     if (process.env.GITHUB_OUTPUT) {
// //       const fs = require('fs');
// //       fs.appendFileSync(
// //         process.env.GITHUB_OUTPUT,
// //         `processed=${scheduledSteps.length}\n`
// //       );
// //       fs.appendFileSync(
// //         process.env.GITHUB_OUTPUT,
// //         `successful=${successCount}\n`
// //       );
// //       fs.appendFileSync(
// //         process.env.GITHUB_OUTPUT,
// //         `failed=${errorCount}\n`
// //       );
// //     }

// //   } catch (error) {
// //     console.error('❌ Fatal error in scheduled steps processor:', error);
// //     process.exit(1);
// //   }
// // }

// // // Run the processor
// // processScheduledSteps()
// //   .then(() => {
// //     console.log('✅ Scheduled steps processor completed');
// //     process.exit(0);
// //   })
// //   .catch((error) => {
// //     console.error('❌ Scheduled steps processor failed:', error);
// //     process.exit(1);
// //   });


// // scripts/process-scheduled-steps.js
// /**
//  * Process Scheduled Journey Steps
//  * 
//  * This script finds and processes all pending scheduled journey steps
//  * that are due for execution. Run this via cron or GitHub Actions.
//  * 
//  * Usage: node scripts/process-scheduled-steps.js
//  */

// require('dotenv').config();
// const { createClient } = require('@supabase/supabase-js');

// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL,
//   process.env.SUPABASE_SERVICE_ROLE_KEY
// );

// const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// async function processScheduledSteps() {
//   console.log('🔄 Starting scheduled steps processor...');
  
//   try {
//     // Find all pending steps that are due
//     const { data: dueSteps, error: fetchError } = await supabase
//       .from('scheduled_journey_steps')
//       .select('*')
//       .eq('status', 'pending')
//       .lte('execute_at', new Date().toISOString())
//       .order('execute_at', { ascending: true })
//       .limit(100);

//     if (fetchError) {
//       console.error('❌ Error fetching scheduled steps:', fetchError);
//       return;
//     }

//     if (!dueSteps || dueSteps.length === 0) {
//       console.log('✅ No pending steps to process');
//       return;
//     }

//     console.log(`📋 Found ${dueSteps.length} steps to process`);

//     let processed = 0;
//     let failed = 0;

//     for (const step of dueSteps) {
//       try {
//         console.log(`⚙️  Processing step ${step.id} (${step.step_id})`);

//         // Mark as processing
//         await supabase
//           .from('scheduled_journey_steps')
//           .update({ 
//             status: 'processing',
//             started_at: new Date().toISOString(),
//           })
//           .eq('id', step.id);

//         // Process the step
//         const response = await fetch(`${APP_URL}/api/webhooks/process-journey-step`, {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//           },
//           body: JSON.stringify({
//             state_id: step.user_journey_state_id,
//             step_id: step.step_id,
//             event_triggered: false,
//           }),
//         });

//         if (!response.ok) {
//           throw new Error(`HTTP ${response.status}: ${await response.text()}`);
//         }

//         const result = await response.json();

//         // Mark as completed
//         await supabase
//           .from('scheduled_journey_steps')
//           .update({
//             status: 'completed',
//             completed_at: new Date().toISOString(),
//           })
//           .eq('id', step.id);

//         processed++;
//         console.log(`✅ Step ${step.id} processed successfully`);

//       } catch (error) {
//         console.error(`❌ Error processing step ${step.id}:`, error.message);

//         // Increment retry count
//         const newRetryCount = (step.retry_count || 0) + 1;
//         const maxRetries = step.max_retries || 3;

//         if (newRetryCount >= maxRetries) {
//           // Max retries reached, mark as failed
//           await supabase
//             .from('scheduled_journey_steps')
//             .update({
//               status: 'failed',
//               error: error.message,
//               completed_at: new Date().toISOString(),
//               retry_count: newRetryCount,
//             })
//             .eq('id', step.id);

//           failed++;
//           console.log(`💀 Step ${step.id} failed after ${maxRetries} retries`);
//         } else {
//           // Retry later
//           const retryDelay = Math.min(300 * Math.pow(2, newRetryCount), 3600); // Exponential backoff, max 1 hour
//           const nextRetry = new Date(Date.now() + retryDelay * 1000);

//           await supabase
//             .from('scheduled_journey_steps')
//             .update({
//               status: 'pending',
//               retry_count: newRetryCount,
//               execute_at: nextRetry.toISOString(),
//               error: error.message,
//             })
//             .eq('id', step.id);

//           console.log(`🔄 Step ${step.id} will retry in ${retryDelay}s (attempt ${newRetryCount}/${maxRetries})`);
//         }
//       }
//     }

//     console.log('\n📊 Summary:');
//     console.log(`  ✅ Processed: ${processed}`);
//     console.log(`  ❌ Failed: ${failed}`);
//     console.log(`  🔄 Pending retry: ${dueSteps.length - processed - failed}`);

//   } catch (error) {
//     console.error('❌ Fatal error in scheduled steps processor:', error);
//     process.exit(1);
//   }
// }

// // Run the processor
// processScheduledSteps()
//   .then(() => {
//     console.log('✨ Scheduled steps processor completed');
//     process.exit(0);
//   })
//   .catch(error => {
//     console.error('💥 Unhandled error:', error);
//     process.exit(1);
//   });


// scripts/process-scheduled-steps.js
/**
 * Simplified Journey Step Processor
 * Calls the internal API endpoint to process all due steps
 */

require('dotenv').config();

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const API_KEY = process.env.INTERNAL_API_KEY;

async function processScheduledSteps() {
  console.log('🔄 Processing scheduled journey steps...');
  console.log(`📍 API URL: ${APP_URL}`);
  
  if (!API_KEY) {
    console.error('❌ INTERNAL_API_KEY not set in environment');
    process.exit(1);
  }

  try {
    const response = await fetch(`${APP_URL}/api/internal/process-journeys`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const result = await response.json();
    
    console.log('\n✅ Processing complete:');
    console.log(`  📊 Processed: ${result.processed || 0}`);
    console.log(`  ❌ Failed: ${result.failed || 0}`);
    console.log(`  ⏭️  Skipped: ${result.skipped || 0}`);
    console.log(`  📈 Total: ${result.total || 0}`);
    console.log(`  ⏱️  Duration: ${result.duration_ms || 0}ms`);
    
    // Write to GitHub Actions output if running in Actions
    if (process.env.GITHUB_OUTPUT) {
      const fs = require('fs');
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `processed=${result.processed || 0}\n`);
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `failed=${result.failed || 0}\n`);
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `total=${result.total || 0}\n`);
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

// Run
processScheduledSteps()
  .then(() => {
    console.log('✨ Scheduled steps processor completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Processor failed:', error);
    process.exit(1);
  });