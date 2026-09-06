import "server-only";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

function contentTypeForPath(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".avif")) return "image/avif";
  return "image/jpeg";
}

export async function promoteEvidencePhotos(evidenceId: string, reason: string) {
  const service = createServiceSupabaseClient();
  const { data: links, error: linksError } = await service
    .from("evidence_media")
    .select("media_asset_id,media_assets!inner(id,storage_path,kind,public_safe)")
    .eq("evidence_id", evidenceId);

  if (linksError) throw new Error(`promotion_media_lookup_failed:${linksError.code}`);

  const promoted: string[] = [];
  const failures: Array<{ mediaId: string; reason: string }> = [];

  for (const link of links ?? []) {
    const media = Array.isArray(link.media_assets) ? link.media_assets[0] : link.media_assets;
    if (!media || media.kind !== "photo") continue;
    if (media.public_safe) {
      promoted.push(media.id);
      continue;
    }

    try {
      const { data: raw, error: downloadError } = await service.storage
        .from("private-evidence-media")
        .download(media.storage_path);
      if (downloadError || !raw) throw new Error(downloadError?.message ?? "private_media_missing");

      const { error: uploadError } = await service.storage
        .from("public-moment-media")
        .upload(media.storage_path, raw, {
          contentType: raw.type || contentTypeForPath(media.storage_path),
          upsert: true,
        });
      if (uploadError) throw new Error(uploadError.message);

      const { error: markError } = await service.rpc("mark_media_public_safe", {
        p_media_id: media.id,
        p_reason: reason,
      });
      if (markError) throw new Error(markError.message);
      promoted.push(media.id);
    } catch (error) {
      failures.push({
        mediaId: media.id,
        reason: error instanceof Error ? error.message : "unknown_promotion_failure",
      });
    }
  }

  return { promoted, failures };
}
