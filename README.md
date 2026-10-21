# vaidehi2510.github.io

My security engineering portfolio: a static website with no build step or runtime dependencies for serving it.

- `index.html`: selected security work, seven expandable engineering notes, experience, grouped skills, education, CTF practice, upstream contributions, all public projects, and contact.
- `styles.css` and `experience.css`: shared layout, typography, violet/peach themes, and interaction foundations.
- `studio.css`: the current responsive layout, security map, project and skills panels, experience rows, and motion styles.
- `script.js`: theme and motion preferences, case-study navigation, reading progress, and email copying.
- `experience.js`: scroll reveals, magnetic buttons, pointer effects, and optional card depth. Pointer and scroll updates are scheduled only when needed; there is no continuously rendered canvas.
- `interactions.js`: keyboard-accessible project and skills tabs, security-map shortcuts, mobile navigation, and disclosure transitions.
- `navigator.js`: searchable project explorer with Command/Ctrl+K, keyboard navigation, and focus management.
- `projects.js`: repository search, category filters, sorting, animated result transitions, progressive expansion, and direct project navigation.
- `data/projects.json`: reviewed descriptions, source links, repository metadata, and fork attribution.
- `scripts/build-project-directory.py`: regenerates the static directory from that data using Python's standard library.
- `assets/fonts/`: self-hosted Bricolage Grotesque and DM Sans with their SIL Open Font Licenses.
- `favicon.svg` and `social-preview.png`: browser icon and link-sharing artwork.
- `scripts/social-preview.html`: editable source for the 1200 × 630 link-sharing artwork.

The directory covers all 17 public repositories on the account as of October 20, 2026, including three forks with upstream attribution. The technical descriptions were checked against public documentation and selected source files. Repository code was not executed as part of that review.

The selected-work panels also include zappipe and a network security/SOC lab described in my professional background. These are separate from the public repository count; a source link is shown only when a public destination is available. Diagrams are built with HTML, CSS, and SVG, with no project photographs or generated cover images.

Engineering notes distinguish implemented controls, prototype scope, synthetic evidence, and planned hardening. The Java/Spring Boot companion service is described separately from the Patchsentry review engine and web workspace. AURORA's retrieval prototype is distinguished from its correlation pipeline. Work experience and qualifications reflect the supplied professional background; public repository descriptions retain their source links and fork attribution.

The upstream section links to four merged Frame Spec PRs and two open PyDough/Apollo PRs, with authorship, diffs, and status checked on October 20, 2026. It distinguishes security guidance, validator conformance, and proposed implementation changes. Contribution links, summaries, and status snapshots live alongside the corresponding fork entries in `data/projects.json`; update the static section in `index.html` when that status changes.

## Updating the project directory

Edit `data/projects.json`, updating `reviewedOn` after a new source review, then run:

```sh
python3 scripts/build-project-directory.py
```

Commit both the data and generated `index.html`. The catalog is a reviewed snapshot; it does not fetch GitHub data in visitors' browsers. JavaScript initially shows six featured repositories, with a control to reveal all 17. Search, filtering, sorting, and direct project links can reach the full collection. Without JavaScript, every repository is visible and its native disclosure can still be opened.

## GitHub Pages

Site: https://vaidehi2510.github.io

Repository: https://github.com/Vaidehi2510/Vaidehi2510.github.io

GitHub Pages publishes from the root of the `main` branch. The `.nojekyll` file tells GitHub to serve the static files directly.

To publish an update, edit the relevant files, then commit and push the changes to `main`. GitHub Pages redeploys automatically.

Original résumé documents are private source material, not website assets. Do not commit them, extracted document text, temporary review notes, personal filesystem paths, or filenames identifying targeted applications. The local `resume.pdf` is excluded from Git. The public site incorporates relevant professional facts without publishing résumé downloads.

## Local preview

Serve the public site files with a local static server bound to `127.0.0.1`. Keep private source documents outside the served files.

Before publishing, check phone and desktop layouts, keyboard navigation, both themes, reduced motion, selected-work and skill tabs, mobile navigation, case-study links, and directory search/filter/sort/expansion behavior. Compare directory names with the account's public repository list. Project and skill panels remain readable without JavaScript; engineering notes, experience details, and coursework use native disclosures. Theme and motion preferences are stored locally in the browser.

The experience defaults to the dark theme. The motion control pauses decorative effects, and the operating system's reduced-motion preference is honored unless the visitor explicitly chooses otherwise. Turning motion off cancels active JavaScript transitions. Pointer effects only run for a fine pointer; touch and keyboard users retain navigation and project content. The page uses native scrolling.
