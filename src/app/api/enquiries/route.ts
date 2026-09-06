import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { bookingRequestSchema, evaluateAndPersistBooking } from "@/services/mastermind-runtime";

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth.configured) {
      return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
    }
    if (!auth.user) {
      return NextResponse.json({ error: "authentication_required" }, { status: 401 });
    }

    const input = bookingRequestSchema.parse(await request.json());
    const result = await evaluateAndPersistBooking(auth.user.id, input);

    return NextResponse.json({
      action: result.decision.action,
      reasons: result.decision.reasons,
      evidenceIds: result.decision.evidenceIds,
      rate: result.rate
        ? {
            amountMinor: result.rate.amountMinor,
            currency: result.rate.currency,
            expiresAt: result.rate.expiresAt,
          }
        : null,
      receipt: result.receipt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_enquiry_failure";
    const status = message === "candidate_not_found" ? 404 : message.startsWith("[") ? 400 : 422;
    return NextResponse.json({ error: message }, { status });
  }
}
