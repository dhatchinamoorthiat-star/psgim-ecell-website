# ADR-008 — Backend Hosting

- **Status:** ACCEPTED (architecture) — account creation and spend approval pending (see `PHASE_1_AUTHORIZATION.md`, N-1)
- **Date:** 2026-09-25
- **Deciders:** Lead Architect (proposed); Technical Head + Super Admin to ratify spend

## Context

The Django + DRF API (ADR-001) needs a host and a PostgreSQL database. Traffic is
small (a college E-Cell), but two days a year are critical: event check-in and
NEC registration pushes, when a cold start or a suspended service is visible to
hundreds of people. The system is handed to a new Technical Head every year, so
the host must be simple to administer and must not depend on one student's card.

## Research (fetched 2026-09-25 from vendor pages)

Figures are quoted from the vendors' own pages on the date above. Anything not
stated on those pages is marked **UNVERIFIED**. Re-check before signing up;
free tiers change often.

### Render (render.com/docs/free, render.com/pricing)
- Free web service: *"Do not use them for production applications"* (Render's own wording). Spins down after **15 min** idle; about **1 min** to spin back up. **750** free instance-hours per workspace per month, then free services are suspended. Ephemeral filesystem. May be restarted at any time. No one-off jobs or shell.
- Free Postgres **expires 30 days after creation.**
- Paid web instance: **$7/month** (512 MB RAM, 0.5 CPU). Paid Postgres from **$6/month** (256 MB). Workspace "Hobby" plan $0 + compute.
- Native Python and Docker, deploys from Git, deploy hooks, custom domains with managed TLS, environment variables and secret files, in-dashboard logs, rollbacks. Cron jobs are a service type; the free tier doesn't include them.

### Koyeb (koyeb.com/pricing, koyeb.com/docs/faqs/pricing)
- Pricing page banner: *"Koyeb is joining Mistral AI"*, so the company's direction is uncertain.
- Free: one web service with **512 MB RAM, 0.1 vCPU**, 2 GB SSD, in Frankfurt or Washington DC only. Free Postgres is **limited to 5 hours of active time**, 1 GB.
- Paid: Starter is pay-as-you-go; Pro is $29/month plus compute. Postgres Small is $29.76/month.
- Docker and Git deploy, scale-to-zero. Account validation may require a card (the FAQ mentions it; details **UNVERIFIED**).

### Google Cloud Run (cloud.google.com/run/pricing)
- Free tier (request-based billing): **180,000 vCPU-seconds, 360,000 GiB-seconds and 2 million requests per month**, aggregated per billing account.
- Scales to zero. Container-only (Docker). Cloud Scheduler is available for cron. Custom domains and HTTPS are supported.
- Requires a Google Cloud **billing account with a payment method** (standard GCP practice; not restated on the page fetched, so **UNVERIFIED** here). The IAM/console learning curve is steep for students. With no budget alerts, the risk of unexpected cost is **real**.

### PythonAnywhere (pythonanywhere.com/pricing)
- Free "Beginner": one app on `username.pythonanywhere.com`, **restricted outbound internet access**. Cloudinary and email API calls may be blocked unless they are on the allowlist (**UNVERIFIED** whether they are). No custom domain.
- Developer: **$10/month**, with custom domain and scheduled tasks. Postgres is a **paid add-on** in Custom plans (price **UNVERIFIED**).
- Very student-friendly web console. No Docker, which makes it the least portable option.

### Database-only options
- **Neon** (neon.com/pricing): Free **$0, "no time limits and no credit card required"**. 0.5 GB storage per project, 100 CU-hours per project per month, scales to zero after 5 min idle, restore window of up to 6 h, 1 snapshot. Paid "Launch" plan is usage-based, **typical $15/month**, at $0.106 per CU-hour.
- **Supabase** (supabase.com/pricing): Free 500 MB. **Free projects are paused after 1 week of inactivity.** No automatic backups on free. Limit of 2 active projects. Pro is **$25/month**. This is also where the legacy Control Room lives.

## Comparison

| Criterion | Render (paid $7 + Neon free) | Cloud Run + Neon | Koyeb | PythonAnywhere |
|---|---|---|---|---|
| Django support | native / Docker | Docker | Docker / buildpack | native (WSGI) |
| PostgreSQL | Neon (external) or Render $6+ | Neon | 5 h/month free: unusable | paid add-on |
| Free / lowest tier | $7/month web | likely $0 at our load | $0 (0.1 vCPU) | $0 / $10 |
| Card required | yes for paid | yes (billing account, UNVERIFIED) | possibly (UNVERIFIED) | not for free |
| Sleep / cold start | **none on paid** | scale-to-zero, seconds of cold start (UNVERIFIED) | scale-to-zero | none |
| Monthly limits | bandwidth/build minutes included | vCPU/GiB-s quotas | 100 GB egress | CPU-seconds per day |
| Deploy from GitHub | yes, auto | via Cloud Build / Actions | yes | manual / git pull |
| Docker | yes | required | yes | no |
| Custom domain / HTTPS | yes / managed | yes / managed | yes / managed | paid only / yes |
| Env vars / secrets | yes | Secret Manager | yes | yes (web UI) |
| Logs | dashboard + streams | Cloud Logging | dashboard | files |
| Cron | Cloudflare Cron → `/internal/tick` (free) for all options | Cloud Scheduler or Cloudflare | Cloudflare | built-in scheduled tasks |
| Student-friendly admin | **high** | low | medium | high |
| Portability | high (Dockerfile) | high | high | low |
| Academic-org suitability | high | medium (GCP billing ownership is heavy) | low (acquisition uncertainty) | medium |
| Unexpected-cost risk | **low** (fixed $7 per instance) | medium | low to medium | low |

## Decision

**Primary:** **Render paid web service ($7/month, Starter 512 MB), deployed from a
Dockerfile, plus Neon Free Postgres**, with a scheduled `pg_dump` to Cloudflare R2
(backups, see `16_DEPLOYMENT.md`). Scheduled jobs run through a **Cloudflare Worker
Cron Trigger** calling `POST /internal/tick` (ADR-006). No Render cron service.

- Staging and preview use Render **Free** plus a second Neon project. The cold start is acceptable there. Render itself says Free is not for production, so production never runs on it.
- If Neon's 0.5 GB or 100 CU-hours are exceeded, the next step is Neon Launch (about $15/month, usage-based). The upgrade trigger is recorded in the KB.

**Fallback:** **Google Cloud Run + Neon**, using the same Docker image. Use it if Render
changes terms or prices, or if the organization obtains institutional GCP credits.
Moving costs roughly one CI job and one DNS/proxy target change.

### Reasons
1. It's the only option with **no cold start on production** at a fixed, predictable price. Check-in day can't wait a minute for a spin-up.
2. It has the lowest administration burden for a student successor: Git push to deploy, a web dashboard, one-click rollback.
3. Docker keeps the application host-agnostic, so exit costs are low.
4. Neon removes the 30-day Render DB expiry and Supabase's 1-week pause, and it needs no card.
5. It avoids Koyeb's acquisition uncertainty and PythonAnywhere's poor portability.

### Rejected for production
- Render Free: the vendor itself says not for production (15 min spin-down, 750 h cap).
- Supabase Free as the new DB: it pauses after 1 week idle and has no backups. It also mixes the target DB with the legacy system and blurs the migration boundary. It stays in use as the legacy source until data is migrated.
- Koyeb Free: its DB allows 5 active hours per month.
- PythonAnywhere: restricted egress on free, no Docker.

## Assumptions
- Traffic stays well under the limits of one 512 MB instance. Django with gunicorn and 2 workers is roughly within budget (to verify under load testing in Phase 5).
- The E-Cell or the institute can fund about **$7/month (about $84/year)**, or a sponsor or faculty budget covers it. **This needs human approval.**
- Accounts are created under an **E-Cell-owned email** (e.g. `tech@…`), not a student's personal address.

## Cost summary

| Item | Monthly |
|---|---|
| Render production web | $7 |
| Neon production DB | $0 (Free), rising to about $15 if outgrown |
| Render staging web | $0 |
| Cloudflare Pages, Worker cron, R2 backups | $0 within free tiers (R2 limits **UNVERIFIED**) |
| **Expected total** | **about $7/month** |

## Exit strategy
The app is a Docker image, config comes from environment variables only (12-factor), and
the DB is plain Postgres (`pg_dump` / `pg_restore`). Moving to Cloud Run, Fly, Railway
or a college server takes: build the image, set environment variables, restore the dump,
and repoint the Cloudflare `/api` proxy's upstream URL. Frontend users see no URL change
because the API is same-origin (ADR-004).

## Operational risks
| Risk | Mitigation |
|---|---|
| Card-holder graduates and the card expires, so service suspends | Billing on an institutional or faculty card, or a prepaid arrangement. Owner is recorded in `17_DEVELOPER_HANDOVER.md` §8 |
| Neon free compute exhausted mid-month | Usage alert, documented upgrade trigger |
| Vendor changes free tiers | Re-verify each academic year during Technical Head handover |
| Single instance fails on event day | Offline check-in design (from the Control Room) keeps working; health check and auto-restart |
| DB data loss | Daily `pg_dump` to R2 plus a quarterly restore drill |
