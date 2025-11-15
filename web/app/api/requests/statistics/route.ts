import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type RequestRecord = {
  status: string
  request_type: string
  created_at: string
}

const timeframeOffsets: Record<string, (date: Date) => Date> = {
  '7d': date => new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000),
  '30d': date => new Date(date.getTime() - 30 * 24 * 60 * 60 * 1000),
  '90d': date => new Date(date.getTime() - 90 * 24 * 60 * 60 * 1000),
  '1y': date => new Date(date.setFullYear(date.getFullYear() - 1))
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const timeframe = searchParams.get('timeframe') || '30d'

    const now = new Date()
    const startDate = timeframeOffsets[timeframe]?.(new Date(now)) ?? timeframeOffsets['30d'](new Date(now))

    const { data: requestRows, error } = await supabase
      .from('requests')
      .select('*')
      .gte('created_at', startDate.toISOString())

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const requests: RequestRecord[] = requestRows ?? []

    const total = requests.length
    const pending = requests.filter(r => r.status === 'pending_validation' || r.status === 'in_review').length
    const approved = requests.filter(r => r.status === 'approved').length
    const rejected = requests.filter(r => r.status === 'rejected').length
    const approvalRate = total > 0 ? parseFloat(((approved / total) * 100).toFixed(1)) : 0

    const byType: Record<string, number> = requests.reduce((acc, requestRecord) => {
      acc[requestRecord.request_type] = (acc[requestRecord.request_type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      data: {
        total,
        pending,
        approved,
        rejected,
        approval_rate: approvalRate,
        by_type: byType
      }
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error while computing request statistics'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
