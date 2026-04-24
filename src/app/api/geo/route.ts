import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  // Vercel otomatik geo detection
  const vercelCountry = req.geo?.country || req.headers.get('x-vercel-ip-country')
  // Cloudflare header (alternatif CDN)
  const cfCountry = req.headers.get('cf-ipcountry')
  // Herhangi bir IP-country header
  const genericCountry = req.headers.get('x-country-code')

  const country = vercelCountry || cfCountry || genericCountry || 'US'
  const isTurkey = country.toUpperCase() === 'TR'

  console.log(`[Geo] detected=${country} isTurkey=${isTurkey}`)

  return NextResponse.json({
    country,
    isTurkey,
    currency: isTurkey ? 'TRY' : 'USD',
  }, {
    headers: {
      // Cache etme — her kullanıcının gerçek konumunu al
      'Cache-Control': 'no-store, no-cache',
    }
  })
}
