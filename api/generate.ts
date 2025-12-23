
// This file is deprecated. All AI logic is now handled in the dedicated Node.js backend.
export default async function handler(req: Request): Promise<Response> {
  return new Response(JSON.stringify({ error: 'Proxy deprecated. Use specific backend endpoints.' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}
