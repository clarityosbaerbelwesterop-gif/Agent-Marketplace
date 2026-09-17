"use client";

import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { AGENT_CATEGORIES, AGENT_SORTS, AGENT_TIERS } from "@/lib/catalog/constants";
import {
  AGENT_CATEGORY_GROUPS,
  CATEGORY_GROUP_MEMBERS,
} from "@/lib/catalog/groups";
import { GROUP_LABELS, SORT_LABELS, TIER_LABELS } from "@/lib/labels";
import type { ParsedAgentsQuery } from "@/lib/catalog/parse-query";

export function MarketplaceFilters({
  query,
  compare,
}: {
  query: ParsedAgentsQuery;
  compare: string[];
}) {
  const categories = query.group
    ? CATEGORY_GROUP_MEMBERS[query.group]
    : AGENT_CATEGORIES;

  return (
    <form
      action="/marketplace"
      method="get"
      className="grid gap-4 rounded-[var(--radius-lg)] border border-border bg-surface p-4 md:grid-cols-2 lg:grid-cols-6"
      aria-label="Marktplatz filtern"
    >
      {compare.length > 0 ? (
        <input type="hidden" name="compare" value={compare.join(",")} />
      ) : null}

      <Field id="search" label="Suche">
        <Input
          id="search"
          name="search"
          type="search"
          defaultValue={query.search ?? ""}
          placeholder="Name, Slug, Spezialisierung"
          autoComplete="off"
        />
      </Field>

      <Field id="group" label="Gruppe">
        <Select id="group" name="group" defaultValue={query.group ?? ""}>
          <option value="">Alle</option>
          {AGENT_CATEGORY_GROUPS.map((group) => (
            <option key={group} value={group}>
              {GROUP_LABELS[group]}
            </option>
          ))}
        </Select>
      </Field>

      <Field id="category" label="Kategorie">
        <Select id="category" name="category" defaultValue={query.category ?? ""}>
          <option value="">Alle</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </Select>
      </Field>

      <Field id="tier" label="Stufe">
        <Select id="tier" name="tier" defaultValue={query.tier ?? ""}>
          <option value="">Alle</option>
          {AGENT_TIERS.map((tier) => (
            <option key={tier} value={tier}>
              {TIER_LABELS[tier]}
            </option>
          ))}
        </Select>
      </Field>

      <Field id="sort" label="Sortierung">
        <Select id="sort" name="sort" defaultValue={query.sort}>
          {AGENT_SORTS.map((sort) => (
            <option key={sort} value={sort}>
              {SORT_LABELS[sort]}
            </option>
          ))}
        </Select>
      </Field>

      <div className="flex items-end">
        <Button type="submit" className="w-full">
          Anwenden
        </Button>
      </div>
    </form>
  );
}
