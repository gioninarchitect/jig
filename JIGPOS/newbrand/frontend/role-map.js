/**
 * role-map.js — Origin Retail Platform
 * Master Role Dashboard Map: data model + rendering logic (MVC controller/model)
 *
 * Data canonical as of 2026-06-01.
 * Law references are placeholders pending medicines-law specialist sign-off.
 */

'use strict';

/* ─────────────────────────────────────────────
   DATA MODEL
   ───────────────────────────────────────────── */

const ROLE_MAP_DATA = {
  lanes: [
    {
      id: 'first-mile',
      label: 'First Mile',
      subtitle: 'ILCO Farm & Cultivation',
      icon: 'fa-seedling',
      accentVar: '--lane-first',
      roles: [
        {
          id: 'cultivation-manager',
          title: 'Cultivation Manager',
          dashboard: 'cultivation-dashboard.html',
          dashboardLabel: 'Open Dashboard',
          missing: false,
          innovation: false,
          kpis: [
            'Batch yield vs target',
            'GACP compliance %',
            'Environmental specs met'
          ],
          sops: [
            'GACP cultivation SOP',
            'Pest management SOP',
            'Batch documentation SOP'
          ],
          law: 'SAHPRA 22C(1)(b)',
          lawNote: null
        },
        {
          id: 'farm-qa-manager',
          title: 'Farm QA Manager',
          subtitle: 'Keke',
          dashboard: 'gmp-compliance.html',
          dashboardLabel: 'Open Dashboard',
          missing: false,
          innovation: false,
          kpis: [
            'CAPA close rate',
            'Audit score %',
            'Deviations per month'
          ],
          sops: [
            'GMP documentation SOP',
            'CAPA SOP',
            'Deviation reporting SOP'
          ],
          law: 'SAHPRA GMP · SAPC GPP',
          lawNote: null
        },
        {
          id: 'stock-intake',
          title: 'Stock Intake / Receiving Officer',
          dashboard: 'stock-receiving-app.html',
          dashboardLabel: 'Open Dashboard',
          missing: false,
          innovation: false,
          kpis: [
            '% received with COA',
            'Quarantine flag rate',
            'Intake within 24h of arrival'
          ],
          sops: [
            'Stock intake SOP',
            'Quarantine SOP',
            'Batch verification SOP'
          ],
          law: 'Medicines Act S38 · SAHPRA GMP',
          lawNote: null
        },
        {
          id: 'inventory-manager',
          title: 'Inventory Manager',
          dashboard: 'inventory-manager-dashboard.html',
          dashboardLabel: 'Open Dashboard',
          missing: false,
          innovation: false,
          kpis: [
            'Stock accuracy %',
            'Photo verification rate',
            'Reorder alert response time'
          ],
          sops: [
            'SA GMP stocktake SOP',
            'SAHPRA reporting SOP'
          ],
          law: 'Medicines Act S38 · SAHPRA 22C',
          lawNote: null
        }
      ]
    },
    {
      id: 'middle-mile',
      label: 'Middle Mile',
      subtitle: 'GMP Processing & Logistics',
      icon: 'fa-truck-fast',
      accentVar: '--lane-middle',
      roles: [
        {
          id: 'gmp-lab-manager',
          title: 'GMP Lab / Processing Manager',
          dashboard: null,
          dashboardLabel: null,
          missing: true,
          innovation: false,
          kpis: [
            'Batch release time',
            'QA approval %',
            'Label accuracy'
          ],
          sops: [
            'GMP processing SOP',
            'Batch release SOP'
          ],
          law: 'Section 22A (GMP batch release)',
          lawNote: null
        },
        {
          id: 'driver',
          title: 'Driver / Pharmaceutical Courier',
          dashboard: 'driver-app.html',
          dashboardLabel: 'Open Driver App',
          missing: false,
          innovation: false,
          kpis: [
            '0 failed deliveries without protocol',
            '100% temperature logs completed',
            '0 co-mingling incidents'
          ],
          sops: [
            'GPP Rule 2.7.5 transport SOP',
            'Failed delivery SOP',
            'Cold chain SOP'
          ],
          law: 'GPP Rule 2.7.5 · Medicines Act S38/39',
          lawNote: null
        },
        {
          id: 'grad-pharmacist-courier',
          title: 'Graduate Pharmacist Courier',
          dashboard: 'driver-app.html',
          dashboardLabel: 'Open Driver App',
          missing: false,
          innovation: true,
          innovationNote: 'Community service pharmacist as courier — a registered person under the Medicines Act who can legally handle scheduled medicines in transit. This hybrid role reduces regulatory exposure on every delivery run.',
          kpis: [
            '0 failed deliveries without protocol',
            '100% temperature logs completed',
            'Dispensing accuracy on handover'
          ],
          sops: [
            'GPP Rule 2.7.5 transport SOP',
            'Failed delivery SOP',
            'Cold chain SOP'
          ],
          law: 'Pharmacy Act S35A · Medicines Act S38/39',
          lawNote: 'Registered person exception'
        },
        {
          id: 'dispatch-manager',
          title: 'Dispatch / Logistics Manager',
          dashboard: 'dispatch-app.html',
          dashboardLabel: 'Open Dashboard',
          missing: false,
          innovation: false,
          kpis: [
            'On-time delivery %',
            'Cold chain breach rate',
            'Chain of custody completion %'
          ],
          sops: [
            'Dispatch SOP',
            'Armored transit SOP'
          ],
          law: 'GWDP (Good Wholesaling & Distribution Practices)',
          lawNote: null
        },
        {
          id: 'packer',
          title: 'Packer',
          dashboard: 'packer-app.html',
          dashboardLabel: 'Open Packer App',
          missing: false,
          innovation: false,
          kpis: [
            'Labeling accuracy',
            'Sealing compliance',
            'PIL inclusion rate'
          ],
          sops: [
            'GMP packing SOP',
            'Labeling SOP',
            'PIL SOP'
          ],
          law: 'Section 22A (batch serialization) · Medicines Act S38',
          lawNote: null
        }
      ]
    },
    {
      id: 'last-mile',
      label: 'Last Mile',
      subtitle: 'Retail Pharmacy — Potchefstroom & Network Nodes',
      icon: 'fa-shop',
      accentVar: '--lane-last',
      roles: [
        {
          id: 'responsible-pharmacist',
          title: 'Responsible Pharmacist (RP)',
          dashboard: 'owner-dashboard.html',
          dashboardLabel: 'Open Dashboard',
          missing: false,
          innovation: false,
          kpis: [
            '0 unverified S21 dispenses',
            'Prescription verification %',
            'Patient counseling completion'
          ],
          sops: [
            'Schedule 6 dispensing SOP',
            'Section 21 verification SOP',
            'Patient counseling SOP'
          ],
          law: 'Pharmacy Act S16+22 · S22A · SAPC GPP',
          lawNote: null
        },
        {
          id: 'pharmacy-intern',
          title: 'Pharmacy Intern',
          dashboard: null,
          dashboardLabel: null,
          missing: true,
          innovation: false,
          kpis: [
            'Competency log completeness %',
            'Supervised dispense accuracy',
            'SOP acknowledgment %'
          ],
          sops: [
            'Intern supervision SOP',
            'Patient counseling SOP',
            'Dispensing preparation SOP'
          ],
          law: 'Pharmacy Act S35A · SAPC intern rules',
          lawNote: null
        },
        {
          id: 'floor-staff',
          title: 'Floor Staff / Shop Assistant',
          dashboard: 'pos.html',
          dashboardLabel: 'Open POS',
          missing: false,
          innovation: false,
          kpis: [
            'Transaction accuracy %',
            'PIL handover rate',
            'Age verification compliance'
          ],
          sops: [
            'POS SOP',
            'OTC advice SOP',
            'Customer service SOP'
          ],
          law: 'Consumer Protection Act · Pharmacy Act',
          lawNote: null
        },
        {
          id: 'patient',
          title: 'Patient / Customer',
          dashboard: 'potchefstroom.html',
          dashboardLabel: 'Patient Journey',
          missing: false,
          innovation: false,
          isPatient: true,
          kpis: [],
          sops: [],
          law: 'Not staff — patient journey node',
          lawNote: null
        }
      ]
    },
    {
      id: 'platform',
      label: 'Platform Level',
      subtitle: 'System-Wide Administration & Finance',
      icon: 'fa-layer-group',
      accentVar: '--lane-platform',
      roles: [
        {
          id: 'super-admin',
          title: 'Super Admin',
          dashboard: 'admin.html',
          dashboardLabel: 'Open Admin',
          missing: false,
          innovation: false,
          accessNote: 'All access — all modules, all branches',
          kpis: [],
          sops: [],
          law: 'Internal governance — all applicable Acts',
          lawNote: null
        },
        {
          id: 'branch-manager',
          title: 'Branch Manager',
          dashboard: 'owner-dashboard.html',
          dashboardLabel: 'Open Dashboard',
          missing: false,
          innovation: false,
          kpis: [
            'Daily sales vs target',
            'Compliance score',
            'Staff training completion %'
          ],
          sops: [
            'Branch operations SOP',
            'Staff supervision SOP',
            'Daily reconciliation SOP'
          ],
          law: 'Pharmacy Act · Labour Relations Act',
          lawNote: null
        },
        {
          id: 'finance-manager',
          title: 'Finance Manager',
          dashboard: null,
          dashboardLabel: null,
          missing: true,
          innovation: false,
          kpis: [
            'Gross margin per product',
            'R65/g pool performance',
            'Node break-even tracking'
          ],
          sops: [
            'Financial reporting SOP',
            'Node P&L SOP',
            'Payroll compliance SOP'
          ],
          law: 'Companies Act · SARS · SAPC financial rules',
          lawNote: null
        },
        {
          id: 'qa-compliance',
          title: 'QA Compliance (System-Wide)',
          dashboard: 'gmp-compliance.html',
          dashboardLabel: 'Open Compliance',
          missing: false,
          innovation: false,
          kpis: [
            'Open CAPA count',
            'Audit schedule adherence',
            'Cross-node deviation rate'
          ],
          sops: [
            'CAPA management SOP',
            'Cross-node audit SOP',
            'Regulatory submission SOP'
          ],
          law: 'SAHPRA GMP · SAPC GPP · Medicines Act',
          lawNote: null
        }
      ]
    }
  ]
};

/* ─────────────────────────────────────────────
   HELPERS
   ───────────────────────────────────────────── */

function mileBadgeHTML(laneLabel) {
  return `<span class="mile-badge">${laneLabel}</span>`;
}

function comingSoonBadge() {
  return `<span class="badge-coming-soon"><i class="fa-solid fa-hourglass-half"></i> Coming Soon</span>`;
}

function innovationBadge() {
  return `<span class="badge-innovation"><i class="fa-solid fa-star"></i> Innovation</span>`;
}

function patientBadge() {
  return `<span class="badge-patient"><i class="fa-solid fa-user"></i> Patient Journey</span>`;
}

function renderKPIs(kpis) {
  if (!kpis || kpis.length === 0) return '';
  const items = kpis.map(k => `<li><i class="fa-solid fa-chart-line kpi-icon"></i>${k}</li>`).join('');
  return `
    <div class="card-section">
      <h4 class="section-label"><i class="fa-solid fa-bullseye"></i> KPIs</h4>
      <ul class="kpi-list">${items}</ul>
    </div>`;
}

function renderSOPs(sops) {
  if (!sops || sops.length === 0) return '';
  const items = sops.map(s => `<li><i class="fa-solid fa-file-lines sop-icon"></i>${s}</li>`).join('');
  return `
    <div class="card-section">
      <h4 class="section-label"><i class="fa-solid fa-clipboard-list"></i> SOPs</h4>
      <ul class="sop-list">${items}</ul>
    </div>`;
}

function renderLaw(role) {
  if (!role.law) return '';
  const note = role.lawNote ? `<span class="law-note">(${role.lawNote})</span>` : '';
  return `
    <div class="card-section card-law">
      <i class="fa-solid fa-scale-balanced law-icon"></i>
      <span class="law-text">${role.law}</span>
      ${note}
    </div>`;
}

function renderDashboardButton(role) {
  if (role.missing) {
    return `<div class="dashboard-btn-wrap">${comingSoonBadge()}</div>`;
  }
  if (role.isPatient) {
    return `<a href="${role.dashboard}" class="btn-dashboard btn-patient" target="_blank" rel="noopener">
      <i class="fa-solid fa-arrow-up-right-from-square"></i> ${role.dashboardLabel}
    </a>`;
  }
  return `<a href="${role.dashboard}" class="btn-dashboard" target="_blank" rel="noopener">
    <i class="fa-solid fa-arrow-up-right-from-square"></i> ${role.dashboardLabel}
  </a>`;
}

function renderRoleCard(role, lane) {
  const cardClasses = [
    'role-card',
    role.innovation ? 'role-card--innovation' : '',
    role.missing ? 'role-card--missing' : '',
    role.isPatient ? 'role-card--patient' : '',
    role.id === 'super-admin' ? 'role-card--super' : ''
  ].filter(Boolean).join(' ');

  const titleSubtitle = role.subtitle
    ? `<h3 class="role-title">${role.title} <span class="role-person">${role.subtitle}</span></h3>`
    : `<h3 class="role-title">${role.title}</h3>`;

  const accessNote = role.accessNote
    ? `<p class="access-note"><i class="fa-solid fa-infinity"></i> ${role.accessNote}</p>`
    : '';

  const innovationCallout = role.innovation && role.innovationNote
    ? `<div class="innovation-callout"><i class="fa-solid fa-lightbulb"></i> ${role.innovationNote}</div>`
    : '';

  const topBadges = [
    role.innovation ? innovationBadge() : '',
    role.isPatient ? patientBadge() : ''
  ].filter(Boolean).join(' ');

  return `
  <article class="${cardClasses}" data-role-id="${role.id}">
    <div class="card-header">
      <div class="card-header-top">
        ${mileBadgeHTML(lane.label)}
        ${topBadges}
      </div>
      ${titleSubtitle}
      ${accessNote}
    </div>
    ${innovationCallout}
    <div class="card-body">
      ${renderKPIs(role.kpis)}
      ${renderSOPs(role.sops)}
      ${renderLaw(role)}
    </div>
    <div class="card-footer">
      ${renderDashboardButton(role)}
    </div>
  </article>`;
}

function renderLane(lane) {
  const roleCards = lane.roles.map(role => renderRoleCard(role, lane)).join('');
  return `
  <section class="mile-lane mile-lane--${lane.id}" id="${lane.id}" aria-label="${lane.label}">
    <div class="lane-header">
      <div class="lane-icon"><i class="fa-solid ${lane.icon}"></i></div>
      <div class="lane-label-wrap">
        <h2 class="lane-title">${lane.label}</h2>
        <p class="lane-subtitle">${lane.subtitle}</p>
      </div>
      <div class="lane-role-count">${lane.roles.length} role${lane.roles.length !== 1 ? 's' : ''}</div>
    </div>
    <div class="lane-cards">
      ${roleCards}
    </div>
  </section>`;
}

/* ─────────────────────────────────────────────
   FILTER / SEARCH CONTROLLER
   ───────────────────────────────────────────── */

function normalise(str) {
  return str.toLowerCase().replace(/[^a-z0-9 ]/g, ' ');
}

function matchesQuery(role, query) {
  if (!query) return true;
  const q = normalise(query);
  const haystack = [
    role.title,
    role.subtitle || '',
    role.law || '',
    ...(role.kpis || []),
    ...(role.sops || [])
  ].map(normalise).join(' ');
  return q.split(' ').filter(Boolean).every(term => haystack.includes(term));
}

function applyFilter(query, mileFilter) {
  const allCards = document.querySelectorAll('.role-card');
  const allLanes = document.querySelectorAll('.mile-lane');

  let visibleCards = 0;

  ROLE_MAP_DATA.lanes.forEach(lane => {
    const laneEl = document.getElementById(lane.id);
    if (!laneEl) return;

    const showLane = !mileFilter || mileFilter === 'all' || mileFilter === lane.id;
    let laneVisible = false;

    lane.roles.forEach(role => {
      const cardEl = laneEl.querySelector(`[data-role-id="${role.id}"]`);
      if (!cardEl) return;
      const show = showLane && matchesQuery(role, query);
      cardEl.style.display = show ? '' : 'none';
      if (show) { laneVisible = true; visibleCards++; }
    });

    laneEl.style.display = (showLane && laneVisible) ? '' : (showLane && !laneVisible && query) ? 'none' : (showLane ? '' : 'none');
  });

  const noResults = document.getElementById('no-results');
  if (noResults) noResults.style.display = visibleCards === 0 ? 'block' : 'none';

  const countEl = document.getElementById('result-count');
  if (countEl) countEl.textContent = `${visibleCards} role${visibleCards !== 1 ? 's' : ''} shown`;
}

/* ─────────────────────────────────────────────
   SCROLL SPY — highlight active mile in nav
   ───────────────────────────────────────────── */

function initScrollSpy() {
  const laneIds = ROLE_MAP_DATA.lanes.map(l => l.id);
  const navLinks = document.querySelectorAll('.lane-nav-link');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(link => {
          link.classList.toggle('active', link.dataset.lane === entry.target.id);
        });
      }
    });
  }, { threshold: 0.25 });

  laneIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) observer.observe(el);
  });
}

/* ─────────────────────────────────────────────
   CARD EXPAND (click for detail overlay)
   ───────────────────────────────────────────── */

function initCardExpand() {
  document.querySelectorAll('.role-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('a, button')) return; // don't intercept link clicks
      card.classList.toggle('role-card--expanded');
    });
  });
}

/* ─────────────────────────────────────────────
   PRINT / EXPORT
   ───────────────────────────────────────────── */

function printMap() {
  window.print();
}

/* ─────────────────────────────────────────────
   INIT
   ───────────────────────────────────────────── */

function init() {
  const container = document.getElementById('role-map-lanes');
  if (!container) return;

  // Render all lanes
  container.innerHTML = ROLE_MAP_DATA.lanes.map(renderLane).join('');

  // Build lane nav pills
  const laneNav = document.getElementById('lane-nav');
  if (laneNav) {
    const allPill = `<button class="lane-nav-link active" data-lane="all">All Miles</button>`;
    const lanePills = ROLE_MAP_DATA.lanes.map(lane =>
      `<button class="lane-nav-link" data-lane="${lane.id}">${lane.label}</button>`
    ).join('');
    laneNav.innerHTML = allPill + lanePills;

    laneNav.addEventListener('click', (e) => {
      const btn = e.target.closest('.lane-nav-link');
      if (!btn) return;
      laneNav.querySelectorAll('.lane-nav-link').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const searchVal = document.getElementById('role-search')?.value || '';
      applyFilter(searchVal, btn.dataset.lane);
    });
  }

  // Search
  const searchInput = document.getElementById('role-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const activeMile = document.querySelector('.lane-nav-link.active')?.dataset.lane || 'all';
      applyFilter(searchInput.value, activeMile);
    });
  }

  // Print button
  const printBtn = document.getElementById('btn-print');
  if (printBtn) printBtn.addEventListener('click', printMap);

  // Role count badge
  const countEl = document.getElementById('result-count');
  const totalRoles = ROLE_MAP_DATA.lanes.reduce((sum, lane) => sum + lane.roles.length, 0);
  if (countEl) countEl.textContent = `${totalRoles} roles shown`;

  initScrollSpy();
  initCardExpand();
}

document.addEventListener('DOMContentLoaded', init);
