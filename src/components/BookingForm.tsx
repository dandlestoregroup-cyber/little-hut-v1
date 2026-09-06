"use client";

import Link from "next/link";
import { FormEvent, useRef, useState } from "react";

interface BookingFormProps {
  propertyId: string;
  momentId: string;
  propertyName: string;
}

interface BookingResponse {
  action?: "recommend" | "block" | "escalate";
  reasons?: string[];
  rate?: { amountMinor: number; currency: string; expiresAt: string } | null;
  receipt?: { enquiryId?: string | null } | null;
  error?: string;
}

const reasonCopy: Record<string, string> = {
  availability_missing: "Availability has not been freshly verified for those dates.",
  availability_not_verified_available: "The requested dates are not verified available.",
  availability_does_not_cover_stay: "The verified availability does not cover the full stay.",
  availability_stale: "Availability needs a fresh check.",
  rate_missing: "A verified rate is not yet available for the full stay.",
  rate_not_verified: "The current rate is not verified.",
  rate_does_not_cover_stay: "The verified rate does not cover the full stay.",
  rate_stale: "The rate needs a fresh check.",
  operational_readiness_missing: "Operational readiness has not been confirmed.",
  operational_readiness_not_ready: "The home is not operationally ready for booking.",
  operational_readiness_stale: "Operational readiness needs a fresh check.",
  unresolved_high_risk: "A material operating risk must be resolved first.",
  unresolved_medium_risk: "A Little Hut operator needs to confirm one detail before proceeding.",
};

function formatRate(rate: NonNullable<BookingResponse["rate"]>) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: rate.currency,
      maximumFractionDigits: 0,
    }).format(rate.amountMinor / 100);
  } catch {
    return `${(rate.amountMinor / 100).toLocaleString()} ${rate.currency}`;
  }
}

export function BookingForm({ propertyId, momentId, propertyName }: BookingFormProps) {
  const keyRef = useRef<string | null>(null);
  const [state, setState] = useState<"idle" | "checking" | "done" | "auth" | "error">("idle");
  const [result, setResult] = useState<BookingResponse | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("checking");
    setResult(null);

    const form = new FormData(event.currentTarget);
    keyRef.current ??= crypto.randomUUID();
    const response = await fetch("/api/enquiries", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        propertyId,
        momentId,
        startDate: String(form.get("startDate")),
        endDate: String(form.get("endDate")),
        partySize: Number(form.get("partySize")),
        idempotencyKey: keyRef.current,
      }),
    });

    const body = (await response.json()) as BookingResponse;
    setResult(body);
    if (response.status === 401) {
      setState("auth");
      return;
    }
    if (!response.ok) {
      setState("error");
      return;
    }
    setState("done");
  }

  const firstReason = result?.reasons?.[0];

  return (
    <div className="bookingBox">
      <div>
        <p className="microLabel">Check this stay</p>
        <h3>{propertyName}</h3>
      </div>
      <form className="bookingForm" onSubmit={submit}>
        <label>
          Arrive
          <input name="startDate" type="date" required />
        </label>
        <label>
          Leave
          <input name="endDate" type="date" required />
        </label>
        <label>
          Guests
          <input name="partySize" type="number" min="1" max="30" defaultValue="2" required />
        </label>
        <button type="submit" disabled={state === "checking"}>
          {state === "checking" ? "Verifying…" : "Verify & request"}
        </button>
      </form>

      {state === "auth" ? (
        <p className="bookingResult">Sign in first so the verified request can be saved. <Link href="/auth?next=/">Sign in</Link></p>
      ) : null}
      {state === "done" && result?.action === "recommend" ? (
        <p className="bookingResult isGood">
          Verified now{result.rate ? ` at ${formatRate(result.rate)}` : ""}. Your request is recorded for Little Hut to complete.
        </p>
      ) : null}
      {state === "done" && result?.action === "escalate" ? (
        <p className="bookingResult isWarn">The stay passed the truth gates but needs one human decision. Your request is in review.</p>
      ) : null}
      {state === "done" && result?.action === "block" ? (
        <p className="bookingResult">Not bookable yet. {firstReason ? reasonCopy[firstReason] ?? firstReason : "A verification gate did not pass."}</p>
      ) : null}
      {state === "error" ? <p className="bookingResult isError">Could not complete the verification: {result?.error ?? "unknown error"}</p> : null}
    </div>
  );
}
