import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'

// checks db liveness
export async function GET() {
  const { MONGODB_URI } = process.env
  const client = new MongoClient(MONGODB_URI!)
  try {
    await client.connect()
    await client.db().command({ ping: 1 })
    return NextResponse.json({ status: 'ready' })
  } catch (err) {
    return NextResponse.json(
      { status: 'not ready', error: (err as Error).message },
      { status: 503 }
    )
  } finally {
    await client.close()
  }
}