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
  request_type: string
  status: string
  created_at: string
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
    const status = searchParams.get('status')
    const requestType = searchParams.get('request_type')
    const assignedClerkId = searchParams.get('assigned_clerk_id')
    const fromDate = searchParams.get('from_date')
    const toDate = searchParams.get('to_date')
    const search = searchParams.get('search')

    let query = supabase
      .from('requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    if (requestType) {
      query = query.eq('request_type', requestType)
    }

    if (assignedClerkId) {
      query = query.eq('assigned_clerk_id', assignedClerkId)
    }

    if (fromDate) {
      query = query.gte('created_at', fromDate)
    }

    if (toDate) {
      query = query.lte('created_at', toDate)
    }

    if (search) {
      query = query.or(`request_type.ilike.%${search}%`)
    }

    const { data: requestRows, error } = await query

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

    const profilesById = (profiles: ProfileRecord[] | null | undefined) =>
      (profiles ?? []).reduce<Record<string, ProfileRecord>>((acc, profile) => {
        acc[profile.id] = profile
        return acc
      }, {})

    const userMap = profilesById(users)
    const clerkMap = profilesById(clerks)

    const enrichedData = requests.map(req => ({
      ...req,
      user: userMap[req.user_id ?? ''] ?? { email: 'unknown', full_name: null },
      assigned_clerk: req.assigned_clerk_id ? clerkMap[req.assigned_clerk_id] ?? null : null
    }))

    return NextResponse.json({ data: enrichedData })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error while fetching requests'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
