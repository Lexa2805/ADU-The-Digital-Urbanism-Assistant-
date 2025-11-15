import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type DocumentRecord = {
  id: string
  request_id: string | null
  validation_status: string
  uploaded_at: string
  [key: string]: unknown
}

type RequestRecord = {
  id: string
  request_type: string
  user_id: string | null
}

type ProfileRecord = {
  id: string
  email: string
  full_name: string | null
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const parsedLimit = Number(searchParams.get('limit'))
    const limit = Number.isFinite(parsedLimit) ? parsedLimit : 50

    const { data: documentRows, error: documentError } = await supabase
      .from('documents')
      .select('*')
      .eq('validation_status', 'rejected')
      .order('uploaded_at', { ascending: false })
      .limit(limit)

    if (documentError) {
      return NextResponse.json({ error: documentError.message }, { status: 500 })
    }

    const documents: DocumentRecord[] = documentRows ?? []

    const requestIds = Array.from(
      new Set(documents.map(doc => doc.request_id).filter((id): id is string => Boolean(id)))
    )

    let requests: RequestRecord[] = []
    if (requestIds.length) {
      const { data: requestRows, error: requestError } = await supabase
        .from('requests')
        .select('id, request_type, user_id')
        .in('id', requestIds)

      if (requestError) {
        return NextResponse.json({ error: requestError.message }, { status: 500 })
      }

      requests = requestRows ?? []
    }

    const userIds = Array.from(
      new Set(requests.map(req => req.user_id).filter((id): id is string => Boolean(id)))
    )

    let users: ProfileRecord[] = []
    if (userIds.length) {
      const { data: userRows, error: userError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds)

      if (userError) {
        return NextResponse.json({ error: userError.message }, { status: 500 })
      }

      users = userRows ?? []
    }

    const enrichedData = documents.map(doc => {
      const relatedRequest = requests.find(req => req.id === doc.request_id)
      const relatedUser = relatedRequest
        ? users.find(user => user.id === relatedRequest.user_id)
        : undefined
      return {
        ...doc,
        request: relatedRequest
          ? {
              id: relatedRequest.id,
              request_type: relatedRequest.request_type,
              user: relatedUser ?? { email: 'unknown', full_name: null }
            }
          : null
      }
    })

    return NextResponse.json({ data: enrichedData })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error while fetching rejected documents'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}