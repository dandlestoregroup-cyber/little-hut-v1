import { createPublicSupabaseClient } from "@/lib/supabase/public";

export interface GuestMomentProperty {
  propertyId: string;
  propertySlug: string;
  propertyName: string;
  momentId: string;
  momentSlug: string;
  momentName: string;
  momentPromise: string;
  heroUrl: string;
}

interface GuestMomentPropertyRow {
  property_id: string;
  property_slug: string;
  property_name: string;
  moment_id: string;
  moment_slug: string;
  moment_name: string;
  moment_promise: string;
  hero_media_path: string;
}

export async function listGuestMomentProperties(): Promise<GuestMomentProperty[]> {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("guest_moment_properties")
    .select("property_id,property_slug,property_name,moment_id,moment_slug,moment_name,moment_promise,hero_media_path")
    .order("moment_name");

  if (error) throw new Error(`guest_discovery_failed:${error.code}`);

  const rows = (data ?? []) as GuestMomentPropertyRow[];
  const seen = new Set<string>();

  return rows.flatMap((row) => {
    const key = `${row.property_id}:${row.moment_id}`;
    if (seen.has(key)) return [];
    seen.add(key);

    const { data: publicUrl } = supabase.storage
      .from("public-moment-media")
      .getPublicUrl(row.hero_media_path);

    return [
      {
        propertyId: row.property_id,
        propertySlug: row.property_slug,
        propertyName: row.property_name,
        momentId: row.moment_id,
        momentSlug: row.moment_slug,
        momentName: row.moment_name,
        momentPromise: row.moment_promise,
        heroUrl: publicUrl.publicUrl,
      },
    ];
  });
}
