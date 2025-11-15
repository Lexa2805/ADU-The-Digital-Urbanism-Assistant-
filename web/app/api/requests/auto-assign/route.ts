import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type RequestIdRecord = { id: string }

type ClerkProfile = {
  id: string
  email: string
  full_name: string | null
}

type ClerkWorkload = {
  clerk_id: string
  workload: number
}

export async function POST() {
  try {
    const { data: unassignedRequests, error: requestsError } = await supabase
      .from('requests')
      .select('id')
      .is('assigned_clerk_id', null)
      .eq('status', 'pending_validation')

    if (requestsError) {
      return NextResponse.json({ error: requestsError.message }, { status: 500 })
    }

    if (!unassignedRequests?.length) {
      return NextResponse.json({ success: true, assigned_count: 0, message: 'Nu există cereri nealocate' })
    }

    const { data: clerks, error: clerksError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('role', 'clerk')

    if (clerksError || !clerks?.length) {
      return NextResponse.json(
        { error: 'Nu există funcționari activi în sistem', success: false },
        { status: 400 }
      )
    }

    const clerkWorkload: ClerkWorkload[] = await Promise.all(
      clerks.map(async (clerk: ClerkProfile) => {
        const { count } = await supabase
          .from('requests')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_clerk_id', clerk.id)
          .not('status', 'in', '(approved,rejected)')

        return {
          clerk_id: clerk.id,
          workload: count ?? 0
        }
      })
    )

    clerkWorkload.sort((a, b) => a.workload - b.workload)

    let assignedCount = 0
    const updates: Array<Promise<unknown>> = []

    unassignedRequests.forEach((request: RequestIdRecord, index) => {
      const clerkIndex = index % clerkWorkload.length
      const selectedClerk = clerkWorkload[clerkIndex]

      updates.push(
        supabase
          .from('requests')
          .update({ assigned_clerk_id: selectedClerk.clerk_id })
          .eq('id', request.id)
      )

      selectedClerk.workload += 1
      assignedCount += 1
    })

    await Promise.all(updates)

    return NextResponse.json({
      success: true,
      assigned_count: assignedCount,
      message: `${assignedCount} cereri au fost alocate automat`
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error while auto-assigning requests'
    return NextResponse.json({ error: message, success: false }, { status: 500 })
  }
}
