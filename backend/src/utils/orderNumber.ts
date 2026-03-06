/**
 * Order Number Generation Utility
 * 
 * Generates unique order numbers in the format: TC-{yymmdd}-{sequence}
 * Example: TC-241229-0001, TC-241229-0002, etc.
 * 
 * Uses database-level atomic sequence increment for reliability and thread-safety.
 * The sequence is tracked in order_sequences table and uses PostgreSQL's atomic operations
 * to handle concurrent order creation reliably.
 */

import { supabaseAdmin } from "../services/supabase.js";

const ORDER_NUMBER_PREFIX = "TC";

/**
 * Generate a unique order number for today
 * Format: TC-{yymmdd}-{sequence}
 * 
 * Uses database function get_next_order_sequence() for atomic increment.
 * This ensures no race conditions and reliable sequence tracking even with concurrent requests.
 * 
 * @returns Promise<string> - Unique order number
 */
export async function generateOrderNumber(): Promise<string> {
  // Get today's date in yymmdd format
  const today = new Date();
  const yy = String(today.getFullYear()).slice(-2);
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const dateKey = `${yy}${mm}${dd}`;

  try {
    // Primary method: Use RPC function for atomic sequence increment
    // This is the most reliable as it uses PostgreSQL's atomic operations
    const { data, error } = await supabaseAdmin.rpc('get_next_order_sequence', {
      p_date_key: dateKey
    });

    if (error) {
      console.error("Error calling get_next_order_sequence RPC:", error);
      
      // Fallback: Manual increment with optimistic locking for race condition handling
      let attempts = 0;
      const maxAttempts = 5;
      
      while (attempts < maxAttempts) {
        attempts++;
        
        // Get current sequence
        const { data: existing, error: fetchError } = await supabaseAdmin
          .from('order_sequences')
          .select('sequence_number')
          .eq('date_key', dateKey)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = not found
          throw new Error(`Failed to fetch sequence: ${fetchError.message}`);
        }

        const currentSequence = existing?.sequence_number || 0;
        const newSequence = currentSequence + 1;

        // Try to insert or update with optimistic locking
        if (!existing) {
          // Try to insert new sequence (will fail if another request already inserted)
          const { error: insertError } = await supabaseAdmin
            .from('order_sequences')
            .insert({ date_key: dateKey, sequence_number: 1 });
          
          if (!insertError) {
            const sequenceStr = String(1).padStart(4, "0");
            const orderNumber = `${ORDER_NUMBER_PREFIX}-${dateKey}-${sequenceStr}`;
            console.log(`📝 Generated order number (fallback): ${orderNumber} (sequence: 1)`);
            return orderNumber;
          }
        } else {
          // Update existing sequence with optimistic locking
          // Only update if sequence_number hasn't changed (prevents race conditions)
          const { error: updateError } = await supabaseAdmin
            .from('order_sequences')
            .update({ 
              sequence_number: newSequence, 
              last_updated: new Date().toISOString() 
            })
            .eq('date_key', dateKey)
            .eq('sequence_number', currentSequence); // Optimistic lock: only update if still matches

          if (!updateError) {
            const sequenceStr = String(newSequence).padStart(4, "0");
            const orderNumber = `${ORDER_NUMBER_PREFIX}-${dateKey}-${sequenceStr}`;
            console.log(`📝 Generated order number (fallback): ${orderNumber} (sequence: ${newSequence})`);
            return orderNumber;
          }
        }

        // If we got here, there was a race condition - retry after a short delay
        await new Promise(resolve => setTimeout(resolve, 10 * attempts));
      }

      throw new Error(`Failed to generate order number after ${maxAttempts} attempts`);
    }

    // Successfully got sequence from RPC function (preferred method)
    const sequence = data as number;
    const sequenceStr = String(sequence).padStart(4, "0");
    const orderNumber = `${ORDER_NUMBER_PREFIX}-${dateKey}-${sequenceStr}`;
    console.log(`📝 Generated order number: ${orderNumber} (sequence: ${sequence})`);
    return orderNumber;

  } catch (error: any) {
    console.error("Error in generateOrderNumber:", error);
    throw new Error("Failed to generate order number: " + error.message);
  }
}
