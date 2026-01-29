# UKSF MOD-Hugo Theme

A professional, high-fidelity Hugo theme for the United Kingdom Special Forces (UKSF) digital presence, built to Ministry of Defence (MOD) and Government Digital Service (GDS) standards.

## Features

- **Institutional Branding:** Adheres to the MOD "Superior Rule" and HMG identity guidelines.
- **Dynamic Regimental Skinning:** Automatic UI adjustment for SAS, SBS, SRR, SFSG, and JSFAW sections.
- **MOD.UK Frontend Integration:** Utilizes official GOV.UK/MOD.UK design system components.
- **Modular Hub Layout:** Responsive, block-based design optimized for recruitment and operational awareness.

## Prerequisites

- **Hugo Extended:** Version 0.154.0 or higher.
- **Node.js:** To manage MOD.UK frontend assets.

## Quick Start

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm start
   ```

3. Preview the site at `http://localhost:1313`.

## Architecture

- `assets/scss/`: Core styles and regimental overrides.
- `layouts/`: MOD-compliant HTML structure.
- `exampleSite/`: Sample content and configuration for testing.

## Security & Governance

- **OPSEC:** All content must obscure personnel identities and specific operational locations.
- **Integrity:** All commits must be GPG signed.
- **Compliance:** Target WCAG 2.2 AA accessibility.

---
*Reproduced with permission of the UK MOD. All operational data is simulated.*
