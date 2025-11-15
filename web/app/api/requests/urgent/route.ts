import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const daysThreshold = parseInt(searchParams.get('days') || '3')

    const thresholdDate = new Date()
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold)

    const { data, error } = await supabase
      .from('requests')
      .select(`
        *,
        user:profiles!requests_user_id_fkey(email, full_name),
        assigned_clerk:profiles!requests_assigned_clerk_id_fkey(email, full_name)
      `)
      .not('legal_deadline', 'is', null)
      .lte('legal_deadline', thresholdDate.toISOString())
      .in('status', ['pending_validation', 'in_review'])
      .order('legal_deadline', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!requests || requests.length === 0) {
      return NextResponse.json({ data: [] })
    }

    // Get user profiles separately
    const userIds = [...new Set(requests.map((r) => r.user_id))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds)

    const profilesMap = new Map((profiles || []).map((p) => [p.id, p]))

    // Combine data
    const enrichedData = requests.map((req) => ({
      ...req,
      user: profilesMap.get(req.user_id) || { email: '', full_name: null }
    }))

    return NextResponse.json({ data: enrichedData })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}