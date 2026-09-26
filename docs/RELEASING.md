# RELEASING.md — how to cut a release (every release, same system)

<!-- PROPRIETARY — Career Harness (c) 2026 Neeraj Reddy. Licensed customers only. -->

This is the release checklist. Follow it in order for every version —
no shortcuts, no improvising.

## 1. Prepare

- Write the `## [X.Y.Z]` section in `CHANGELOG.md` (Added / Changed / Fixed).
- If the design changed (schema, actions, skills, tabs, rules), rebuild the
  blueprint PDF first — code and blueprint never drift.
- Make sure the working tree is clean (`git status` shows nothing).

## 2. Cut the release (script does the mechanical work)

```sh
cd ~/workspace/harness-kit && ./install/release.sh 1.3.0
```

The script verifies: clean tree, tag not reused, changelog entry exists.
Then it bumps `VERSION`, updates the `--branch vX.Y.Z` pins in
`docs/SETUP_PROMPT.md` and `PACKAGING.md`, rebuilds
`install/MANIFEST.sha256`, runs `install.sh --check` (must be 0 failures),
commits, and creates the annotated tag. **It never pushes.**

Tags are the pull mechanism — customers install with
`git clone --branch vX.Y.Z`. A GitHub Release is also published on each
tag for visibility (release notes live in `docs/RELEASE_NOTES_vX.Y.Z.md`).

## 3. Publish (human step — needs a fresh PAT)

1. Generate a **fresh fine-grained PAT**: this repository only,
   contents read/write (plus enough administration permission if you also
   need to flip visibility). It is single-use.
2. **Check the real remote state first** — never trust the local
   `origin/main` tracking ref, it can be stale:
   `git ls-remote <url> refs/heads/main`
3. If the remote has commits you don't have: **merge, never force-push**.
   Resolve conflicts in favor of the release (the old commit's content is
   normally fully superseded), re-run `--check`, commit the merge.
4. Push explicitly, one at a time — never force:
   `git push <url> main` then `git push <url> vX.Y.Z`
5. Verify with `git ls-remote`: remote `main` and the tag match local.
   Confirm the repo is still **private**.
6. Publish the GitHub Release (same PAT, still valid). Write the notes to
   `docs/RELEASE_NOTES_vX.Y.Z.md` first, then:
   ```sh
   curl -s -X POST -H "Authorization: Bearer $TOKEN" \
     -H "Accept: application/vnd.github+json" \
     https://api.github.com/repos/reddyneeraj17/Career-Harness/releases \
     -d "$(python3 -c "import json; print(json.dumps({
       'tag_name': 'vX.Y.Z', 'name': 'vX.Y.Z',
       'body': open('docs/RELEASE_NOTES_vX.Y.Z.md').read(),
       'draft': False, 'prerelease': False, 'make_latest': 'true'}))")"
   ```
   Check the release page shows published (not draft).
7. **Revoke the PAT immediately** in GitHub settings. Never store it, log
   it, or reuse it.

Build the push URL in a shell variable; never echo the token or write it
to a file:
`URL="https://x-access-token:$TOKEN@github.com/reddyneeraj17/Career-Harness.git"`

## 4. After

- The tag is immutable from here: never move it, never reuse it.
- The next release starts again at step 1.
