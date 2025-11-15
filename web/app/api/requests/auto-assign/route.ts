import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST() {
  try {
    // 1. Get unassigned requests
    const { data: unassignedRequests, error: requestsError } = await supabase
      .from('requests')
      .select('id')
      .is('assigned_clerk_id', null)
      .eq('status', 'pending_validation')

    if (requestsError) {
      return NextResponse.json({ error: requestsError.message }, { status: 500 })
    }

    if (!unassignedRequests || unassignedRequests.length === 0) {
      return NextResponse.json({ 
        success: true, 
        assigned_count: 0,
        message: 'Nu există cereri nealocate'
      })
    }

    // 2. Get all active clerks
    const { data: clerks, error: clerksError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('role', 'clerk')

    if (clerksError || !clerks || clerks.length === 0) {
      return NextResponse.json({ 
        error: 'Nu există funcționari activi în sistem',
        success: false 
      }, { status: 400 })
    }

    // 3. Calculate current workload for each clerk
    const clerkWorkload = await Promise.all(
      clerks.map(async (clerk) => {
        const { count } = await supabase
          .from('requests')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_clerk_id', clerk.id)
          .not('status', 'in', '(approved,rejected)')

        return {
          clerk_id: clerk.id,
          workload: count || 0
        }
      })
    )

    // 4. Sort clerks by workload (ascending)
    clerkWorkload.sort((a, b) => a.workload - b.workload)

    // 5. Round-robin assignment
    let assignedCount = 0
    const updates = []

    for (let i = 0; i < unassignedRequests.length; i++) {
      const clerkIndex = i % clerkWorkload.length
      const selectedClerk = clerkWorkload[clerkIndex]

      updates.push(
        supabase
          .from('requests')
          .update({ assigned_clerk_id: selectedClerk.clerk_id })
          .eq('id', unassignedRequests[i].id)
      )

      selectedClerk.workload++ // Update local workload counter
      assignedCount++
    }

    // 6. Execute all updates
    await Promise.all(updates)

    return NextResponse.json({
      success: true,
      assigned_count: assignedCount,
      message: `${assignedCount} cereri au fost alocate automat`
    })

  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message,
      success: false 
    }, { status: 500 })
  }
}
