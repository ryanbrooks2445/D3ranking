/**
 * Minimal db stub so the app builds without Prisma/schema.
 * Replace with real Prisma client when you add a database.
 */
export const prisma = {
  user: {
    findUnique: async () => null,
  },
} as unknown as {
  user: {
    findUnique: (args: { where: { id: string }; select: { subscriptionActive: true } }) => Promise<{ subscriptionActive: boolean } | null>;
  };
};
