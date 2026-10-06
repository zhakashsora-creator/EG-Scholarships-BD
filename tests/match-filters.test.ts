import assert from "node:assert/strict";
import test from "node:test";
import { defaultMatchFilters, parseMatchFilters, serializeMatchFilters } from "../app/lib/match-filters";

test("match filter URLs preserve a specific catalogue view", () => {
  const filters = parseMatchFilters({
    q: "textile",
    country: "Finland",
    funding: "Fully funded",
    band: "Possible match",
    freshness: "Needs recheck",
    sort: "deadline",
    page: "2",
  });
  assert.deepEqual(filters, {
    query: "textile",
    country: "Finland",
    funding: "Fully funded",
    band: "Possible match",
    freshness: "Needs recheck",
    sort: "deadline",
    page: 2,
  });
  assert.equal(serializeMatchFilters(filters).toString(), "tab=matches&q=textile&country=Finland&funding=Fully+funded&band=Possible+match&freshness=Needs+recheck&sort=deadline&page=2");
});

test("invalid or default filter values produce a clean Best Finds URL", () => {
  assert.deepEqual(parseMatchFilters({ funding: "unknown", band: "unknown", sort: "unknown", page: "2oops" }), defaultMatchFilters);
  assert.equal(parseMatchFilters({ page: "-4" }).page, 1);
  assert.equal(serializeMatchFilters(defaultMatchFilters).toString(), "tab=matches");
});
