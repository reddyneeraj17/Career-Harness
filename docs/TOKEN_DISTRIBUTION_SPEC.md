# SPEC — Token-gated distribution and versioned installs (revised)

> **PROPRIETARY — Career Harness © 2026 Neeraj Reddy.** Maintainer document.

**Status: revised specification for implementation. Targets kit 1.4.0.**
**Audience:** the maintainer agent implementing `install/` and the customer docs.
**Supersedes** the chat-pasted draft of 2026-09-28. Corrections folded in:
`muse`-CLI Secure-store branch removed (no such CLI exists — env-var
contract only); token moved out of the clone URL into `http.extraHeader`
with a `set +x` guard so `bash -x` traces stay clean; `update.sh` split
into fetch/activate phases with an explicit agent/script boundary (the
platform builder step is the agent's, not bash's); existing-install
migration path specified; `ls-remote` annotated-tag parsing noted;
acceptance tests 2 and 9 reworded; open questions 1, 2, 5 resolved.

## The pitch, in three sentences

A customer's Muse installs Career Harness with one secret: a
per-customer read-only token kept in the Muse Secure store. The token is the
license — issue it on purchase, expire it with the agreement, revoke it in one
click — and it travels over plain HTTPS, so nothing in the customer's network
permissions has to change. Every install is pinned to a signed release tag,
lives in its own read-only directory, and rolls back with a single symlink flip.

## 0. What this fixes

Three defects in the shipped kit, all confirmed against the current tree:

| Defect | Where | Consequence |
|---|---|---|
| Two customer-facing docs contradict each other: DISTRIBUTION.md says the repo is **private**; SETUP_PROMPT.md says it is **public, no credentials needed**. The repo is public today. | `DISTRIBUTION.md` §The repository; `docs/SETUP_PROMPT.md` line 21 | The proprietary license is unenforceable while anyone can clone. Customers read two different stories. |
| The self-host path prescribes a "single-use read-only **deploy key**". Deploy keys are SSH. Muse ships with **Outbound SSH off** (Settings → Permissions → Direct network protocols). | `DISTRIBUTION.md` §2; `docs/UPGRADE_PLAYBOOK.md` §1 Path A | The documented install cannot run without asking every customer to open port 22 for everything. |
| `upgrade.sh` refreshes `~/workspace/skills` and `templates` **in place**. | `install/upgrade.sh` lines 55–60 | No rollback. A bad skill release is live until the next release. |

What already works and is kept as-is: git over **HTTPS** reaches GitHub with
every Muse protocol toggle off (the builder agent's clone of `v1.0.0` proved
it); `install.sh --check` verifies every shipped file against
`MANIFEST.sha256`; `upgrade.sh` runs ordered migrations and re-locks read-only;
`release.sh` cuts tagged releases; `RELEASING.md` already uses a fine-grained
PAT for the maintainer's push. This spec mirrors that last pattern onto the
customer's read side.

## 1. Goals and honest limits

Goals, in priority order:

1. **No access without a token.** The repo is private. A customer with no
   valid token cannot fetch, install, or upgrade. Revoking the token ends
   access to future releases immediately.
2. **Works inside Muse as shipped.** HTTPS only. No SSH, no new permission
   toggles, no root, no paths outside `~/workspace`.
3. **Every install is a pinned, verified, read-only release** with one-command
   upgrade and one-command rollback.
4. **The secret never lands on disk in the clear** — not in `.git/config`, not
   in a script, not in a log line, not in a `bash -x` trace.

Limits, stated so nobody oversells them (DISTRIBUTION.md principle 1 stands):

- A customer who holds the files can copy the files. The token gates
  *fetching*, not *possession*. Possession is governed by LICENSE.
- The token is as safe as the Muse Secure store that holds it. That is the
  platform's guarantee, not ours.
- Managed-service customers (DISTRIBUTION.md option 1) never touch any of
  this. This spec covers licensed self-host installs only.

## 2. The token

**Kind.** GitHub fine-grained personal access token, issued by the
maintainer account.

| Setting | Value | Why |
|---|---|---|
| Resource owner | maintainer | — |
| Repository access | **Only `Career-Harness`** | one repo, nothing else |
| Permissions | **Contents: Read-only**, Metadata: Read (automatic) | clone, fetch, tags. Nothing else. |
| Expiration | end of the customer's agreement term, max 1 year | expiry is the license term |
| Name | `ch-<customer-slug>-<yyyy-mm>` | one token per customer per term; the name is the audit trail |

**Customer-side storage.** The customer's Muse holds it in the **Secure store**
under the fixed key **`HARNESS_TOKEN`**. There is no shell CLI for the Secure
store: the contract is that **the agent exports `HARNESS_TOKEN` into the
script's environment for the command's lifetime, then unsets it**. The token
is never written to any file under `~/workspace`.

**Maintainer-side ledger.** A private record outside this repo: customer,
token name, issued, expires, revoked. The kit never contains it.

**Rotation.** New token, same key in the Secure store, old token revoked.
No reinstall.

**Revocation = offboarding.** Revoke in GitHub settings. The installed kit
keeps working (the customer holds the files) but can never fetch another
release. `update.sh` reports `token_rejected` and stops.

## 3. Directory layout (all under `~/workspace`, no root)

```
~/workspace/
├── harness-kit -> .harness/releases/v1.4.0/     # atomic symlink, the only path skills reference
├── .harness/
│   ├── releases/
│   │   ├── v1.3.0/                              # previous release, read-only, kept for rollback
│   │   └── v1.4.0/                              # current release, read-only (chmod -R a-w)
│   ├── VERSION.installed                        # existing marker, moved here
│   └── update.log                               # one line per install/upgrade/rollback, never the token
├── profile.yaml                                 # customer data — unchanged, never inside a release
├── user/                                        # resumes, files — unchanged
├── goals/                                       # run evidence — unchanged
├── skills/      -> harness-kit/skills           # staged read-only, as today
└── templates/   -> harness-kit/templates        # staged read-only, as today
```

- Each release is a **shallow clone of one tag** (`--depth 1 --branch vX.Y.Z`).
  No history ships to the customer.
- `skills/` and `templates/` become symlinks into the current release instead
  of copies, so a symlink flip changes them atomically. If the platform
  refuses symlinks for these, fall back to the existing copy-and-lock and
  flip only `harness-kit`.
- Keep the **two most recent** releases; `update.sh --activate` prunes older
  ones after a successful doctor run.
- Persistent data paths do **not** move. `privileged.ts` hard-codes
  `/home/hatch/workspace/profile.yaml`, and 30 skills assume `~/workspace`;
  this spec changes none of them.

### 3b. Migrating existing (pre-1.4.0) installs

Boxes installed by git-clone have a **real directory** at
`~/workspace/harness-kit` and copied `skills/`/`templates/` dirs. The first
1.4.0 `update.sh` run migrates them:

1. Detect old layout: `~/workspace/harness-kit` is not a symlink and
   `.harness/releases/` does not exist.
2. Read the currently installed version from `VERSION.installed`
   (fallback: the `VERSION` file inside the old kit dir).
3. **Fresh-fetch that same version** (token, verify manifest, lock) into
   `.harness/releases/<current>/`. A fresh fetch — not adopting the old
   tree — so the rollback target is known-good even if the old tree drifted.
4. Replace the real `skills/` and `templates/` directories with symlinks
   into the current release, **only after** its manifest verifies.
5. Replace `~/workspace/harness-kit` (real dir) with the `harness-kit`
   symlink. Move `VERSION.installed` to `.harness/`.
6. From here the box is a normal 1.4.0 install: the next `update.sh` fetches
   the new release, leaving two releases on disk and a working rollback.

## 4. Script contracts

All scripts: `set -euo pipefail`, exit non-zero on any failure, print one
`[ok]`/`[FAIL]` line per step in the existing `install.sh` style, and **never
echo the token**. Token handling is one shared function:

```sh
# install/lib/token.sh — sourced by install.sh, update.sh, rollback.sh
harness_token() {
  # The agent exports HARNESS_TOKEN from the Secure store for the script's
  # lifetime. There is no shell CLI for the Secure store. Fail loudly.
  if [[ -n "${HARNESS_TOKEN:-}" ]]; then printf '%s' "$HARNESS_TOKEN"; return; fi
  echo "[FAIL] no HARNESS_TOKEN in env — the agent must export it from the Secure store; see DISTRIBUTION.md" >&2
  exit 2
}
harness_auth_header() {
  # Build the git auth header with tracing off: under bash -x the command
  # substitution would otherwise print the (decodable) credential.
  set +x
  local token; token="$(harness_token)"
  printf 'Authorization: Basic %s' "$(printf 'x-access-token:%s' "$token" | base64 -w0)"
}
harness_fetch_release() {  # $1 = vX.Y.Z  $2 = target dir
  local header; header="$(harness_auth_header)"
  local err
  if ! err="$(git -c credential.helper= -c "http.extraHeader=$header" \
      clone --quiet --depth 1 --branch "$1" \
      https://github.com/reddyneeraj17/Career-Harness.git "$2" 2>&1)"; then
    # Never blame the token for a network problem — or vice versa.
    # GitHub returns 404 for repos the token cannot see, so a missing
    # *repository* counts as auth; a missing *branch* means a bad tag.
    case "$err" in
      *"401"*|*"403"*|*"Authentication failed"*|*"repository '"*"not found"*)
        echo "[FAIL] token_rejected: license expired or revoked" >&2; exit 3 ;;
      *"Remote branch"*"not found in upstream origin"*)
        echo "[FAIL] fetch $1: tag not found" >&2; exit 5 ;;
      *)
        echo "[FAIL] fetch $1 failed: $err" >&2; exit 5 ;;
    esac
  fi
  rm -rf "$2/.git"   # no history, no remote, nothing token-shaped on disk
}
harness_newest_tag() {
  # Newest tag visible to the token. Annotated tags produce both
  # refs/tags/vX.Y.Z and refs/tags/vX.Y.Z^{} lines — strip the ^{} derefs.
  local header; header="$(harness_auth_header)"
  git -c credential.helper= -c "http.extraHeader=$header" \
    ls-remote --tags https://github.com/reddyneeraj17/Career-Harness.git \
    | grep -v '\^{}' | awk -F'refs/tags/' '{print $2}' | sort -V | tail -1
}
```

`-c credential.helper=` stops Git Credential Manager from caching the token.
The header keeps the token out of `argv` (no `ps` leakage). `rm -rf .git`
guarantees nothing token-shaped survives on disk.

### `install/install.sh` (existing, extended)

```
install.sh [--version vX.Y.Z] [--check]
```

Refuses when `.harness/releases/` already exists ("already installed — use
`update.sh`").

1. Resolve version: `--version`, else `harness_newest_tag`.
2. `harness_fetch_release` into `~/workspace/.harness/releases/<ver>/`.
3. `sha256sum -c install/MANIFEST.sha256` inside it. Mismatch → delete the
   directory, exit 4. Never install an unverified tree.
4. Verify the tag signature when the release is signed (`git verify-tag`
   before step 2's `rm -rf .git`; skip with a `[..]` line if unsigned, never
   silently).
5. `chmod -R a-w` the release directory.
6. Point `harness-kit`, `skills`, `templates` symlinks at it.
7. Existing steps unchanged: `profile.example.yaml → profile.yaml` if absent,
   `client-onboarding-form`, doctor.
8. Write `.harness/VERSION.installed` and append to `.harness/update.log`.

### `install/update.sh` (new, two phases)

The agent/script boundary is explicit: **the script fetches, verifies, and
flips; the agent runs migrations, seed refresh, the artifact rebuild, and
the doctor.** The script never pretends to do the builder step.

```
update.sh [vX.Y.Z]              # phase 1: fetch + verify + stage
update.sh --activate <vX.Y.Z>   # phase 2: flip symlinks + prune
```

Phase 1:
1. `harness_newest_tag` (default) or the given version. Token rejected →
   `[FAIL] token_rejected: license expired or revoked`, exit 3.
2. Already installed → `[ok] up to date`, exit 0.
3. Old-layout box → run the §3b migration first (adopts current version),
   then continue.
4. Fetch, verify manifest, verify signature, lock — identical to install.
   Do NOT flip the symlinks yet.
5. Print the agent runbook and exit 0: pending migrations in filename order
   (via the artifact's migration path), seed refresh, rebuild the
   `harness-core` artifact from the new tag, recompile schedules, doctor.
   Print the staged release path.

Phase 2 (`--activate`, only after the agent reports doctor green):
1. Refuse if the staged directory is absent or fails its manifest check.
2. Flip the `harness-kit`, `skills`, `templates` symlinks.
3. Write `.harness/VERSION.installed`. Append to `.harness/update.log`.
4. Prune releases older than the previous one (two kept).

A red doctor means `--activate` never runs: the old release stays live and
the staged directory is kept for inspection.

### `install/rollback.sh` (new)

```
rollback.sh [vX.Y.Z]      # default: the previous release still on disk
```

Needs no token.

1. Refuse if the target directory is absent or fails its manifest check.
2. Flip the symlinks. Write `.harness/VERSION.installed`. Log it.
3. Print, do not perform: "Dashboard: roll the artifact back to its previous
   version in the platform builder. Migrations are additive and are not
   reversed; the previous release runs against the current schema."

That last line is a real constraint, not a caveat: migrations `0001`–`0017`
are additive, so an older release reads a newer schema safely, and nothing
here drops a column.

### `install/upgrade.sh` (existing)

Keep it. Change only the two `chmod` lines to operate on the release
directory rather than `~/workspace/skills`, and move `VERSION.installed`
to `~/workspace/.harness/`. Its migration/seed steps remain the reference
for what `update.sh` phase 1 prints as the agent runbook.

### Error handling (all scripts)

- **Concurrency.** `install.sh` and `update.sh` take a `mkdir`-based lock
  at `.harness/.lock` (atomic on POSIX). A second invocation exits with
  `[FAIL] another install/update is already running` instead of
  interleaving. A stale lock (owning PID gone) is cleared with a warning
  line, not silently.
- **Idempotent activation.** `update.sh --activate` is safe to re-run: it
  re-verifies the staged manifest, then flips each symlink with `ln -sfn`
  (atomic per link). A crash between flips leaves a mixed-version box;
  re-running `--activate` repairs it to the fully new release.
- **Rollback with nothing to roll back to.** One release on disk →
  `rollback.sh` exits 1 with `[FAIL] no previous release on disk` rather
  than failing cryptically. Symlinks untouched.
- **Honest fetch failures.** `harness_fetch_release` classifies the clone
  error (see the snippet): auth problems → `token_rejected`, exit 3; bad
  tag, network down, no disk space → exit 5 with git's message. The token
  is never blamed for a transport problem.

## 5. Flows

**First install (supervised or self-serve).**
Maintainer issues the token → customer stores it as `HARNESS_TOKEN` in the
Secure store → the agent exports it and runs
`./install/install.sh --version v1.4.0` (SETUP_PROMPT says this instead of
a `git clone` line). The token is used over HTTPS and never lands in a file.

**Upgrade.** Agent runs `./install/update.sh` → fetch, verify, stage.
Agent runs migrations, seed refresh, artifact rebuild, doctor.
Agent runs `./install/update.sh --activate vX.Y.Z` → flip, prune.
Nothing to copy.

**Rollback.** `./install/rollback.sh`. Symlink flip. Under a minute. No token
needed.

**Offboarding.** Revoke the token. Note it in the ledger. The customer's kit
keeps running on its pinned release forever; it can never fetch another.

**Token rotation.** New token in the Secure store, old one revoked. Nothing
on disk changes.

## 6. Security properties

| Control | What it gives | What it does not give |
|---|---|---|
| Private repo + per-customer read-only token | No fetch without a current license; per-customer revocation; audit by token name | Does not stop copying of files already held |
| HTTPS only, credential helper disabled, `.git` removed, header built with tracing off | Token never persisted; not in `argv`, not in `-x` traces; no remote left to pull from | Token safety inside Muse Secure store is the platform's |
| Manifest check before install | Tampered or partial trees never install | Does not authenticate the *publisher* — that is the signed tag |
| Signed release tags (`release.sh -s`) | Customer verifies the release came from the maintainer | Requires a signing key set up once on the maintainer machine |
| Read-only release directory + symlinked kit | Agents and users cannot edit live kit code; drift is a doctor finding | A user with shell access can `chmod` it back; the lock is a guard, not a wall |
| Two releases kept | Instant rollback of skills/templates | Dashboard rollback is a platform-builder action, done separately |

## 7. Document updates shipping with 1.4.0

- **`docs/SETUP_PROMPT.md`:** replace the 1.3.1 token-authenticated clone
  with `./install/install.sh --version vX.Y.Z` once the flag exists.
  `release.sh` keeps bumping the pinned version here.
- **`docs/UPGRADE_PLAYBOOK.md` §1:** Path A becomes `update.sh`
  (fetch + activate); Path B (tarball) stays for air-gapped customers;
  migrations, seeds, rebuild, and doctor are unchanged, now split across
  the agent/script boundary in `update.sh`'s printed runbook.
- **`RELEASING.md`:** unchanged, plus "cut with `release.sh -s` once a
  signing key exists".
- **`release.sh`:** own the air-gapped path — build
  `harness-kit-<ver>.tar.gz` + `.sha256` sidecar on every release
  (currently hand-built).

## 8. Acceptance tests

1. Repo private; anonymous `git ls-remote` fails; `install.sh` with no token
   exits 2 with the Secure-store message.
2. Valid token: `install.sh --version v1.4.0` completes; no credential
   material anywhere under `~/workspace` (grep for the token value and its
   base64 form); no `.git` under `.harness/releases/`.
3. Revoked token: `update.sh` exits 3 with `token_rejected`; the installed
   kit still passes `install.sh --check` and runs.
4. Token scoped to another repo: `install.sh` exits 3 (rejected), not 4.
5. Tampered file in a fetched release: manifest check fails, directory
   removed, exit 4, symlinks untouched.
6. `update.sh` staged but doctor red: `--activate` never runs; old release
   still linked; staged directory kept for inspection.
7. `rollback.sh` flips to the previous release in under a minute; doctor
   green; `VERSION.installed` matches the symlink.
8. Three successive updates leave exactly two releases on disk.
9. Every script run with `bash -x` shows no token characters and no
   base64 blob decodable to the token.
10. Signed tag: `git verify-tag` passes before install; unsigned tag prints
    a `[..]` line and continues.
11. Old-layout box (real `harness-kit/` dir, `VERSION.installed` = v1.3.0):
    first `update.sh` migrates to the new layout, fetches the new release,
    and ends with exactly two releases and a working `rollback.sh`.
12. `--activate` killed mid-flip (mixed symlinks): re-running it completes
    the flip; all three symlinks point at the new release; doctor green.
13. Single release on disk: `rollback.sh` exits 1 with
    `[FAIL] no previous release on disk`; symlinks untouched.
14. Two concurrent `update.sh` runs: the second exits with the
    already-running message; the first completes normally.
15. Fetch with the network down: exit 5 with a transport message, never
    `token_rejected`.

## 9. Phasing

| Release | Contents |
|---|---|
| **1.3.1** | Docs only — DONE (unpushed): public/private contradiction fixed, "deploy key" replaced everywhere, Secure store step added. Push after the repo goes private. |
| **1.4.0** | `install/lib/token.sh`, extended `install.sh`, new two-phase `update.sh`, new `rollback.sh`, symlinked release layout, `upgrade.sh` chmod change, `release.sh` tarball ownership, §7 doc updates. |
| **1.4.1** | Signed tags in `release.sh`; `install.sh` verifies them. |

## 10. Open questions (resolutions)

1. **When does the repo go private?** Before the 1.3.1 docs push. Everything
   is theatre while it is public. — RESOLVED: flip first, then push.
2. **Does Muse expose the Secure store to shell scripts?** No `muse` CLI
   exists in the VM. — RESOLVED: the agent exports `HARNESS_TOKEN` for the
   script's lifetime; scripts fail loudly without it.
3. **Symlinks for `skills/` and `templates/`:** confirm the platform
   tolerates them before 1.4.0 ships; otherwise keep copy-and-lock and
   flip only `harness-kit`. — OPEN, verify once.
4. **GitHub App instead of PATs:** worth it past roughly 20 customers.
   Not now. — DEFERRED.
5. **Air-gapped tarball:** `release.sh` must produce the `.tar.gz` +
   `.sha256` sidecar. — RESOLVED: folded into 1.4.0 (§7).

## Pre-1.4.0 verification checklist

- [ ] Repo is private; anonymous `git ls-remote` fails.
- [ ] Platform tolerates the `skills/` and `templates/` symlinks
      (else: copy-and-lock fallback, flip only `harness-kit`).
- [ ] Artifact builder confirmed working against a read-only source tree
      (we build from the tag today; confirm no write access is assumed).
- [ ] Blueprint decision: fold a distribution section into the living PDF
      with 1.4.0, or explicitly defer it.
