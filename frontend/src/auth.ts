/**
 * Auth stub: no login required. Pro is determined by cookies + ProSubscription only.
 * Restore full NextAuth in auth.ts if you want login/signup again.
 */
export async function auth(): Promise<{ user: { id: string; email?: string | null } } | null> {
  return null;
}

export const handlers = {
  GET: async () => new Response(null, { status: 404 }),
  POST: async () => new Response(null, { status: 404 }),
};
