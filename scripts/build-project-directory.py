"""Render the reviewed repository catalog into index.html (standard library only)."""
from datetime import date, datetime
from html import escape
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parent.parent
START = '<!-- PROJECT_DIRECTORY_START -->'
END = '<!-- PROJECT_DIRECTORY_END -->'


def build():
    catalog = json.loads((ROOT / 'data/projects.json').read_text())
    repositories = catalog['repositories']
    names = [repo['name'] for repo in repositories]
    if len(names) != len(set(names)):
        raise ValueError('Each repository must appear exactly once.')
    total = len(repositories)
    forks = sum(repo['fork'] for repo in repositories)
    reviewed = date.fromisoformat(catalog['reviewedOn']).strftime('%B %-d, %Y')
    cards = []
    for order, repo in enumerate(repositories):
        name, url, title = map(escape, [repo['name'], repo['url'], repo['title']])
        updated = datetime.fromisoformat(repo['pushedAt'].replace('Z', '+00:00')).strftime('%b %-d, %Y')
        categories = escape(' '.join(repo['categories']))
        stack = ''.join(f'<span>{escape(tool)}</span>' for tool in repo['stack'])
        image = repo['image']
        thumbnail = (
            f'<a class="repo-image-link" href="{url}" tabindex="-1" aria-hidden="true">'
            f'<img class="repo-image" src="{escape(image["path"])}" alt="" loading="lazy" '
            f'decoding="async" width="{int(image["width"])}" height="{int(image["height"])}">'
            f'<span class="repo-image-caption">{escape(image["caption"])}</span></a>'
        )
        attribution = ''
        if repo.get('upstream'):
            parent = repo['upstream'].removeprefix('https://github.com/')
            attribution = f'<p class="repo-attribution">Fork of <a href="{escape(repo["upstream"])}">{escape(parent)}</a></p>'
        links = [f'<a href="{url}" aria-label="View {name} on GitHub">Source code <span aria-hidden="true">↗</span></a>']
        if repo.get('caseStudy'):
            links.append(f'<a href="#{escape(repo["caseStudy"])}" data-case-link>Engineering notes <span aria-hidden="true">↗</span></a>')
        elif repo.get('contributions'):
            links.append('<a href="#upstream">My contributions <span aria-hidden="true">↗</span></a>')
        elif repo.get('demo'):
            links.append(f'<a href="{escape(repo["demo"])}">Visit site <span aria-hidden="true">↗</span></a>')
        cards.append(f'''<article class="repo-card reveal" id="repo-{name}" data-name="{name}" data-category="{categories}" data-updated="{escape(repo['pushedAt'])}" data-order="{order}">
  {thumbnail}
  <div class="repo-topline"><span class="repo-area">{escape(repo['area'])}</span><span class="repo-scope{' is-fork' if repo['fork'] else ''}">{escape(repo['scope'])}</span></div>
  <h3><a href="{url}">{title}</a></h3>
  <p class="repo-slug">{name}</p>
  <details class="repo-description-disclosure"><summary>About this project</summary><p class="repo-description">{escape(repo['description'])}</p></details>
  {attribution}
  <div class="repo-stack" aria-label="Technologies">{stack}</div>
  <div class="repo-links">{''.join(links)}</div>
  <p class="repo-date">Code updated <time datetime="{escape(repo['pushedAt'][:10])}">{updated}</time></p>
</article>''')
    filters = [('all','All projects'),('detection','Detection & response'),('appsec','AppSec & DevSecOps'),('cloud','Infrastructure'),('ai','AI systems'),('foundations','Software & labs'),('forks','Forks')]
    buttons = ''.join(f'<button type="button" data-project-filter="{key}" aria-pressed="{str(key == "all").lower()}">{escape(label)}</button>' for key,label in filters)
    rendered = f'''<section class="directory-section section-pad" id="projects" aria-labelledby="projects-heading"><div class="wrap">
  <div class="section-heading reveal"><div><p class="eyebrow">05 / The complete collection</p><h2 id="projects-heading">The things<br><span class="muted-heading">I’m working on.</span></h2></div><p>All {total} public repositories, from security tooling to infrastructure labs and supporting software. The {forks} public forks are labeled with their upstream projects.</p></div>
  <div class="directory-summary"><span><strong>{total}</strong> public repositories</span><span><strong>{total-forks}</strong> non-fork repositories</span><span><strong>{forks}</strong> public forks</span><a href="{escape(catalog['profileUrl'])}?tab=repositories">GitHub profile <span aria-hidden="true">↗</span></a></div>
  <div class="project-controls requires-js" hidden>
    <div class="project-toolbar"><label class="project-search-label" for="project-search"><span>Search projects</span><span class="search-field"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><input id="project-search" type="search" placeholder="Try Python, Docker, triage, or a repository…" autocomplete="off" aria-controls="project-grid"></span></label><label class="project-sort-label" for="project-sort"><span>Sort by</span><select id="project-sort" aria-controls="project-grid"><option value="featured">Featured order</option><option value="name">Repository name</option><option value="updated">Recently updated</option></select></label></div>
    <div class="project-filters" role="group" aria-label="Filter projects by area">{buttons}</div>
  </div>
  <div class="directory-status"><p id="project-count" role="status" aria-live="polite">{total} of {total} repositories</p><p>Reviewed <time datetime="{catalog['reviewedOn']}">{reviewed}</time></p></div>
  <div class="repo-grid" id="project-grid">{''.join(cards)}</div>
  <div class="project-empty" id="project-empty" hidden><span aria-hidden="true">⌕</span><h3>No projects match that search.</h3><p>Try another keyword or clear your filters to see every repository.</p><button type="button" id="reset-project-filters">Show all projects <span aria-hidden="true">↗</span></button></div>
  <p class="directory-note">A source-reviewed snapshot of my public GitHub account. Project notes distinguish implemented capabilities, learning labs, and simulations; fork listings credit their upstream authors.</p>
</div></section>'''
    index = ROOT / 'index.html'
    source = index.read_text()
    if source.count(START) != 1 or source.count(END) != 1:
        raise ValueError('Expected one pair of project directory markers in index.html.')
    before, rest = source.split(START)
    _, after = rest.split(END)
    output = before + START + '\n' + rendered + '\n    ' + END + after
    index.write_text('\n'.join(line.rstrip() for line in output.splitlines()) + '\n')
    print(f'Rendered {total} unique public repositories ({forks} forks).')


if __name__ == '__main__':
    build()
