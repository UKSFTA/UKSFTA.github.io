# United Kingdom Special Forces (UKSF) Digital Presence - Agent Guide

This document provides the foundational blueprint and operational mandates for developing a professional, operationally authentic web presence for Taskforce Alpha (TFA), an unofficial Arma 3 Milsim community inspired by the UKSF.

## 1. Project Vision

The project synthesizes official UKSF aesthetics with community-driven milsim operations. The goal is to project the heritage and technological sophistication of the Special Forces within a simulation environment while maintaining clear boundaries regarding its unofficial status.

## 2. Branding & Design Standards

All development must strictly follow these community rules to maintain immersion:

* **The Superior Rule:** Taskforce Alpha branding and logos must be placed at the top of the page with mandatory exclusion zones, mirroring the MOD layout.
* **Typography:**
  * **Headers/Slogans:** *Industrial Gothic Pro Single Line* (Bold, condensed, high-impact).
  * **Body/Navigation:** *Effra* (Standard: Light/Medium, size 19px). Fallback to Arial for institutional clarity.
* **Color Palette:**
  * **TFA Primary:** `#b3995d` (Primary brand element).
  * **Institutional Grey:** `#323e48` (Footers and secondary depth).
* **Legal:** Include mandatory "Unofficial / Milsim Community" and "Not affiliated with the UK Ministry of Defence" disclaimers.

## 3. Regimental Identities (Skins)

The theme dynamically adjusts the UI based on the active unit section:

| Unit | Primary Color | Visual Focus |
| :--- | :--- | :--- |
| **SAS** | Army Green (`#153e35`) | Direct Action and Counter-Terrorism simulation. |
| **SBS** | Navy Blue (`#000033`) | Maritime and amphibious warfare simulation. |
| **SRR** | Emerald Grey (`#507255`) | ISTAR, surveillance, and intelligence gathering. |
| **SFSG** | Olive/Black/Red | Logistics, heavy support, and Phase 1 entry. |
| **JSFAW** | Royal Blue (`#000080`) | Specialized aviation and insertion training. |

## 4. Technical Architecture
* **Framework:** Hugo (Extended version).
* **Asset Pipeline:** Tailwind CSS v4, PostCSS, and ES Modules.
* **Layout:** Modular, block-based design optimized for community recruitment.

## 5. Operational Mandates (Rules)

**CRITICAL: No exceptions.**
* **GPG Signing:** ALL commits MUST be GPG signed (`git commit -S`).
* **Security:** Follow strict OPSEC—never use real names or sensitive personal data. Focus on simulation identities.
* **Non-Affiliation:** Ensure the footer and header clearly distinguish TFA from the real MOD.

## 6. Execution
* **Run Development:** `npm start` (Runs the `exampleSite`).
* **Build:** `npm run build`.
