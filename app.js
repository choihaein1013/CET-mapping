(() => {
  const data = window.DASHBOARD_DATA;
  const $ = id => document.getElementById(id);
  const state = { view: "roles", roleId: data.roles[0].id, classification: "all", funding: "all", sector: "all", domain: "all", search: "", sort: "relevance", roleLimit: 30, catalogueLimit: 40, progressionDomain: data.progressions[0].domain };
  const courseById = new Map(data.courses.map(c => [c.id, c]));
  const roleById = new Map(data.roles.map(r => [r.id, r]));
  const mappingsByRole = new Map(data.roles.map(r => [r.id, []]));
  data.mappings.forEach(([roleId, courseId, score]) => mappingsByRole.get(roleId)?.push({ courseId, score }));
  const esc = value => String(value ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  const norm = value => String(value || "").toLowerCase();

  $("classificationChips").innerHTML = `<button class="chip is-active" data-class="all" type="button">All classifications</button>` + data.classifications.map(c => `<button class="chip" data-class="${esc(c)}" type="button">${esc(c)}</button>`).join("");
  [...new Set(data.roles.map(r => r.sector))].forEach(v => $("sectorFilter").insertAdjacentHTML("beforeend", `<option>${esc(v)}</option>`));
  [...new Set(data.roles.map(r => r.domain))].forEach(v => $("domainFilter").insertAdjacentHTML("beforeend", `<option>${esc(v)}</option>`));
  data.fundingOptions.forEach(v => $("fundingFilter").insertAdjacentHTML("beforeend", `<option>${esc(v)}</option>`));
  data.progressions.forEach(v => $("progressionDomain").insertAdjacentHTML("beforeend", `<option>${esc(v.domain)}</option>`));
  $("definitionGrid").innerHTML = data.classificationDefinitions.map(d => `<article class="definition-card"><div class="definition-code">${esc(d.code)}</div><div><h3>${esc(d.name)}</h3><p>${esc(d.definition)}</p></div></article>`).join("");
  $("dataNotes").innerHTML = Object.values(data.notes).map(n => `<li>${esc(n)}</li>`).join("");

  const fundingMatch = c => state.funding === "all" || c.fundingSchemes.includes(state.funding);
  function filteredRoles() {
    const q = norm(state.search);
    return data.roles.filter(r => (state.sector === "all" || r.sector === state.sector) && (state.domain === "all" || r.domain === state.domain) && (!q || norm(`${r.title} ${r.domain} ${r.sector}`).includes(q)));
  }
  function selectedRoleCourses() {
    const q = norm(state.search);
    return (mappingsByRole.get(state.roleId) || []).map(m => ({ ...courseById.get(m.courseId), ...m })).filter(c => c && (state.classification === "all" || c.classification === state.classification) && fundingMatch(c) && (!q || norm(`${c.title} ${c.organisation} ${c.funding}`).includes(q))).sort(sortCourses);
  }
  function filteredCatalogue() {
    const q = norm(state.search);
    return data.courses.filter(c => (state.classification === "all" || c.classification === state.classification) && fundingMatch(c) && (!q || norm(`${c.title} ${c.organisation} ${c.funding} ${c.targetGroup}`).includes(q))).sort(sortCourses);
  }
  function sortCourses(a, b) {
    if (state.sort === "title") return a.title.localeCompare(b.title);
    if (state.sort === "provider") return a.organisation.localeCompare(b.organisation) || a.title.localeCompare(b.title);
    return (b.score || 0) - (a.score || 0) || a.title.localeCompare(b.title);
  }
  function courseCard(c) {
    return `<article class="course-card"><div class="course-card__top"><h3>${esc(c.title)}</h3><span class="class-badge">${esc(c.classification)}</span></div><div class="course-meta"><span><b>Provider:</b> ${esc(c.organisation)}</span><span><b>Funding:</b> ${esc(c.funding)}</span>${c.targetGroup !== "Not stated" ? `<span><b>Target group:</b> ${esc(c.targetGroup)}</span>` : ""}</div></article>`;
  }
  function competencyPanel(role) {
    const tsc = role.tsc.length ? `<section class="competency-card"><div class="competency-heading"><span>Technical Skills & Competencies</span><span>${role.tsc.length}</span></div><div class="competency-list tsc-list">${role.tsc.map(s => `<div><span>${esc(s.title)}</span><small>Level ${esc(s.level)}</small></div>`).join("")}</div></section>` : "";
    const gsc = role.gsc.length ? `<section class="competency-card"><div class="competency-heading"><span>Top 5 Generic Skills & Competencies</span></div><ol class="gsc-list">${role.gsc.map(s => `<li><span>${esc(s.title)}</span><small>${esc(s.level)}</small></li>`).join("")}</ol></section>` : "";
    return tsc || gsc ? `<div class="competency-grid">${tsc}${gsc}</div>` : "";
  }
  function renderRoles() {
    const roles = filteredRoles();
    $("roleCount").textContent = `${roles.length} roles`;
    if (!roles.some(r => r.id === state.roleId) && roles.length) state.roleId = roles[0].id;
    $("roleList").innerHTML = roles.length ? roles.map(r => `<button class="role-item ${r.id === state.roleId ? "is-active" : ""}" data-role-id="${r.id}" type="button"><span class="role-item__count">${mappingsByRole.get(r.id).length}</span>${esc(r.title)}<span class="role-item__domain">${esc(r.domain)}</span></button>`).join("") : `<div class="empty">No roles match these filters.</div>`;
    const role = roleById.get(state.roleId); if (!role) return;
    $("roleProfile").innerHTML = `<div class="role-profile__header"><div class="eyebrow">${esc(role.sector)} · ${esc(role.domain)}</div><h2>${esc(role.title)}</h2>${role.description ? `<p>${esc(role.description)}</p>` : ""}</div>${competencyPanel(role)}`;
    const courses = selectedRoleCourses();
    $("resultCount").textContent = `${courses.length} courses`;
    $("resultsTitle").textContent = state.classification === "all" ? "Mapped courses" : `${state.classification} courses`;
    $("courseGrid").innerHTML = courses.length ? courses.slice(0, state.roleLimit).map(courseCard).join("") : `<div class="empty"><strong>No matching courses</strong><br>Try another classification, funding scheme or search term.</div>`;
    $("loadMoreButton").hidden = courses.length <= state.roleLimit;
  }
  function renderCatalogue() {
    const courses = filteredCatalogue();
    $("catalogueCount").textContent = `${courses.length} courses`;
    $("catalogueGrid").innerHTML = courses.length ? courses.slice(0, state.catalogueLimit).map(courseCard).join("") : `<div class="empty">No courses match these filters.</div>`;
    $("catalogueLoadMoreButton").hidden = courses.length <= state.catalogueLimit;
  }
  const sectorClass = sector => `sector-${norm(sector).replace(/[^a-z]+/g, "-")}`;
  function progressionNode(id, capstone = false) {
    const role = roleById.get(id); if (!role) return "";
    return `<button class="progression-node ${sectorClass(role.sector)} ${capstone ? "is-capstone" : ""}" data-progress-role-id="${id}" type="button">${esc(role.title)}</button>`;
  }
  function renderProgression() {
    const group = data.progressions.find(p => p.domain === state.progressionDomain); if (!group) return;
    const lastIds = group.tracks.map(t => t.roleIds.at(-1));
    const sharedCapstone = lastIds.length && lastIds.every(id => id === lastIds[0]) ? lastIds[0] : null;
    const capstone = sharedCapstone ? `<div class="progression-capstone">${progressionNode(sharedCapstone, true)}<div class="capstone-line"></div></div>` : "";
    $("progressionBoard").innerHTML = capstone + `<div class="track-grid">${group.tracks.map(track => {
      const ids = (sharedCapstone ? track.roleIds.slice(0, -1) : track.roleIds).slice().reverse();
      return `<section class="career-track"><h3>${esc(track.name)}</h3><div class="track-chain">${ids.map((id, i) => `${progressionNode(id)}${i < ids.length - 1 ? `<div class="progression-arrow">↑</div>` : ""}`).join("") || `<div class="track-joins">Connects to the shared senior role above</div>`}</div></section>`;
    }).join("")}</div>`;
    const moves = data.lateralMoves[state.progressionDomain] || [];
    $("lateralPanel").innerHTML = moves.length ? `<strong>Lateral movement opportunities</strong><div>${moves.map(x => `<button class="lateral-chip" data-lateral-domain="${esc(x)}" type="button">${esc(x)}</button>`).join("")}</div>` : `<strong>Vertical pathway shown</strong><span>No cross-domain lateral path is highlighted for this domain.</span>`;
  }
  function render() {
    const viewElements = {
      roles: $("roleView"),
      catalogue: $("catalogueView"),
      progression: $("progressionView"),
      guide: $("guideView"),
    };
    Object.entries(viewElements).forEach(([view, element]) => { element.hidden = state.view !== view; });
    $("courseFilters").hidden = !["roles", "catalogue"].includes(state.view);
    $("sectorField").hidden = state.view === "catalogue"; $("domainField").hidden = state.view === "catalogue";
    $("searchLabel").textContent = state.view === "roles" ? "Search roles or courses" : "Search all courses";
    document.querySelectorAll(".view-tab").forEach(b => b.classList.toggle("is-active", b.dataset.view === state.view));
    document.querySelectorAll(".chip").forEach(b => b.classList.toggle("is-active", b.dataset.class === state.classification));
    renderRoles(); renderCatalogue(); renderProgression();
  }
  function exportCsv(rows, filename) {
    const quote = v => `"${String(v ?? "").replaceAll('"','""')}"`;
    const table = [["Course ID","Course title","Classification","Provider","Funding","Target group"], ...rows.map(c => [c.id,c.title,c.classification,c.organisation,c.funding,c.targetGroup])];
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([table.map(r => r.map(quote).join(",")).join("\n")], {type:"text/csv"})); a.download = filename; a.click(); URL.revokeObjectURL(a.href);
  }
  document.addEventListener("click", e => {
    const roleButton = e.target.closest("[data-role-id]"); if (roleButton) { state.roleId = Number(roleButton.dataset.roleId); state.roleLimit = 30; render(); }
    const chip = e.target.closest("[data-class]"); if (chip) { state.classification = chip.dataset.class; state.roleLimit = 30; state.catalogueLimit = 40; render(); }
    const view = e.target.closest("[data-view]"); if (view) { state.view = view.dataset.view; state.search = ""; $("globalSearch").value = ""; render(); }
    const progressRole = e.target.closest("[data-progress-role-id]"); if (progressRole) { state.roleId = Number(progressRole.dataset.progressRoleId); state.view = "roles"; state.search = ""; $("globalSearch").value = ""; render(); }
    const lateral = e.target.closest("[data-lateral-domain]"); if (lateral) { state.progressionDomain = lateral.dataset.lateralDomain; $("progressionDomain").value = state.progressionDomain; render(); }
  });
  $("globalSearch").addEventListener("input", e => { state.search = e.target.value; state.roleLimit = 30; state.catalogueLimit = 40; render(); });
  $("sectorFilter").addEventListener("change", e => { state.sector = e.target.value; render(); });
  $("domainFilter").addEventListener("change", e => { state.domain = e.target.value; render(); });
  $("fundingFilter").addEventListener("change", e => { state.funding = e.target.value; render(); });
  $("sortFilter").addEventListener("change", e => { state.sort = e.target.value; render(); });
  $("progressionDomain").addEventListener("change", e => { state.progressionDomain = e.target.value; render(); });
  $("loadMoreButton").addEventListener("click", () => { state.roleLimit += 30; render(); });
  $("catalogueLoadMoreButton").addEventListener("click", () => { state.catalogueLimit += 40; render(); });
  $("exportButton").addEventListener("click", () => exportCsv(selectedRoleCourses(), `courses-role-${state.roleId}.csv`));
  $("catalogueExportButton").addEventListener("click", () => exportCsv(filteredCatalogue(), "filtered-cet-courses.csv"));
  $("resetButton").addEventListener("click", () => { Object.assign(state, { classification:"all", funding:"all", sector:"all", domain:"all", search:"", sort:"relevance", roleLimit:30, catalogueLimit:40 }); $("globalSearch").value=""; $("sectorFilter").value="all"; $("domainFilter").value="all"; $("fundingFilter").value="all"; $("sortFilter").value="relevance"; render(); });
  render();
})();
