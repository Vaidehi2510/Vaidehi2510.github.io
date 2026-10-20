# vaidehi2510.github.io

My product design portfolio: a static website with no build step or runtime dependencies.

- `index.html`: project previews, expandable case studies, approach, experience, and contact.
- `styles.css`: responsive layout, light/dark themes, and motion styles.
- `script.js`: keyboard-accessible demo tabs, theme and motion preferences, case-study navigation, and email copying.
- `assets/fonts/`: self-hosted Bricolage Grotesque and DM Sans with their SIL Open Font Licenses.
- `favicon.svg` and `social-preview.png`: browser icon and link-sharing artwork.

The project previews are illustrative interface studies, not screenshots of measured production results. Case studies distinguish demo evidence, implementation features, and targets.

## GitHub Pages

Site: https://vaidehi2510.github.io

Repository: https://github.com/Vaidehi2510/Vaidehi2510.github.io

GitHub Pages publishes from the root of the `main` branch. The `.nojekyll` file tells GitHub to serve the static files directly.

To publish an update, edit the relevant files, then commit and push the changes to `main`. GitHub Pages redeploys automatically.

The local `resume.pdf` is excluded from Git and is not published.

## Local preview

Run `python3 -m http.server 8000 --bind 127.0.0.1` and open http://127.0.0.1:8000.

Before publishing, check phone and desktop layouts, keyboard navigation, both themes, reduced motion, and case-study links. Content and native case-study accordions remain available without JavaScript. Theme and motion preferences are stored locally in the browser.
