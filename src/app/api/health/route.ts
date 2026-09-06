import { NextResponse } from "next/server";
import { getRuntimeConfig } from "@/lib/env";
import { createPublicSupabaseClient } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = getRuntimeConfig();

    if (!config.supabaseConfigured) {
      return NextResponse.json({
        status: "ok",
        environment: config.environment,
        database: "not_configured_demo",
        serviceRoleConfigured: false,
      });
    }

    const supabase = createPublicSupabaseClient();
    if (!supabase) throw new Error("public_client_unavailable");

    const { error } = await supabase
      .from("guest_moment_properties")
      .select("property_id")
      .limit(1);

    if (error) {
      return NextResponse.json(
        {
          status: "degraded",
          environment: config.environment,
          database: `unhealthy:${error.code}`,
          serviceRoleConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      status: "ok",
      environment: config.environment,
      database: "reachable",
      serviceRoleConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "blocked",
        reason: error instanceof Error ? error.message : "unknown_health_failure",
      },
      { status: 503 },
    );
  }
}
