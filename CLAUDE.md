# BilboTrans

App Next.js 16 (App Router) + React 19 + Tailwind 4 de transporte en Bizkaia. **Foco actual: Metro Bilbao** (los demás modos están ocultos por flag).

- Plan y estado: `PLAN.md`
- Sistema de diseño: `DESIGN_SYSTEM.md`
- Skill de proyecto (diseño + regla de sentidos/andenes): `.claude/skills/bilbotrans-design/SKILL.md`

Comandos: `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm test` (direction), `pnpm sync:metro` (regenera `src/data/metro/catalog.json`).

Reglas clave: los componentes no llaman a la API de Metro directamente (usar `src/lib/metro/hooks.ts`); el sentido de los trenes se calcula solo con `groupByDirection`.
