import { NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/backend'

export async function GET(_: NextRequest) {
  return proxyToBackend('/api/transparencia/dashboard')
}
