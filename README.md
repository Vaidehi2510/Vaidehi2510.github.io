# vaidehi2510.github.io

Vaidehi Pandya’s security engineering portfolio. A static editorial website with self-hosted assets and no build step or runtime dependencies required to serve it.

The page connects a personal introduction, selected projects, CTF practice, upstream contributions, the complete public repository catalog, detailed engineering notes, and contact information.

## Implementation

- `index.html`: the complete narrative and accessible static content, including four featured projects, all 17 repositories, five technical case studies, and the navigation dialog.
- `styles.css`: shared components, typography, theme variables, and accessibility foundations.
- `experience.css`: the current editorial layout, portrait composition, project imagery, gallery, repository cards, and responsive styling.
- `script.js`: theme and motion preferences, reading progress, case-study navigation, and email copying.
- `story.js`: native-scroll hero and gallery enhancements, reading-line effects, and the full-screen navigation menu.
- `experience.js`: cursor effects, the magnetic contact button, and scroll reveals.
- `navigator.js`: the searchable project explorer, Command/Ctrl+K shortcut, keyboard navigation, and focus management.
- `projects.js`: repository search, category filters, sorting, and navigation to filtered projects.
- `data/projects.json`: reviewed descriptions, source links, repository metadata, image assignments, fork attribution, and contribution status snapshots.
- `scripts/build-project-directory.py`: regenerates the static repository directory using Python’s standard library.
- `assets/projects/`: six optimized project-family illustrations and their provenance documentation.
- `assets/fonts/`: self-hosted Bricolage Grotesque and DM Sans with their SIL Open Font Licenses.
- `favicon.svg` and `social-preview.png`: browser icon and link-sharing artwork.
- `scripts/social-preview.html`: editable HTML source for the social preview artwork.

On screens at least 960 pixels wide, with motion enabled, `story.js` connects ordinary vertical document scrolling to a sticky horizontal project gallery. Previous/next controls move between featured projects, and keyboard focus aligns the relevant card. It does not replace native wheel or touch scrolling. On smaller screens, with motion disabled, or without JavaScript, the gallery uses the ordinary vertical layout.

The experience defaults to the dark theme. Visitors can choose a light theme or pause motion; preferences are stored locally. The operating system’s reduced-motion preference is honored unless the visitor explicitly chooses otherwise. Content remains available without JavaScript, including native project-description disclosures and engineering-note accordions.

## Content and imagery

The catalog covers all 17 public repositories on the account as of October 20, 2026, including three forks with upstream attribution. Descriptions were checked against public documentation and selected source files. Repository code was not executed as part of that review. Engineering notes distinguish implemented capabilities, prototype scope, synthetic evidence, and planned work.

The practice section’s **100+ CTFs completed** is a statement supplied by Vaidehi. It does not assert platform rankings, certifications, or competition placements.

The upstream section links to four merged Frame Spec PRs and two open PyDough/Apollo PRs. Authorship, diffs, and status were checked on October 20, 2026. The copy distinguishes security guidance, validator conformance, and proposed implementation changes. Update the static upstream section alongside its corresponding contribution metadata when statuses change.

Every repository card has a labeled **Project illustration**. The six AI-generated covers are visual metaphors reused across related projects; they are not product screenshots, real infrastructure photographs, or evidence of security outcomes. Generation prompts and provenance are recorded in [assets/projects/README.md](assets/projects/README.md). Images are served locally and loaded lazily.

The hero portrait is awaiting Vaidehi’s selected photograph. The current composition uses a monogram placeholder. When the supplied photograph is available, replace the element at `PORTRAIT_INSERT` in `index.html`, add appropriate alternative text and intrinsic dimensions, and remove `data-portrait-pending`. No portrait has been generated.

## Updating the project directory

Edit `data/projects.json`, preserving source links and image metadata. Update `reviewedOn` after a new source review, then run:

```sh
python3 scripts/build-project-directory.py
```

The generator replaces only the content between `PROJECT_DIRECTORY_START` and `PROJECT_DIRECTORY_END` in `index.html`. Commit both the data and generated HTML. The catalog is a reviewed snapshot; visitors’ browsers do not fetch GitHub data. All repository descriptions remain readable through native disclosure controls without JavaScript.

Maintain the featured gallery, narrative sections, and technical notes directly in `index.html`. Preserve section IDs, case-study IDs, and repository IDs so navigation and existing links continue to work.

## Local preview and checks

Run:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open http://127.0.0.1:8000. Before publishing, check phone and desktop layouts, the desktop gallery and its keyboard controls, both themes, reduced motion, navigation dialogs, case-study links, and directory search/filter/sort behavior. Check that every project image loads and that all content remains available without JavaScript. Compare catalog names with the account’s public repository list when refreshing its snapshot.

## GitHub Pages

Site: https://vaidehi2510.github.io

Repository: https://github.com/Vaidehi2510/Vaidehi2510.github.io

GitHub Pages publishes from the root of the `main` branch. `.nojekyll` tells GitHub to serve the static files directly. Commit and push reviewed changes to `main` to trigger publication.

The local `resume.pdf` is excluded from Git and is not published.
