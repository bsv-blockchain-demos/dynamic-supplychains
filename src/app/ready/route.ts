import { NextResponse } from 'next/server'
import { connectToMongo } from '@/lib/mongo'

// checks db liveness using the shared MongoDB connection
export async function GET() {
  try {
    const { db } = await connectToMongo()
    await db.command({ ping: 1 })
    return NextResponse.json({ status: 'ready' })
  } catch (err) {
    return NextResponse.json(
      { status: 'not ready', error: (err as Error).message },
      { status: 503 }
    )
  }
}