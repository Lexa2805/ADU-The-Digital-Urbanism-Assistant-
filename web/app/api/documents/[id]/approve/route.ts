import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type ApproveBody = {
  admin_id: string
}

type DocumentRecord = {
  document_type_ai: string | null
  file_name: string | null
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = (await request.json()) as ApproveBody
    const { admin_id } = body
    const documentId = params.id

    if (!admin_id) {
      return NextResponse.json({ error: 'Admin ID is required', success: false }, { status: 400 })
    }

    const { data: document, error: updateError } = await supabase
      .from('documents')
      .update({
        validation_status: 'approved',
        validation_message: 'Aprobat manual de administrator'
      })
      .eq('id', documentId)
      .select()
      .single<DocumentRecord>()

    if (updateError) {
      return NextResponse.json({ error: updateError.message, success: false }, { status: 500 })
    }

    const { error: logError } = await supabase.from('activity_log').insert({
      user_id: admin_id,
      action_type: 'document_approve',
      target_id: documentId,
      details: {
        document_type: document?.document_type_ai,
        file_name: document?.file_name,
        admin_override: true
      }
    })

    if (logError) {
      console.error('Failed to log activity:', logError)
    }

    return NextResponse.json({ success: true, message: 'Document aprobat cu succes' })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error while approving document'
    return NextResponse.json({ error: message, success: false }, { status: 500 })
  }
}
