import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type RequestRecord = {
  id: string
  user_id: string | null
  assigned_clerk_id: string | null
  legal_deadline: string | null
  status: string
  [key: string]: unknown
}

type ProfileRecord = {
  id: string
  email: string
  full_name: string | null
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const requestedDays = Number(searchParams.get('days'))
    const daysThreshold = Number.isFinite(requestedDays) ? requestedDays : 3

    const thresholdDate = new Date()
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold)

    const { data: requestRows, error } = await supabase
      .from('requests')
      .select('*')
      .not('legal_deadline', 'is', null)
      .lte('legal_deadline', thresholdDate.toISOString())
      .in('status', ['pending_validation', 'in_review'])
      .order('legal_deadline', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const requests: RequestRecord[] = requestRows ?? []

    const userIds = Array.from(
      new Set(requests.map(r => r.user_id).filter((id): id is string => Boolean(id)))
    )
    const clerkIds = Array.from(
      new Set(requests.map(r => r.assigned_clerk_id).filter((id): id is string => Boolean(id)))
    )

    const { data: users } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds)

    const { data: clerks } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', clerkIds)

    const userMap = (users ?? []).reduce<Record<string, ProfileRecord>>((acc, profile) => {
      acc[profile.id] = profile
      return acc
    }, {})

    const clerkMap = (clerks ?? []).reduce<Record<string, ProfileRecord>>((acc, profile) => {
      acc[profile.id] = profile
      return acc
    }, {})

    const enrichedData = requests.map(requestRecord => ({
      ...requestRecord,
      user: requestRecord.user_id ? userMap[requestRecord.user_id] ?? { email: 'unknown', full_name: null } : null,
      assigned_clerk: requestRecord.assigned_clerk_id ? clerkMap[requestRecord.assigned_clerk_id] ?? null : null
    }))

    return NextResponse.json({ data: enrichedData })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error while fetching urgent requests'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}