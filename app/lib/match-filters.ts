export const MATCH_PAGE_SIZE = 12;

export type MatchFilterState = {
  query: string;
  country: string;
  funding: string;
  band: string;
  freshness: string;
  sort: string;
  page: number;
};

export const defaultMatchFilters: MatchFilterState = {
  query: "",
  country: "All countries",
  funding: "All funding",
  band: "All bands",
  freshness: "All records",
  sort: "score",
  page: 1,
};

type SearchParamValue = string | string[] | undefined;

function first(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function oneOf(value: SearchParamValue, allowed: readonly string[], fallback: string) {
  const candidate = first(value);
  return candidate && allowed.includes(candidate) ? candidate : fallback;
}

export function parseMatchFilters(params: Record<string, SearchParamValue>): MatchFilterState {
  const page = Number(first(params.page) || "1");
  return {
    query: (first(params.q) || "").trim().slice(0, 120),
    country: (first(params.country) || defaultMatchFilters.country).trim().slice(0, 80) || defaultMatchFilters.country,
    funding: oneOf(params.funding, ["All funding", "Fully funded", "Full tuition", "Partial funding", "Tuition discount", "Other"], defaultMatchFilters.funding),
    band: oneOf(params.band, ["All bands", "Strong match", "Possible match", "Reach"], defaultMatchFilters.band),
    freshness: oneOf(params.freshness, ["All records", "Recently verified", "Needs recheck"], defaultMatchFilters.freshness),
    sort: oneOf(params.sort, ["score", "deadline", "country"], defaultMatchFilters.sort),
    page: Number.isInteger(page) ? Math.min(1000, Math.max(1, page)) : 1,
  };
}

export function serializeMatchFilters(filters: MatchFilterState) {
  const params = new URLSearchParams({ tab: "matches" });
  if (filters.query) params.set("q", filters.query);
  if (filters.country !== defaultMatchFilters.country) params.set("country", filters.country);
  if (filters.funding !== defaultMatchFilters.funding) params.set("funding", filters.funding);
  if (filters.band !== defaultMatchFilters.band) params.set("band", filters.band);
  if (filters.freshness !== defaultMatchFilters.freshness) params.set("freshness", filters.freshness);
  if (filters.sort !== defaultMatchFilters.sort) params.set("sort", filters.sort);
  if (filters.page > 1) params.set("page", String(filters.page));
  return params;
}
