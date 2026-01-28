# United Kingdom Special Forces (UKSF) Digital Presence - Agent Guide

This document provides the foundational blueprint and operational mandates for developing a professional, operationally authentic web presence for the UKSF, adhering to Ministry of Defence (MOD) and regimental standards.

## 1. Project Vision
The project synthesizes official MOD branding with elite military aesthetics. The goal is to project institutional authority and technological sophistication while maintaining the distinct identities of the SAS, SBS, SRR, SFSG, and JSFAW.

## 2. Branding & Design Standards
All development must strictly follow these institutional rules to maintain realism:

*   **The Superior Rule:** Official MOD branding and logos (including the Royal Coat of Arms) must be placed at the top of the page with mandatory exclusion zones.
*   **Typography:**
    - **Headers/Slogans:** *Industrial Gothic Pro Single Line* (Bold, condensed, high-impact).
    - **Body/Navigation:** *Effra* (Standard: Light/Medium, size 19px). Fallback to Arial for institutional clarity.
*   **Color Palette:**
    - **Master MOD Purple:** `#532a45` (Primary brand element).
    - **Institutional Grey:** `#323e48` (Footers and secondary depth).
*   **Legal:** Include "Reproduced with permission of the UK MOD" and "© Crown Copyright" attributions.

## 3. Regimental Identities (Skins)
The theme dynamically adjusts the UI based on the active unit section:

| Unit | Primary Color | Visual Focus |
| :--- | :--- | :--- |
| **SAS** | Army Green (`#153e35`) | Readiness and high-impact infantry themes. |
| **SBS** | Navy Blue (`#000033`) | Maritime operations and atmospheric lighting. |
| **SRR** | Emerald Grey (`#507255`) | ISTAR focus, night-vision aesthetics, and grid overlays. |
| **SFSG** | Olive/Black/Red | Quick Reaction Force (QRF) action-oriented layouts. |
| **JSFAW** | Royal Blue (`#000080`) | Aerial insertion and transport focus. |

## 4. Technical Architecture
- **Framework:** Hugo (Extended version for SCSS processing).
- **Theme Base:** Integrated with the **MOD.UK Frontend** library via NPM.
- **Layout:** Modular, block-based design (e.g., "Modernisation," "Readiness," "People").
- **Asset Pipeline:** SCSS via Hugo Pipes; components managed via `node_modules`.

## 5. Operational Mandates (Rules)
**CRITICAL: No exceptions.**
- **GPG Signing:** ALL commits MUST be GPG signed (`git commit -S`).
- **Security:** Follow strict OPSEC—obscure personnel identities and use vague locations. Integrate CodeQL scanning.
- **Performance:** Maintain Lighthouse scores >90 for Performance, Accessibility (WCAG 2.2 AA), and SEO.

## 6. Execution
- **Run Development:** `npm start` (Runs the `exampleSite` with the theme).
- **Build:** `npm run build`.