# ADR 0001: Exceção temporária para o advisory upstream `GHSA-86w9-cpqp-85rv` (`node-forge`)

- **Data:** 2026-10-25 (Encerrado em 2026-10-27)
- **Status:** Superado / Removido (Corrigido upstream em `node-forge@1.4.1`)
- **Regra afetada:** §3 (Gate G11 — `audit:check`) e §9 da [`.agents/CONSTITUTION.md`](../../.agents/CONSTITUTION.md)

## Contexto e Motivo Técnico

O pacote `nuxt@4.6.2` dependia transitivamente de `nitropack` → `listhen@1.10.1` → `node-forge@1.4.0`.
O advisory [`GHSA-86w9-cpqp-85rv`](https://github.com/advisories/GHSA-86w9-cpqp-85rv) (severidade `high`: _node-forge RSA PKCS#1 v1.5 signature verification accepts extra nested DigestAlgorithm elements_) afetava as versões até `1.4.0`, não existindo versão corrigida disponível upstream na data de criação deste ADR.

## Resolução e Remoção da Exceção (2026-10-27)

- Em **2026-10-27**, o pacote `node-forge@1.4.1` foi publicado no NPM corrigindo o advisory `GHSA-86w9-cpqp-85rv`.
- O `package-lock.json` foi atualizado para `node-forge@1.4.1` via `npm audit fix`, zerando todas as vulnerabilidades reportadas pelo `npm audit` (`found 0 vulnerabilities`).
- Conforme previsto na seção de prazo deste ADR, a exceção e o filtro de advisory em `scripts/audit-check.mjs` foram integralmente removidos, mantendo o bloqueio estrito de qualquer vulnerabilidade `high` ou `critical`.
