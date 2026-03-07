/**
 * Minimal auth stub so the app builds and runs without a full NextAuth setup.
 * Replace with real NextAuth config when you add auth (see next-auth docs).
 */
export async function auth(): Promise<{ user: { id: string; email?: string | null } } | null> {
  return null;
}

export const handlers = {
  GET: async () => new Response(null, { status: 404 }),
  POST: async () => new Response(null, { status: 404 }),
};
