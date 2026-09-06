import type { AppRole } from "@/domain/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type WorkspaceRow = Record<string, unknown>;

export interface WorkspaceData {
  properties: WorkspaceRow[];
  moments: WorkspaceRow[];
  evidence: WorkspaceRow[];
  assessments: WorkspaceRow[];
  scoutSubmissions: WorkspaceRow[];
  ownerDecisions: WorkspaceRow[];
  enquiries: WorkspaceRow[];
  availability: WorkspaceRow[];
  rates: WorkspaceRow[];
  readiness: WorkspaceRow[];
  risks: WorkspaceRow[];
  profiles: WorkspaceRow[];
  roles: WorkspaceRow[];
  audits: WorkspaceRow[];
}

function rows(value: unknown): WorkspaceRow[] {
  return Array.isArray(value) ? (value as WorkspaceRow[]) : [];
}

export async function getWorkspaceData(roles: AppRole[]): Promise<WorkspaceData> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("database_not_configured");

  const isAdmin = roles.includes("admin");
  const [
    properties,
    moments,
    evidence,
    assessments,
    scoutSubmissions,
    ownerDecisions,
    enquiries,
    availability,
    rates,
    readiness,
    risks,
    profiles,
    roleRows,
    audits,
  ] = await Promise.all([
    supabase.from("properties").select("id,slug,name,location_label,short_description,max_guests,bedrooms,bathrooms,owner_user_id,lifecycle,created_at,updated_at").order("updated_at", { ascending: false }).limit(200),
    supabase.from("moments").select("id,slug,name,promise,status").order("name").limit(100),
    supabase.from("property_moment_evidence").select("id,property_id,moment_id,status,claim,submitted_by,reviewed_by,reviewed_at,expires_at,created_at").order("created_at", { ascending: false }).limit(200),
    supabase.from("assessments").select("id,property_id,assessor_user_id,status,findings,assessed_at,created_at").order("created_at", { ascending: false }).limit(200),
    supabase.from("scout_submissions").select("id,property_id,scout_user_id,status,candidate_name,location_label,notes,submitted_at").order("submitted_at", { ascending: false }).limit(200),
    supabase.from("owner_decisions").select("id,property_id,owner_user_id,decision,reason,decided_at").order("decided_at", { ascending: false }).limit(200),
    supabase.from("booking_enquiries").select("id,intent_id,property_id,user_id,status,decision_id,created_at,updated_at").order("created_at", { ascending: false }).limit(200),
    supabase.from("availability_windows").select("id,property_id,start_date,end_date,status,checked_at,expires_at").order("checked_at", { ascending: false }).limit(200),
    supabase.from("rates").select("id,property_id,start_date,end_date,amount_minor,currency,status,checked_at,expires_at").order("checked_at", { ascending: false }).limit(200),
    supabase.from("operational_readiness").select("id,property_id,status,blockers,checked_at,expires_at").order("checked_at", { ascending: false }).limit(200),
    supabase.from("risk_signals").select("id,property_id,moment_id,code,severity,resolved,created_at,resolved_at").order("created_at", { ascending: false }).limit(200),
    isAdmin ? supabase.from("profiles").select("id,display_name,created_at").order("created_at", { ascending: false }).limit(200) : Promise.resolve({ data: [], error: null }),
    isAdmin ? supabase.from("user_roles").select("user_id,role,created_at").order("created_at", { ascending: false }).limit(500) : Promise.resolve({ data: [], error: null }),
    isAdmin ? supabase.from("audit_events").select("id,actor_id,actor_role,entity_type,entity_id,event_type,reason,occurred_at").order("occurred_at", { ascending: false }).limit(100) : Promise.resolve({ data: [], error: null }),
  ]);

  const namedResults: Array<[string, { data: unknown; error: { code?: string; message?: string } | null }]> = [
    ["properties", properties],
    ["moments", moments],
    ["evidence", evidence],
    ["assessments", assessments],
    ["scout_submissions", scoutSubmissions],
    ["owner_decisions", ownerDecisions],
    ["enquiries", enquiries],
    ["availability", availability],
    ["rates", rates],
    ["readiness", readiness],
    ["risks", risks],
    ["profiles", profiles],
    ["roles", roleRows],
    ["audits", audits],
  ];

  for (const [name, result] of namedResults) {
    if (result.error) throw new Error(`workspace_${name}_failed:${result.error.code ?? result.error.message ?? "unknown"}`);
  }

  return {
    properties: rows(properties.data),
    moments: rows(moments.data),
    evidence: rows(evidence.data),
    assessments: rows(assessments.data),
    scoutSubmissions: rows(scoutSubmissions.data),
    ownerDecisions: rows(ownerDecisions.data),
    enquiries: rows(enquiries.data),
    availability: rows(availability.data),
    rates: rows(rates.data),
    readiness: rows(readiness.data),
    risks: rows(risks.data),
    profiles: rows(profiles.data),
    roles: rows(roleRows.data),
    audits: rows(audits.data),
  };
}
