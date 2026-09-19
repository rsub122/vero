# Vero

A 2-minute pre-check that verifies a construction applicant's answers and safety card before a recruiter spends time on them. **Other tools ask. We verify.** Vero never rejects anyone; it only decides who still needs a human call.

- **Apply** (`/apply/<job>`): a phone form, English or Spanish, with server-stamped timing and paste capture.
- **Check**: 3 safety questions (15s each), 1 bot-trap (10s), and 2 claim questions (20s each) that OpenAI writes from the applicant's own answers.
- **Verify**: provider revoked-list check, card date (issue + 5 years), AI consistency judge with a keyword fallback, safety score, behavior flags.
- **Recruiter view** (`/dashboard/applicants`): live, amber first, with Call, Send to PM, an audit log and CSV export.
- **Hand-off**: a mock ATS webhook, a foreman email via Resend, and a read-only candidate page at `/c/<token>`.

Built on Next.js 16, Convex, the AI SDK (OpenAI), and shadcn/ui.

## Run locally

```bash
npm install
npx convex dev          # keep running; pushes functions and writes .env.local
npx convex run seed:run # demo job, providers, 3 amber + 1 green applicants
npm run dev
```

Useful commands: `npm test` (Vitest), `npm run check`, `npm run build`, `npx convex run seed:purge` (deletes every non-seeded applicant; run before and after a demo, then re-run the seed).

## Environment variables

Names only. Never commit values. Set Convex vars with `npx convex env set NAME value` (add `--prod` for production).

| Where | Name | Purpose |
|---|---|---|
| Convex | `RECRUITER_PASSCODE` | Recruiter gate. Every recruiter function refuses when it is unset. |
| Convex | `OPENAI_API_KEY` | Claim questions, consistency judge, provider summary |
| Convex | `ATS_SECRET` | Shared secret for the mock ATS endpoint. It fails closed when unset. |
| Convex | `APP_URL` | Public site origin, used for the foreman link |
| Convex | `RESEND_API_KEY` | Foreman email |
| Convex | `RESEND_FROM` | Sender (default `Vero <onboarding@resend.dev>`, which only delivers to the Resend account owner) |
| Convex | `FOREMAN_EMAIL` | Foreman address the seed writes onto the demo job |
| Convex | `TAVILY_API_KEY` | Optional. Advisory web lookup for "Other" providers. |
| Vercel | `CONVEX_DEPLOY_KEY` | Production deploy key. The build runs `npx convex deploy --cmd 'npm run build'`. |
| Next (auto) | `NEXT_PUBLIC_CONVEX_URL` | Set by `convex dev` and `convex deploy` |

## Deploy

1. Run `npx convex login`, then `npx convex dev` to link a cloud project.
2. Import the repo into Vercel and set `CONVEX_DEPLOY_KEY` (Convex dashboard, then Settings, then Deploy keys).
3. Set the Convex vars above with `--prod`, then run `npx convex run --prod seed:run`.
4. Set spend limits in the OpenAI and Tavily consoles.

Based on the MIT-licensed [next-shadcn-admin-dashboard](https://github.com/arhamkhnz/next-shadcn-admin-dashboard) template.
