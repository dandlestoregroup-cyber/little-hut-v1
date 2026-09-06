import { NextResponse } from "next/server";
import { getAuthContext, hasAnyRole, primaryRole } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "video/mp4",
  "video/quicktime",
]);

function extensionFor(file: File): string {
  const byType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
  };
  return byType[file.type] ?? "bin";
}

export async function POST(request: Request) {
  const auth = await getAuthContext();
  if (!auth.configured) return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  if (!auth.user) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  if (!hasAnyRole(auth.roles, ["scout", "assessor", "operator", "admin"])) {
    return NextResponse.json({ error: "evidence_role_required" }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "database_not_configured" }, { status: 503 });

  const form = await request.formData();
  const propertyId = String(form.get("propertyId") ?? "");
  const sourceRef = String(form.get("sourceRef") ?? "").trim();
  const method = String(form.get("method") ?? "upload");
  const capturedAt = String(form.get("capturedAt") ?? new Date().toISOString());
  const file = form.get("file");

  if (!/^[0-9a-f-]{36}$/i.test(propertyId) || !sourceRef || !(file instanceof File)) {
    return NextResponse.json({ error: "invalid_upload_request" }, { status: 400 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: "unsupported_media_type" }, { status: 415 });
  }
  const isPhoto = file.type.startsWith("image/");
  const maxBytes = isPhoto ? 15 * 1024 * 1024 : 50 * 1024 * 1024;
  if (file.size < 1 || file.size > maxBytes) {
    return NextResponse.json({ error: "media_size_out_of_bounds" }, { status: 413 });
  }
  if (!Number.isFinite(Date.parse(capturedAt))) {
    return NextResponse.json({ error: "invalid_capture_timestamp" }, { status: 400 });
  }

  const { data: allowed, error: accessError } = await supabase.rpc("can_access_property", {
    p_property_id: propertyId,
  });
  if (accessError || allowed !== true) {
    return NextResponse.json({ error: "property_access_denied" }, { status: 403 });
  }

  const service = createServiceSupabaseClient();
  const path = `${propertyId}/${auth.user.id}/${crypto.randomUUID()}.${extensionFor(file)}`;
  const { error: uploadError } = await service.storage
    .from("private-evidence-media")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: `storage_upload_failed:${uploadError.message}` }, { status: 422 });
  }

  const role = primaryRole(auth.roles);
  const source = role === "admin" ? "operator" : role;
  const allowedMethod = ["upload", "site_visit", "owner_attestation", "system_check", "api"].includes(method)
    ? method
    : "upload";

  const { data: media, error: insertError } = await supabase
    .from("media_assets")
    .insert({
      property_id: propertyId,
      storage_path: path,
      kind: isPhoto ? "photo" : "video",
      public_safe: false,
      provenance: {
        source,
        sourceRef,
        capturedAt,
        actorId: auth.user.id,
        method: allowedMethod,
      },
      captured_at: capturedAt,
    })
    .select("id,storage_path,kind,public_safe")
    .single();

  if (insertError || !media) {
    await service.storage.from("private-evidence-media").remove([path]);
    return NextResponse.json({ error: `media_record_failed:${insertError?.code ?? "unknown"}` }, { status: 422 });
  }

  return NextResponse.json({ media }, { status: 201 });
}
