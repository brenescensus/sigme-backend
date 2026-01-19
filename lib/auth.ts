// lib/auth.ts
export function getTokenFromRequest(req: Request) {
  const header = req.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return null
  return header.slice(7)
}
