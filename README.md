# vaidehi2510.github.io

My security engineering portfolio: a static website with no build step or runtime dependencies for serving it.

- `index.html`: security engineering work, technical notes, upstream contributions, all public projects, focus areas, experience, and contact.
- `styles.css`: responsive layout, light/dark themes, and motion styles.
- `script.js`: keyboard-accessible demo tabs, theme and motion preferences, case-study navigation, and email copying.
- `projects.js`: repository search, category filters, sorting, and direct project navigation.
- `data/projects.json`: reviewed descriptions, source links, repository metadata, and fork attribution.
- `scripts/build-project-directory.py`: regenerates the static directory from that data using Python's standard library.
- `assets/fonts/`: self-hosted Bricolage Grotesque and DM Sans with their SIL Open Font Licenses.
- `favicon.svg` and `social-preview.png`: browser icon and link-sharing artwork.

The directory covers all 17 public repositories on the account as of October 20, 2026, including three forks with upstream attribution. The technical descriptions were checked against public documentation and selected source files. Repository code was not executed as part of that review.

Project previews are illustrative. Engineering notes distinguish implemented controls, prototype scope, synthetic evidence, and planned hardening. Fork entries credit their upstream projects and link to my authored contributions.

The upstream section links to four merged Frame Spec PRs and two open PyDough/Apollo PRs, with authorship, diffs, and status checked on October 20, 2026. It distinguishes security guidance, validator conformance, and proposed implementation changes. Contribution links, summaries, and status snapshots live alongside the corresponding fork entries in `data/projects.json`; update the static section in `index.html` when that status changes.

## Updating the project directory

Edit `data/projects.json`, updating `reviewedOn` after a new source review, then run:

```sh
python3 scripts/build-project-directory.py
```

Commit both the data and generated `index.html`. The catalog is a reviewed snapshot; it does not fetch GitHub data in visitors' browsers. Every project remains visible when JavaScript is unavailable.

## GitHub Pages

Site: https://vaidehi2510.github.io

Repository: https://github.com/Vaidehi2510/Vaidehi2510.github.io

GitHub Pages publishes from the root of the `main` branch. The `.nojekyll` file tells GitHub to serve the static files directly.

To publish an update, edit the relevant files, then commit and push the changes to `main`. GitHub Pages redeploys automatically.

The local `resume.pdf` is excluded from Git and is not published.

## Local preview

Run `python3 -m http.server 8000 --bind 127.0.0.1` and open http://127.0.0.1:8000.

Before publishing, check phone and desktop layouts, keyboard navigation, both themes, reduced motion, case-study links, and directory search/filter/sort behavior. Compare directory names with the account's public repository list. Content and native case-study accordions remain available without JavaScript. Theme and motion preferences are stored locally in the browser.
