// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { callChatModel, ClientMessage } from '@/lib/chat/provider'

export async function POST(req: NextRequest) {
  try {
    const { messages } = (await req.json()) as { messages: ClientMessage[] }

    const reply = await callChatModel(messages)

    return NextResponse.json({ reply })
  } catch (error: any) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      {
        error: error?.message || 'An error occurred, please try again later.',
      },
      { status: 500 }
    )
  }
}
