# UKSF Joint Special Forces Portal - Master Implementation Authority

**Strategic Vision:** To deploy a professional-grade, mobile-responsive, and data-driven web infrastructure that simulates the clandestine operations of the United Kingdom Special Forces (UKSF) Directorate. Managed by the 18 (UKSF) Signal Regiment and E-Squadron.

---

## 1. Technical Reference & Sources

### 1.1 Design System & UI Components
*   **[@moduk/frontend](https://www.npmjs.com/package/@moduk/frontend):** Primary Design System. Provides accessible components (Accordions, Tabs, Banners) and MOD design tokens. Used to ensure WCAG 2.1 Level AA compliance.
*   **[govukhugo Theme](https://github.com/alphagov/govukhugo):** Integrated as a Git Submodule. Bridges GDS/MOD systems with the Hugo engine, providing base layouts for dashboards.
*   **Block-based Layout System:** Utilizes Hugo’s `block` keyword (e.g., `{{ block "main" . }}`) in `baseof.html`. This allows for a modular architecture where child templates implement specific UI "blocks" while maintaining global consistency.
*   **Effra & GDS Transport Fonts:** Establishes the government/military aesthetic. **Effra** is the specific doctrinal fallback for unit-specific (SAS/SBS) branding.

### 1.2 Site Engine & Knowledge Management
*   **[Hugo Extended](https://gohugo.io/):** The core SSG. Compiles Sass via Dart Sass and manages the deep content hierarchy through Page Bundles.
*   **[Decap CMS (formerly Netlify CMS)](https://decapcms.org/):** Professional Headless CMS used as an administrative bridge to edit `roster.json`, `campaigns.json`, and Markdown files without direct Git access. Commits changes directly back to the repository.
*   **[Obsidian.md](https://obsidian.md/):** Drafting tool utilizing YAML front matter and Page Bundles. Supports an internal wiki feel through `[[Wikilinks]]`.
*   **Metadata Dataview Engine:** Custom Hugo logic using `where` and `range` functions to dynamically list content (e.g., listing all AARs for a specific campaign) based on JSON and front matter metadata.

### 1.3 Data Synchronization & External APIs
*   **[discord.js](https://discord.js.org/):** Automates unit personnel management via a Node.js bot (v14+) running under PM2.
*   **[Steam Web API (IGameServersService)](https://partner.steamgames.com/doc/webapi/igameserversservice):** Retrieves live player counts and server status via `GetServerList`.
*   **[Source RCON (A2S_INFO)](https://developer.valvesoftware.com/wiki/Server_queries):** Issues low-level queries for byte-encoded real-time server intelligence (player list, map, server name).
*   **[Battlemetrics API](https://www.battlemetrics.com/developers):** Retrieves historical server activity data via OAuth 2.0 Bearer tokens.
*   **[Chart.js](https://www.chartjs.org/):** Client-side charting library used to render dynamic Battlemetrics player activity and campaign statistics directly on the page.

### 1.4 Visualizations & Symbology
*   **[milsymbol.js](https://github.com/spatialillusions/milsymbol):** Renders NATO APP-6D / MIL-STD-2525D icons on the fly for authentic military symbology.
*   **[Arbor.js](https://github.com/samizdatco/arbor):** Force-directed layout physics engine for interactive unit hierarchy positioning on the HTML5 Canvas.

### 1.5 System Governance & CI/CD
*   **[Biome](https://biomejs.dev/):** Unified tooling for high-speed JS, CSS, JSON, and MD linting and formatting.
*   **[Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci):** Audits performance and accessibility. Specific gates for **Mobile Profile** rendering to ensure blocks fit perfectly on smaller screens.

---

## 2. Core Architectural Foundations

### 2.1 Configuration Strategy (`config.yaml`)
| Parameter | Configuration Value | Contextual Implementation |
| :--- | :--- | :--- |
| `govuk` | `false` | Disables official crown/font for licensing compliance. |
| `logotext` | `UKSF` | Unit acronym in capital letters for header branding. |
| `product` | `Joint Special Forces Portal` | Service name displayed in the header. |
| `phase` | `beta` | GOV.UK style phase banner for development status. |
| `unsafe` | `true` | Allows raw HTML/Canvas and Subresource Integrity (SRI) hashes. |
| `canonifyURLs`| `true` | Essential for asset resolution on static hosting. |

### 2.2 Portal Tier & Access Control
| Tier | Units/Sections | Visibility/Gate |
| :--- | :--- | :--- |
| **Public Portal** | SAS, SBS, ASOB (Ranger Regt), SFSG, JAC, RAMC | Standard Navigation |
| **Hidden RSIS** | SRR, 18 Signals, E-Squadron, Intelligence Silos | Gated by CTF Challenge |
| **Admin RSIS** | All Documentation, ORBAT Editing, Analytics | Discord/Steam OAuth + Decap CMS |

### 2.3 Brand Identity & Palettes (Sass Tokens)
- **Primary Brand:** `$moduk-brand-colour` (#532a45) - Header and primary branding.
- **SBS/Navy:** `dark-blue` (#13284c) - Navigation for maritime sections.
- **SAS/Army:** `dark-green` (#153e35) - Army-specific branding.
- **Muted Grey:** `#7b98ac` - Secondary buttons and non-critical data headers.
- **Warning:** `#ff8200` - Critical alerts (OPORDs) or denied access states.
- **Success:** `#00ce7d` - Mission filing success or confirmed logins.

---

## 3. Hyper-Granular Implementation Roadmap

### 🟥 Phase 1: Core Infrastructure & Build Pipeline
- [x] **Project Scaffolding & Environment**
    - [x] Initialize Hugo site with `govukhugo` theme as a git submodule.
    - [x] Create `package.json` for Node-based dependency management.
    - [x] Verify `node` (v22+) and `npm` (v11+) environment availability.
- [x] **Asset Management & Branding**
    - [x] Create `assets/sass/main.scss` for site-wide style entry.
    - [x] Create `assets/sass/brand/_palette.scss` with MOD hex variables.
    - [x] Configure Sass to compile variables rather than static hex codes.
    - [x] Set primary `$moduk-brand-colour` to `#532a45`.
    - [x] Implement fallback font stack: GDS Transport -> Effra -> Arial.
    - [x] Configure Hugo to utilize Dart Sass for build-time compilation.
- [x] **Block Architecture Implementation**
    - [x] Create `layouts/_partials/blocks/` directory for reusable UI components (Graphs, Duty Desk).
    - [x] Define global placeholders in `baseof.html` for header, main, and scripts using Hugo `block` keyword.
    - [x] Ensure all "blocks" are mobile-responsive and fit the Lighthouse Mobile profile perfectly.
- [x] **MOD Design System Components**
    - [x] Implement `govuk-accordion` for training phase organization (SFC Course).
    - [x] Ensure `govuk-accordion__section-header` keyboard accessibility.
    - [x] Implement Notification Banners (Purple for info, Green for success).
    - [x] Implement Breadcrumbs for deep RSIS directory tree navigation.
    - [x] Implement Character Count for AAR/Intel filing constraints.
- [x] **Security & Integrity**
    - [x] **Implement Subresource Integrity (SRI) hashing** for dynamic JS strings to ensure security.
- [x] **CI/CD Pipeline Construction**
    - [x] Setup `.github/workflows/hugo.yaml` with Hugo/Node build steps.
    - [x] **Enforce Mandatory GPG Signature Verification** on all build triggers.
    - [x] Integrate Biome for JS, CSS, JSON, and MD linting/formatting.
    - [x] **Configure Biome to specifically exclude** `themes/govukhugo` to prevent upstream errors.
    - [x] Integrate Lighthouse CI with **mandatory "Mobile" profile auditing** (Target >90 Score).
- [x] **Data Integration Scaffolding**
    - [x] Implement Node.js `scripts/fetch-external-data.js` (replacing legacy Python).
    - [x] Configure fetcher to output validated data to `data/external.json`.

### 🟦 Phase 2: Content Architecture (The Directorate)
- [x] **Branch Silos & Portal Segregation**
    - [x] Create Public silos: `sas/`, `sbs/`, `asob/` (Ranger Regt), `sfsg/`, `jac/`, `ramc/`.
    - [x] Create Hidden silos **under `content/rsis/`**: `srr/`, `18sigs/`, `e-sqn/`.
    - [x] Configure `govukhugo` sidebar to **exclude gated units** from public navigation.
    - [x] Create `content/personnel/` directory for individual service records.
- [x] **Knowledge Management (KM) & Obsidian Strategy**
    - [x] Implement Page Bundle architecture (modular directory per document).
    - [x] Create `_index.md` files at every level of the hierarchy for tree discovery.
    - [x] Implement `layouts/_default/_markup/render-link.html` for Obsidian `[[Wikilink]]` support.
    - [ ] **Define standard YAML front matter schema** for mission-critical metadata.
    - [ ] **Metadata Dataview Engine:** Implement Hugo `where`/`range` templates to list AARs by Campaign ID.
- [x] **Data Placeholders & Source of Truth**
    - [x] Initialize `data/campaigns.json` as a placeholder for Unit Commander replacement data.
    - [x] Initialize `data/server_stats.json` for live player counts.
    - [x] Initialize `data/roster.json` as the central repository for personnel.
    - [x] Define Roster Schema: Rank, Callsign (C1-1, R2-1), and Discord ID.

### 🟪 Phase 3: RSIS Portal & Security Gateway
- [x] **CTF Gateway Persistence**
    - [x] **Persistence Implementation:** Successful flag entry sets `sessionToken` in `localStorage`.
    - [x] **Security Gate:** Implement **blocking script in `<head>`** to verify token before rendering RSIS child content.
- [x] **GCHQ-Style CTF Tiers (Security-by-Challenge)**
    - [x] **Tier 1 (Inspection):** Flag hidden in HTML comments (`UKSF{V1SUAL_C0NF1RM4T10N}`).
    - [x] **Tier 2 (Obfuscation):** ROT13/Base64 challenge in `robots.txt` or headers.
    - [x] **Tier 3 (Exploitation):** Mock SQL Injection (' OR 1=1--) login bypass logic.
    - [x] **Tier 4 (Metadata):** User-Agent (google-bot) and Cookie (`user=root`) spoofing gating.
- [x] **Administrative Bridge**
    - [x] **Integrate Decap CMS** for non-technical editing of unit ORBAT and intelligence briefs.
    - [x] **Configure CMS collections** for Unit Ranks and Operational Reports.
    - [ ] Secure administrative access via Discord OAuth login tiers.
    - [x] **Build the web-based "Duty Desk" dashboard** using modular blocks for server telemetry.

### 🟧 Phase 4: Dynamic Integrations & ORBAT Engine
- [x] **Unit Commander API Integration**
    - [x] Developed `scripts/fetch-external-data.js` to pull live data from `api.unitcommander.co.uk`.
    - [x] **Fetched Resources:** Ranks, Awards, Campaigns, Member Profiles, and Events.
    - [x] **Homepage:** Implemented dynamic "Live Operations" and "Operational Schedule" blocks.
    - [x] **Personnel:** Created dynamic `personnel_list` manifest pulling from live profiles.
- [x] **Geospatial Intelligence (GEOINT)**
    - [x] Integrated `plan-ops.fr` Atlas maps via custom `{{< atlas >}}` shortcode.
    - [x] Developed `/rsis/atlas/` portal hub with tabbed AO selection (Altis, Malden, Tanoa, Livonia).
    - [x] Styled map containers with SIGINT tactical borders and HUD overlays.
- [x] **ORBAT Engine**
    - [x] **Implement orbat-engine.js** using HTML5 Canvas API with dynamic `orbat.json` fetching.
    - [x] **Integrate milsymbol.js** for authentic NATO APP-6D symbology.
    - [x] **Automated Layout:** Implemented recursive tree positioning for unit hierarchy.
- [x] **18 Sig Discord Bot (discord.js)**
    - [x] Developed `bot/sync-roster.js` to reconcile Discord roles with `roster.json`.
    - [x] Implemented `bot/index.js` persistent bot with Slash Command support.
    - [x] **Dynamic /dossier:** Now pulls live service records from Unit Commander profiles.
    - [x] **Commands:** `/award`, `/promotion`, `/attendance`, `/op create` (interactive).
    - [x] **Process Management:** Configured `concurrently` for development and `PM2` for production.
- [x] **MOD Branding & Homepage**
    - [x] Injected MOD palette into `dashboard-layout.css`.
    - [x] Implemented Tactical Hero section and slanted Service Card grid.
- [x] **RSIS Terminal Mode**
    - [x] Implemented `terminal-mode` CSS for SIGINT aesthetic.
    - [x] Configured `baseof.html` to toggle terminal mode for the `rsis` section.
- [x] **Mobile Audit & Optimization**
    - [x] Ensured `mobile-nav.html` respects restricted access logic.
    - [x] Verified responsive grid collapse on mobile profiles.

### 🟩 Phase 5: Advanced Capability & Statistics
- [ ] **Operational Evolution**
    - [ ] Integrate `{govukhugo}` R package for advanced statistical resource trend analysis.
    - [ ] Transition RSIS to a Headless CMS UI for non-technical intelligence drafting.
    - [ ] Develop React Native companion app using MOD Design System tokens.

---

## 4. Maintenance & Governance Protocol

| Aspect | Technical Requirement | Frequency |
| :--- | :--- | :--- |
| **Mobile Audit** | Lighthouse CI (Mobile Profile Score >90) | Every Build |
| **Link Integrity** | Obsidian Wikilink Parsing Check | Weekly |
| **Code Hygiene** | Biome (Lint/Format/Analyze) | Every Commit |
| **Commit Audit** | Mandatory GPG Signing (-S flag) | Every Commit |
| **Roster Reconciliation** | 18 Sig Bot Sync & Decap CMS Audit | Real-time |
| **Security Audit** | SRI Hashing & JWT/Token Rotation | Monthly |

*Note: This document is the master technical reference for the UKSF Directorate. All development must align with the professional aesthetic and doctrinal context of the UKSF Directorate.*