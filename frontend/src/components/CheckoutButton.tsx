"use client";

import { useState } from "react";

export function CheckoutButton({
  className = "",
  children = "Start Free Trial",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (data.url) {
        window.location.href = data.url;
      } else if (res.status === 401) {
        window.location.href = "/login?redirect=checkout";
      } else {
        const msg = data.error || (res.ok ? "No checkout URL returned." : "Something went wrong.");
        alert(msg);
      }
    } catch {
      alert("Network error. Check the console.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`${className} ${loading ? "opacity-60 cursor-wait" : ""}`}
    >
      {loading ? "Redirecting..." : children}
    </button>
  );
}
