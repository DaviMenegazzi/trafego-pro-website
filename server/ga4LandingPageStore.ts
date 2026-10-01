import type { Ga4LandingPage, Ga4LandingPageInput } from "../shared/google.js";
import { Ga4Error, normalizeUnitId } from "./ga4Service.js";
import { getSiteSupabase, unwrap } from "./siteSupabase.js";

// Vínculos Landing Page (propriedade do GA4) ↔ unidade, no Supabase do site
// (tabela ga4_landing_pages, acesso só com service_role — db/ga4_landing_pages.sql).

const COLUMNS = "id, unit_id, property_id, name, hostnames, site_url, created_at";

type Row = {
  id: string;
  unit_id: string;
  property_id: string;
  name: string;
  hostnames: unknown;
  site_url: string | null;
  created_at: string;
};

function toLandingPage(row: Row): Ga4LandingPage {
  return {
    id: row.id,
    unitId: row.unit_id,
    propertyId: row.property_id,
    name: row.name,
    hostnames: Array.isArray(row.hostnames) ? row.hostnames.map(String) : [],
    siteUrl: row.site_url ?? null,
    createdAt: row.created_at,
  };
}

export async function listLandingPagesForUnit(unitId: string): Promise<Ga4LandingPage[]> {
  const rows = unwrap(
    await getSiteSupabase()
      .from("ga4_landing_pages")
      .select(COLUMNS)
      .eq("unit_id", normalizeUnitId(unitId))
      .order("created_at", { ascending: true }),
  ) as Row[] | null;
  return (rows ?? []).map(toLandingPage);
}

export async function findLandingPage(id: string): Promise<Ga4LandingPage | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const row = unwrap(await getSiteSupabase().from("ga4_landing_pages").select(COLUMNS).eq("id", id).maybeSingle()) as Row | null;
  return row ? toLandingPage(row) : null;
}

export async function createLandingPage(input: Ga4LandingPageInput, createdBy: string): Promise<Ga4LandingPage> {
  const { data, error } = await getSiteSupabase()
    .from("ga4_landing_pages")
    .insert({
      unit_id: input.unitId,
      property_id: input.propertyId,
      name: input.name,
      hostnames: input.hostnames,
      site_url: input.siteUrl,
      created_by: createdBy,
    })
    .select(COLUMNS)
    .single();
  if (error) {
    if (error.code === "23505") throw new Ga4Error(409, "Esta propriedade do GA4 já está vinculada a esta unidade.");
    throw new Error(error.message);
  }
  return toLandingPage(data as Row);
}

export async function deleteLandingPage(id: string): Promise<void> {
  unwrap(await getSiteSupabase().from("ga4_landing_pages").delete().eq("id", id));
}
