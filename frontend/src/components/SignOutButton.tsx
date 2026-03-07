"use client";

import Link from "next/link";

/** Sign out link — uses NextAuth signout endpoint so no SessionProvider needed. */
export function SignOutButton({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/api/auth/signout"
      className={className}
    >
      Sign out
    </Link>
  );
}
