import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')

    const { data: documents, error } = await supabase
      .from('documents')
      .select('*')
      .eq('validation_status', 'rejected')
      .order('uploaded_at', { ascending: false })
      .limit(limit)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fetch request details
    const requestIds = [...new Set(documents?.map(d => d.request_id).filter(Boolean))]
    
    const { data: requests } = await supabase
      .from('requests')
      .select('id, request_type, user_id')
      .in('id', requestIds)

    // Fetch user details
    const userIds = [...new Set(requests?.map(r => r.user_id).filter(Boolean))]
    const { data: users } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds)

    // Combine data
    const enrichedData = documents?.map(doc => {
      const req = requests?.find(r => r.id === doc.request_id)
      const user = users?.find(u => u.id === req?.user_id)
      return {
        ...doc,
        request: req ? {
          id: req.id,
          request_type: req.request_type,
          user: user || { email: 'unknown', full_name: null }
        } : null
      }
    })

    return NextResponse.json({ data: enrichedData })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}