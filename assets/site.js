const repoReleasesUrl = "https://github.com/CaiqueCosta/bittersweet/releases";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "Unknown date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function versionLabel(release) {
  return release.version ? `v${release.version}` : release.name || "Untitled release";
}

function markdownToHtml(markdown) {
  const lines = String(markdown || "").split(/\r?\n/);
  let html = "";
  let inList = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      continue;
    }

    if (line.startsWith("- ")) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += `<li>${escapeHtml(line.slice(2))}</li>`;
      continue;
    }

    if (inList) {
      html += "</ul>";
      inList = false;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      html += `<h3>${escapeHtml(heading[2])}</h3>`;
    } else {
      html += `<p>${escapeHtml(line)}</p>`;
    }
  }

  if (inList) {
    html += "</ul>";
  }

  return html || "<p>No release notes were provided.</p>";
}

function sortedReleases(releases) {
  return [...releases].sort((a, b) => {
    const latestDelta = Number(Boolean(b.isLatest)) - Number(Boolean(a.isLatest));
    if (latestDelta) return latestDelta;
    return new Date(b.date || 0) - new Date(a.date || 0);
  });
}

async function loadReleases() {
  try {
    const response = await fetch("releases.json", { cache: "no-store" });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? sortedReleases(data) : [];
  } catch {
    return [];
  }
}

function renderHome(releases) {
  const latest = releases[0];
  const download = document.querySelector("[data-latest-download]");
  const summary = document.querySelector("[data-latest-summary]");
  if (!download || !summary) return;

  if (!latest) {
    download.textContent = "Download coming soon";
    download.setAttribute("aria-disabled", "true");
    summary.textContent = "The first public test build will appear here after v0.1.0 is released.";
    return;
  }

  const primaryUrl = latest.dmgUrl || latest.zipUrl || latest.htmlUrl;
  if (primaryUrl) {
    download.href = primaryUrl;
    download.removeAttribute("aria-disabled");
    download.textContent = `Download ${versionLabel(latest)}`;
  }

  const format = latest.dmgUrl ? "DMG" : latest.zipUrl ? "ZIP" : "GitHub release";
  summary.textContent = `${versionLabel(latest)} · ${format} · ${latest.minimumMacOS || "macOS 14+"} · ${formatDate(latest.date)}`;
}

function assetButton(label, url, primary = false) {
  if (!url) return "";
  return `<a class="button ${primary ? "primary" : "secondary"}" href="${escapeHtml(url)}">${escapeHtml(label)}</a>`;
}

function renderArchive(releases) {
  const list = document.querySelector("[data-archive-list]");
  if (!list) return;

  if (!releases.length) {
    list.innerHTML = `<p class="muted">No public releases are available yet. Check <a href="${repoReleasesUrl}">GitHub Releases</a> after v0.1.0 ships.</p>`;
    return;
  }

  list.innerHTML = releases.map((release) => `
    <article class="release-item">
      <h2>${escapeHtml(versionLabel(release))}${release.isLatest ? ' <span class="pill">Latest</span>' : ""}</h2>
      <div class="release-meta">
        <span>${escapeHtml(formatDate(release.date))}</span>
        <span>${escapeHtml(release.minimumMacOS || "macOS 14+")}</span>
      </div>
      <div class="release-actions">
        ${assetButton("Download DMG", release.dmgUrl, true)}
        ${assetButton("Download ZIP", release.zipUrl)}
        ${assetButton("Release notes", release.htmlUrl)}
      </div>
    </article>
  `).join("");
}

function renderReleaseNotes(releases) {
  const list = document.querySelector("[data-release-notes-list]");
  if (!list) return;

  if (!releases.length) {
    list.innerHTML = `<p class="muted">No release notes are available yet. Check <a href="${repoReleasesUrl}">GitHub Releases</a> after v0.1.0 ships.</p>`;
    return;
  }

  list.innerHTML = releases.map((release) => `
    <article class="note-item">
      <h2>${escapeHtml(versionLabel(release))}${release.isLatest ? ' <span class="pill">Latest</span>' : ""}</h2>
      <div class="release-meta">
        <span>${escapeHtml(formatDate(release.date))}</span>
        <span>${escapeHtml(release.minimumMacOS || "macOS 14+")}</span>
      </div>
      <div class="note-body">${markdownToHtml(release.body)}</div>
      <div class="release-actions">
        ${assetButton("Open on GitHub", release.htmlUrl)}
      </div>
    </article>
  `).join("");
}

loadReleases().then((releases) => {
  renderHome(releases);
  renderArchive(releases);
  renderReleaseNotes(releases);
});
