# United Kingdom Special Forces (UKSF) Digital Presence - Agent Guide

This document serves as a foundational blueprint and operational guide for the development of a professional, realistic, and operationally authentic web presence for the UKSF.

## 1. Project Vision
The establishment of a digital presence for the UKSF requires a rigorous synthesis of established Ministry of Defence (MOD) branding, high-performance aesthetics of elite military units, and the technical requirements of modern static site generation. By leveraging the MOD.UK Design System and integrating specific branch identities—SAS, SBS, SRR, SFSG, and JSFAW—this framework ensures that the resulting digital products project an image of institutional authority, technological sophistication, and elite readiness.

## 2. Design Principles
The project aims to replicate the "Modernity, Excitement, and Unity" found in modern British Army, Royal Navy, and RAF websites.

| Design Principle | Objective | Digital Manifestation |
| :--- | :--- | :--- |
| **Modernity** | Refined, future-proof layout | Sleek typography, subtle textures, and restrained color use. |
| **Excitement** | Target recruit engagement | Micro-animations, immersive video, and interactive role finders. |
| **Unity** | Accessibility and inclusivity | WCAG 2.2 AA compliance and consistent navigation. |

## 3. Branch-Specific Archetypes
The theme must support distinct visual identities ("skins") for each unit:

*   **SAS (Special Air Service):** Army Green, Red accents. Focus on Combat and Counter-Terrorism.
*   **SBS (Special Boat Service):** Navy Blue, Maritime tones. Focus on Amphibious warfare.
*   **SFSG (Special Forces Support Group):** Olive Green, Red/Black Flash. High-readiness Quick Reaction Force (QRF) aesthetic.
*   **JSFAW (Joint Special Forces Aviation Wing):** Royal Blue, Eagle/Crown. Focus on Insertion and Air Support.
*   **SRR (Special Reconnaissance Regiment):** Emerald Grey, Midnight Blue. Focus on ISTAR and SIGINT, using tech-centric, infrared/night-vision aesthetics.

## 4. Technical Architecture
- **Framework:** Hugo (Static Site Generator).
- **Theme:** `uksf-mod-theme`.
- **Typography:** Industrial Gothic Pro Single Line (for recruitment headlines).
- **Directory Structure:**
    - `content/<unit>/` for unit-specific content.
    - `assets/scss/skins/` for unit-specific Sass mixins.
- **Color Palette:**
    - `$moduk-brand-purple`: `#532a45` (Master MOD brand)
    - `$sfsg-olive`: `#556b2f`
    - `$jsfaw-blue`: `#000080`
    - `$srr-emerald-grey`: `#507255`

## 5. Operational Mandates (Rules)
**CRITICAL: Strictly adhere to these rules.**
- **GPG Signing:** ALL commits MUST be GPG signed (`git commit -S`). No exceptions.
- **Security:** 
    - Integrate automated CodeQL security scans.
    - Follow strict OPSEC rules—obscure personnel identities and use vague locations.
- **CI/CD:** Use Lighthouse CI for performance, SEO, and accessibility audits.
- **Git History:** Maintain a linear git history.

## 6. AI Interaction Guide
- **Tone:** Professional, direct, "military-grade" precision.
- **Context:** Assume "digital-first" military interface requirements.
- **Configuration:** Check `hugo.toml` or `config.yaml` for project settings.
- **Tools:** Use `gh` CLI for issue management and monitoring workflow health.
