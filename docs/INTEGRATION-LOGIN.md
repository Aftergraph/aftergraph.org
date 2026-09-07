# INTEGRATION-LOGIN — Login portal design (Studio auth → Tier-2)

Date: 2026-09-07 · Owner: LOGIN team · Status: design for review
Scope: READ-ONLY design. The only file this team writes is this doc.
Context: Studio demo runs auth-less (Tier-0); Tier-2 needs real auth. Pieces were built separately; this doc joins them.

## 1. Current-state inventory (with file refs)

All paths relative to `workspace/aftergraph.org/`.

**Auth crypto (client-shipped, server-executed):**
- `site/studio-dist/src/auth/magic-link.mjs` — HMAC-SHA256 magic-link tokens (`v1.payload.sig`, 15-min default TTL, `timingSafeEqual` verify, `subjectFromAuthHeader` → 403 on bad/missing). NOTE: imports `node:crypto` — server-side module; ships in the static bundle source but only meaningful against a real backend.
- `site/studio-dist/src/auth/rate-limit.mjs` — fixed-window per-key limiter (`createRateLimiter`, default 10 hits/hour). **No call sites in client code** (verified by search): enforcement lives server-side, which Tier-0 deliberately excludes.
- `site/studio-dist/src/auth/ui-actions.mjs` — pure, testable flows over injected client: `requestAuthToken`, `signInWithToken` (authMe → readUser → setAuthToken), `signOut` (clears in-memory token), `inviteUser` (requires `user.manage` + capabilities).

**Login UI:**
- `site/studio-dist/packages/ui/trust/auth-panel.mjs` — `AGAuthPanel` (states `request` / `token`); emits `data-auth-action` events only, no fetching.
- `site/studio-dist/src/app/bootstrap.mjs` — login wiring: topbar profile button `data-action="open-auth"` (l.326), `renderAuthFocus()` modal overlay (l.564, mounted l.692), `handleAuthClick` (ll.764–797: request → token panel → signin → persist), session restore `restoreAuthSession()` (ll.752–763), `sign-out` case clears storage + reloads (l.809).
- Session token storage: `localStorage['aftergraph.auth.token']`, with memory fallback on opaque origins (l.76).

**Transport:**
- `site/studio-dist/src/api-client.mjs` — `Authorization: Bearer <token>` attached automatically when set (l.34); `authMe` sends one-shot header without persisting (l.96); mutating calls carry `idempotency-key` headers + body keys.
- `site/studio-dist/src/api-routes.mjs` — `apiAuthMagicLink()` (`POST /api/v1/auth/magic-link`), `apiAuthMe()` (`GET /api/v1/auth/me`).
- `site/studio-api-proxy.js` — Tier-1: GET-only allowlist, forwards `accept` only (no auth). Tier-2: `/healthz` + `/api/v1/*`, passes through exactly `authorization, content-type, accept, idempotency-key`; fail-closed tier default (`tier1`); never logs secrets/bodies/query.
- `site/studio-static.mjs` — Tier-0 static entry; `/api/*` and `/healthz` never SPA-fallback (client stays local).
- `site/studio-dist/src/runtime/backend-session.mjs` — backend session phases (`offline/resyncing/current/stale/degraded`); `setBackendPhase('current')` triggers `restoreAuthSession()` + outbox replay (`bootstrap.mjs` l.206–210).

**Demo / local mode:**
- `?demo=1` forces fixtures + separate storage key (`aftergraph-workspace-demo`); default `state.user` is `demo-user` with `capabilities:['*']` (`src/state.mjs` l.13). Sign-in UI is inert without backend (`'Sign-in needs server connection'`).
- `docs/STUDIO-LIVE-SPEC.md` — Tier-0 is static-only non-goal for backend/auth; build denylist strips `server/` from the bundle.

**Server-side pieces (NOT in this checkout — referenced, not verified):**
- Operator boot token, `REQUIRE_AUTH` enforcement, per-user isolation / fail-closed 403 — live in the studio repo's `src/auth/` + `server/app-server.mjs`, excluded from `studio-dist` by the build denylist. Treat all claims about them as unverified here.

## 2. Portal flow design

**Where login lives:** no separate login page. Login is a modal (`renderAuthFocus` + `AGAuthPanel`) opened from the topbar profile button, available on every Studio surface. Rationale: demo-first product — auth must never block the Tier-0 demo shell; it escalates only when a backend is present.

**First visit (no token):**
1. Shell boots local/demo (`demo-user`, full local capabilities).
2. `connectBackend()` probes `GET /healthz` via `apiClient.detect()`. No backend → stays local; auth button opens panel but `request`/`signin` toast "needs server connection".
3. Backend present → session phase `current` → `restoreAuthSession()` finds nothing → user stays local until they open auth and request a token: enter user ID → `POST /api/v1/auth/magic-link` → token panel ("Tokens expire after 15 minutes") → Sign in → `GET /api/v1/auth/me` + `GET /api/v1/users/:id` → token persisted to `localStorage`, `state.user` replaced by server identity + capabilities.

**Returning visit (token saved):** on reaching phase `current`, `restoreAuthSession()` replays `signInWithToken(saved)` silently → toast `Signed in as <id>`. Any failure (expired/bad signature per `verifyMagicToken`: `missing/malformed/bad_signature/expired` → 403) deletes the stored token and stays local — never a boot loop, never a hard gate.

**Tier-0 → Tier-2 escalation:** purely connection-driven, no mode flag in UI. `data-backend-state="local|connected"` on the shell drives copy ("Server-backed" vs "Local reference"). Auth-gated actions (invite, kill-switch, memory promote, upstream sync) already branch on `backendConnected`. Operator flow: deploy Tier-2 proxy (`STUDIO_API_TIER=tier2`, `BACKEND_URL` set) → client `detect()` succeeds → login becomes live with zero client changes.

**Sign-out:** `signOut()` clears in-memory token + removes `aftergraph.auth.token` + full reload (fresh fixtures/state, no ghost identity). Server-side revocation is a non-goal (tokens are short-lived HMAC, no revocation list in current design).

**Session expiry:** tokens carry `exp` (15 min). Expiry surfaces lazily: next `authMe`/restore or next authenticated call 403s → client should (MUST-before-live, see §4) catch 403 on any call, clear stored token, toast "Session expired — sign in again", reopen auth panel. No silent re-issue; user repeats request→signin (one extra click by design, keeps issuance capability-gated).

## 3. Security notes

- **No secrets in edge code:** `studio-api-proxy.js` holds zero credentials — `BACKEND_URL` is a plain var, no signing secret, no token minting. The HMAC secret (`AFTERGRAPH_AUTH_SECRET`) lives only in the backend (`authSecretFromEnv`); the committed fallback `'aftergraph-dev-secret-change-in-production'` + `isDevSecret()` MUST trip a fail-closed boot error in any Tier-2 deploy (MUST-before-live).
- **What travels in headers:** Tier-2 allowlist is exactly `authorization` (Bearer magic token), `content-type`, `accept`, `idempotency-key` — CORS mirrors the same set. Nothing else is forwarded; Tier-1 forwards `accept` only. Bodies ride `POST /api/v1/auth/magic-link` (`{actor, userId}`) — never in query strings; proxy never logs headers/bodies/query.
- **Rate-limit enforcement points (designed, server-side):** `createRateLimiter` (10/hour default) must wrap, at minimum: `POST /api/v1/auth/magic-link` keyed by (requesting IP + target userId) — blocks token-spray; `GET /api/v1/auth/me` keyed by presented token/IP — blocks oracle guessing; and ideally auth-failure 403s generally. Client has no limiter and must not (single-process `Map` would be per-tab theater). NOTE: limiter is single-process memory scope — a multi-instance Tier-2 needs a shared store (see Decisions).
- **Isolation posture (per brief, server-side):** `REQUIRE_AUTH` on + per-user isolation with fail-closed 403. Client already degrades to local on any 403-shaped failure; it must never fall back to `demo-user ['*']` authority against a connected backend (see §4).

## 4. What MUST exist before Tier-2 goes live

1. `REQUIRE_AUTH=true` enforced by backend on all `/api/v1/*` mutations (reads per Tier-1 allowlist policy); unauthenticated → 403, never 200-with-fixtures.
2. Production `AFTERGRAPH_AUTH_SECRET` set; boot refuses dev default (`isDevSecret` → crash, not warn).
3. Rate limiter wired on magic-link issuance + auth/me (and 429 with `Retry-After` surfaces as panel error, not silent fail).
4. Client 403-expiry handler: any authenticated call 403 → clear token, toast, reopen auth (currently only restore path clears; mid-session expiry during a connected session has no handler — gap).
5. Operator bootstrap story: first-user creation via boot token documented; `inviteUser` requires existing `user.manage` holder — chicken-and-egg must be closed before launch.
6. Tier-2 proxy deployed with `STUDIO_API_TIER=tier2` + `BACKEND_URL`; smoke: Tier-1 GET allowlist OK, Tier-1 POST → 405, non-allowlisted Tier-1 → 403, Tier-2 without `Authorization` on mutations → backend 403 (proxy passes through, does not invent auth).
7. `?demo=1` storage-key separation re-verified against Tier-2 (demo token must never leak into operator key and vice versa).

## 5. Decision-needed

1. **Token TTL:** keep 15 min (current) or extend to e.g. 8 h for operators? Short TTL + no refresh is safest but chatty. Decision: TTL value + whether a sliding refresh endpoint is in scope.
2. **Rate-limit store:** single-process `Map` is fine for one backend instance; who owns the shared store (KV/Durable Object/Redis) if Tier-2 scales horizontally?
3. **First-operator bootstrap:** boot-token flag vs out-of-band provisioning? Who holds the boot token and when is it disabled?
4. **403 UX:** auto-reopen auth panel on mid-session expiry (proposed) vs passive toast? Confirm no auto-retry of the failed mutation after re-auth (outbox keys make retry safe, but user confirmation preferred for approvals).
5. **Tier-1 auth:** confirm Tier-1 stays fully unauthenticated reads, or does `/api/v1/state` need auth once Tier-2 is live (snapshot may leak operator state)?
6. **Revocation:** accept no-revocation (15-min self-expiry) for v1, or require a deny-list for operator offboarding before go-live?
