import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const timeframe = searchParams.get('timeframe') || '30d'

    // Calculate date threshold
    const now = new Date()
    let startDate = new Date()
    
    switch (timeframe) {
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        break
      case '90d':
        startDate.setDate(now.getDate() - 90)
        break
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1)
        break
    }

    // Get all requests in timeframe
    const { data: requests, error } = await supabase
      .from('requests')
      .select('*')
      .gte('created_at', startDate.toISOString())

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate statistics
    const total = requests?.length || 0
    const pending = requests?.filter(r => r.status === 'pending_validation' || r.status === 'in_review').length || 0
    const approved = requests?.filter(r => r.status === 'approved').length || 0
    const rejected = requests?.filter(r => r.status === 'rejected').length || 0
    const approval_rate = total > 0 ? ((approved / total) * 100).toFixed(1) : '0.0'

    // Group by type
    const byType: Record<string, number> = {}
    requests?.forEach(req => {
      byType[req.request_type] = (byType[req.request_type] || 0) + 1
    })

    return NextResponse.json({
      data: {
        total,
        pending,
        approved,
        rejected,
        approval_rate: parseFloat(approval_rate),
        by_type: byType
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
