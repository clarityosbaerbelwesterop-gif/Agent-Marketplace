"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function PaymentPendingNotice({ rentalId }: { rentalId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const response = await fetch(`/api/rentals/${rentalId}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as { active?: boolean };
        if (!cancelled && data.active) {
          router.replace(`/chat?rentalId=${encodeURIComponent(rentalId)}`);
          router.refresh();
        }
      } catch {
        if (!cancelled) {
          setError("Could not refresh rental status.");
        }
      }
    }

    void poll();
    const timer = window.setInterval(() => {
      void poll();
    }, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [rentalId, router]);

  return (
    <div className="flex max-w-xl flex-col gap-2 text-sm">
      <p>
        Waiting for Stripe to confirm payment. This page does not treat the
        Checkout redirect as success.
      </p>
      {error ? (
        <p className="text-red-700" role="alert">
          {error}
        </p>
      ) : (
        <p className="text-muted">Checking rental status…</p>
      )}
    </div>
  );
}
