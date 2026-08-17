# Bag of Homebrew — Roadmap

A TTRPG inventory, character, and campaign manager. Built D&D-first (the
familiar case), but designed **generic underneath with D&D-flavoured defaults
on top** so other systems can be supported without rework.

Guiding principle for every feature: *don't build "a D&D tool that might
support other systems" — build a generic TTRPG tool that ships pre-configured
for D&D.* Enums where a sensible fixed set exists; freeform strings/JSON where
systems diverge; D&D defaults so the common case is convenient.

---

## Status: v1 (built)

Core application, functional end to end:

- **Characters** — create / rename / delete, portrait, PDF sheet viewer,
  manual AC, health (current / max / temp, player-managed), currency
  (5 coin types + conversion view).
- **Items** — create with category / rarity / plot flag / homebrew description /
  properties (JSON) / image / consumable quantity. Rarity frames, parchment
  stat-block detail panel.
- **Equipment** — 14 slots, two-handed / versatile handling, drag-and-drop.
- **Dragon's Vault** — personal storage, send items to characters, return to vault.
- **Campaign mode** — create (paid) / join by code / delete (GM) / leave (player);
  shared campaign vault (GM-managed); view other members (read-only, server-enforced);
  GM distributes vault loot to players; players return items to campaign vault;
  player-to-player gifting with pending accept / reject.
- **Tiers** — free = 1 character, 50 items combined across character + vault;
  paid = unlimited characters / items / campaign hosting. Enforced server-side
  on create, gift-accept, and GM-send. Usage indicator with upgrade tooltip.
- **Toasts** — reusable transient feedback.
- **Routing** — react-router; view + campaign tab persist across refresh.

---

## Pre-launch: deployment + hardening (do first)

Not features — the gap between "works locally" and "works for users."

- [ ] **Remove / hard-gate the `dev/login-as` endpoint.** Critical security hole
      ("log in as anyone"). Must not reach production.
- [ ] Centralise `API_BASE` into one config module; switch dev/prod via env var.
- [ ] API serves the built frontend (chosen deploy shape: 2 services — app + Postgres).
- [ ] SPA fallback in the API so react-router deep links survive refresh.
- [ ] Cookie / CORS simplification for same-origin production.
- [ ] Deploy to Railway (API + Postgres). Set a **usage/spend cap** immediately.
- [ ] Update Google OAuth redirect URIs to the production domain.
- [ ] End-to-end test on the deployed environment.
- [ ] (Later, optional) custom domain — free subdomain is fine to launch.

---

## v1 polish (small gaps in what's already built)

- [ ] Verify currency icons render (`fa-light` is Font Awesome **Pro**; swap to
      `fa-solid fa-coins` if on the free CDN).
- [ ] Dynamic vault grid size (free = fixed 50; paid = grows with headroom) —
      confirm applied everywhere.
- [ ] Audit all mutation handlers surface backend `BadRequest` messages (read
      `res.text()`), not generic errors.
- [ ] Confirm local-state components re-sync on prop change (health / AC pattern)
      wherever a component holds an editable copy.

---

## The unifying architecture: the Resource–Ability engine

Most future features (spells, class/race abilities, and arguably health / currency)
are facets of **one primitive**. Building this well is the backbone of the roadmap.

**Resources (pools)** are first-class entities: a named tracker with current / max,
using the existing stepper + bulk-modal pattern (same as health / currency).

**Abilities** (spells, class features, etc.):
- Always have: name, description / flavour, a source / group label (freeform).
- Optionally link to a **pool** with a **cost** (defaults to 1, tooltip explains why).
- Resource choice on creation: **none** (passive) / **own** (private pool) /
  **link to existing pool** (shared).
- **Linking is automatic via shared reference** — two abilities pointing at the
  same pool are linked; no separate "link" action.
- **Use / cast** = decrement the linked pool by the cost (disable when unaffordable).
- **Rest** = the inverse; restores pools (all, or by rest-type later).

**Display rule (auto, by reference count):**
- Pool shared by 2+ abilities → shown prominently at the top of the page
  (like health / AC / currency bars).
- Pool used by exactly 1 ability → shown inline on that ability.
- Passive abilities → just text.

**Presentations (same engine, different views):**
- **Spellbook** — abilities grouped by **tier**; each tier has its pool;
  toggle between per-tier pools (D&D slots) and one overall pool (mana / spell points).
- **Abilities** — abilities grouped by **source** (Class / Race / Feat / …);
  pools like Ki, Bardic Inspiration shared across abilities; solo pools inline.

Health, currency, spell slots, and ability uses are all the same resource
primitive. Rest is the cross-cutting action that restores them.

*Note:* unify the **engine**, not the **experience** — spells keep tier/slot UI,
abilities keep source-grouped/uses UI. Shared primitive, distinct presentations.

---

## The pages ("book") structure

A character is a book of pages (left-side tabs / page-flip feel). Nested routes
(`/character/:id/sheet`, `/spells`, `/abilities`, `/notes`). Add tabs when the
second page arrives (spellbook).

- **Character** — the sheet (stats, equipment, HP, AC, currency).
- **Inventory** — items (built).
- **Spellbook** — tier-grouped abilities on the resource engine.
- **Abilities** — source-grouped abilities on the resource engine.
- **Notes** — simple contextual notepad (below).

---

## Feature tiers (post-launch build order)

### Tier 1 — paid-tier anchors (build first)
- [ ] **Real-time sync (SignalR)** — live gifts, vault, roster. Flagship "premium"
      feel. Approach: invalidate-and-refetch, campaign-group hubs. (Deferred from v1.)
- [ ] **Visibility / permissions in campaigns** — GM controls what players see;
      players hide items; character-visibility toggles. GM-facing paid value.
      (Deferred from v1.) Also unlocks **shared campaign notes**.
- [ ] **PDF sheet uploads gated to paid** — trivial (viewing built); gating protects
      the one genuinely expensive-to-host resource.

### Tier 2 — high-value
- [ ] **Spellbook** — first use of the resource–ability engine. Tier grouping,
      per-tier vs overall pool toggle, cast / rest.
- [ ] **Abilities page** — class / race features on the same engine; none/own/shared
      pools; auto top-vs-inline display.
- [ ] **Rest** — modal restoring pools + health. Options: heal to full / roll
      (hit dice) / set amount; restore all pools. Short vs long rest later.
      (Depends on health ✓ + resource engine; "roll" richer once dice exist.)
- [ ] **Dice roller** — `2d6+3` style; can feed rest's "roll for healing" and combat.
- [ ] **Notes** — character-scoped. **Quests** (title, markdown, status
      Active/Done/Failed, optional objective checklist) + **notes** (title, markdown,
      light category: NPC / Location / Lore / General). Deliberately simple — compete
      on *context*, not on out-building World Anvil / Obsidian. No linking / wikis / maps.
- [ ] **Initiative tracker** — shared turn order the GM manages in-session;
      pairs with real-time. (Design TBD — expected to reuse existing patterns.)
- [ ] **Stats/attributes system**: configurable field groups populated by system presets (D&D / Pathfinder / Custom); direct-entry scores + proficiency toggles; a small fixed set of preset-baked derivations (modifier, skills,     saves,  spell save DC, spell attack bonus) so supported systems aren't tedious; casting-ability designation feeds spell derivations (surfaced on the spellbook page — no separate block needed); custom systems manual until a general formula engine (deferred) arrives; PDF upload retained as the fallback for unpreset systems. Replaces the PDF dropper as the default character-page content for supported systems.

### Tier 3 — content library & data portability
A cohesive "item/spell data management" set, all facets of one system.
- [ ] **Content library & templates** — `Source > Category > Item` tree.
      New `ItemTemplate` entity (additive; doesn't change `Item`). Template picker on
      creation (e.g. `D&D > Weapon > Longsword`); homebrew namespaced under creator
      (`Bob > Accessories > Necklace of Magic`). Same idea extends to spells.
- [ ] **Import** — JSON first (XML later only if asked). Maps to the Item/template
      schema; validate gracefully with useful errors; imports count against tier limit;
      cap file size, parse defensively.
- [ ] **Export** — mirror the import format; round-trips for editing / sharing.
- [ ] **Official templates** — seed with **SRD / OGL** content only.
- [ ] Bulk item operations; search / filter for large inventories; backup / export
      of a character or campaign.

### Tier 4 — ambitious / only if it grows
- [ ] Mobile-responsive / native app (use at the table).
- [ ] Broader multi-system support beyond D&D defaults.
- [ ] Public homebrew sharing / marketplace.

---

## Monetisation

- **Model:** recurring subscription. **One payment per group** — the paying GM
  hosts; invited players are free.
- **Price:** ~£4/month per GM, or ~£36/year. Break-even at 3–4 paying GMs.
- **Free tier (marketing, not charity):** bounded so worst-case cost is trivial and
  fixed. 1 campaign, 50-item limit (built), image uploads capped / **PDF uploads
  paid-only**. Free users cost near-nothing (compute barely scales with light users;
  storage is the thing that scales — so gate uploads).
- **Safety net:** Railway spend cap makes losing money structurally impossible.
- **Mechanism:** `IsPaid` flag, flipped by **Stripe** (subscription-native) via
  webhook on checkout / cancellation. Currently a manual DB flag.
- **Tier rule to decide:** free GM gets *one limited* campaign (better adoption,
  more build) vs hard paywall on hosting (simpler, current model). Leaning: one
  limited campaign.
- Cost reality: side-project scale ~£4–12/month hosting; treat early revenue as
  "pays for itself," not income. Audience, not price, is the real constraint.

---

## Legal prerequisites (before *public* content sharing ships)

*Not legal advice — consult an IP lawyer before monetising public sharing.*

- Personal inventory + private campaigns (current) have **no** public-content exposure.
- The liability question arrives with **public sharing / export of user content**
  (Tier 3+). Before that ships:
  - [ ] **Terms of Service / acceptable-use** — prohibit uploading copyrighted content
        without rights; place responsibility on the user.
  - [ ] **Takedown / report mechanism** — build into sharing from the start; remove
        reported content promptly (safe-harbor / hosting-defence pattern).
  - [ ] Keep **official** content strictly **SRD / OGL**; user uploads are their
        responsibility under the ToS.
  - [ ] One-hour **IP lawyer consult** specifically on public user-content sharing.
- Generic category terms ("Evocation") and game *mechanics* (levels, slot systems)
  are generally not copyrightable — low concern. Specific spell/item *text* is.

---

## Design notes worth preserving

- **Generic underneath, D&D defaults on top** — the whole philosophy. Applied to
  items (properties JSON), spells (tiers/pools), abilities (freeform source labels),
  resources (named pools).
- **One resource–ability engine** powers spells, features, health, currency —
  presented as familiar D&D UIs so the common case never feels generic.
- **Pools are entities; abilities reference them; shared reference = linked.**
  Display location follows reference count (shared → top, solo → inline).
- **Compete on context, not features** for notes (and generally) — the value is
  being *attached to* the character / campaign, not out-building dedicated tools.
- **Ship generic-capable, default-D&D** rather than choosing between them.
