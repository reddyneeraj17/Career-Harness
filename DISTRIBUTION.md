# DISTRIBUTION.md — how the Career Harness reaches customers

> **PROPRIETARY — Career Harness © 2026 Neeraj Reddy.** Licensed customers
> only: no redistribution, no sharing, no export. Full terms in LICENSE.

## The strategy

The harness is sold as a **service**, not as software you hand over. The
code never becomes the customer's property and never travels anywhere
except through the channels below. Two honest principles drive every
choice here:

1. **If a customer can read the files, they can copy the files.** No
   technical measure stops a determined person from sharing files they
   hold. The real protection is legal (the proprietary LICENSE) plus
   minimizing how many hands ever hold the code.
2. **The secret sauce stays home.** The judging rules, scoring models,
   screening logic, and mappings — the "map and the law" inside
   `skills/` — live only in the maintainer's private repository. They are
   never published, never posted, never attached to a chat.

## The repository

- `Career-Harness` on GitHub is **private**. No public forks, no public
  clones, no tarball on a website.
- The maintainer works on `main` and cuts versioned releases (`vX.Y.Z`).
- Nobody outside the maintainer gets repo access by default — not even
  read access. Access is granted per customer, per install, and revoked
  when the engagement ends.

## How customers get it

### 1. Managed service (preferred — default offer)

The maintainer hosts and operates one harness per customer. The customer
gets the dashboard, the onboarding Excel, and the outcomes (applications,
replies, reports). They never see the repo, never run the installer,
never hold a single skill file. Nothing to leak, nothing to maintain.

### 2. Licensed self-host install

For customers who must run it in their own Muse environment:

- The maintainer issues the customer a **per-customer read-only token**
  (a GitHub fine-grained personal access token: Contents read-only,
  scoped to this repository only, expiring at the end of the agreement
  term). The customer stores it in their Muse **Secure store** under the
  key `HARNESS_TOKEN` — it is never written to a file, a script, or a
  chat log.
- The install is pinned to the exact release tag in their agreement and
  fetched over plain **HTTPS** with that token. No SSH, no new network
  permission toggles, nothing outside `~/workspace`.
- Upgrades arrive as new releases fetched with the same token (see
  `docs/UPGRADE_PLAYBOOK.md`); the token stays valid across releases
  until it expires or is revoked.
- The customer never copies the kit elsewhere. CUSTOMER_RULES.md
  (read-only kit code, drift detection via MANIFEST.sha256) is enforced
  in their environment from day one.

Revoking the token is offboarding: the installed kit keeps running on
its pinned release, but it can never fetch another release. There is no
other credential a customer can use to fetch the code on their own.

## What customers may and may not do

| They MAY | They MAY NOT |
|---|---|
| Use the dashboard and all its tabs | Share, resell, or redistribute the kit |
| Configure via the Profile tab, resumes, documented templates | Copy kit files out or export them anywhere |
| Request behavior changes (feature requests) | Edit skills, dashboard source, installer, or migrations |
| Receive upgrades as new releases | Post any part of it publicly or to a shared repo |

Violations terminate the license (LICENSE §5): the customer deletes all
copies.

## The maintainer's release checklist (per customer)

1. Confirm the service agreement covers the environments in scope.
2. Cut or pick the release tag; verify `install.sh --check` is green.
3. Managed: provision and hand over dashboard access only.
   Self-host: issue the per-customer read-only token, supervise the
   install, and record the token name, issue date, and expiry in the
   private ledger (kept outside this repo).
4. Confirm CUSTOMER_RULES.md is in place and drift detection is armed.
5. Record the install (customer, environments, release tag, date).
