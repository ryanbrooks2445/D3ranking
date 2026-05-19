"use client";

import { useEffect } from "react";

export function ProfileViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    const key = `d3rank_view_${slug}`;
    if (typeof window === "undefined" || sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");

    const sessionId =
      localStorage.getItem("d3rank_sid") ??
      (() => {
        const id = crypto.randomUUID();
        localStorage.setItem("d3rank_sid", id);
        return id;
      })();

    fetch(`/api/athletes/${encodeURIComponent(slug)}/view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    }).catch(() => {});
  }, [slug]);

  return null;
}
