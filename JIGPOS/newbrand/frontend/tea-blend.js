/**
 * Origin Tea Blend Wizard — tea-blend.js
 * MVC architecture: Model (data/state), View (DOM rendering), Controller (interactions/routing)
 *
 * Screens: 0=Landing | 1=Auth | 2=Profile | 3=Wizard | 4=Library
 */

'use strict';

/* ============================================================
   MODEL — Data & State
   ============================================================ */

const INGREDIENTS = [
  {
    id: 'blue-lotus',
    name: 'Blue Lotus',
    icon: 'ph-flower-lotus-fill',
    color: '#818CF8',
    flavour: 'Floral, subtle sweet',
    benefits: ['Relaxation & calm', 'Vivid dreaming', 'Mild euphoria', 'Stress relief'],
    brewTemp: '90°C', brewTime: '5 min',
    note: 'Ceremonial herb, use sparingly'
  },
  {
    id: 'calendula',
    name: 'Calendula',
    icon: 'ph-sun-fill',
    color: '#F59E0B',
    flavour: 'Earthy, slightly bitter',
    benefits: ['Skin health', 'Anti-inflammatory', 'Wound healing', 'Lymphatic support'],
    brewTemp: '95°C', brewTime: '7 min'
  },
  {
    id: 'chamomile',
    name: 'Chamomile',
    icon: 'ph-flower-fill',
    color: '#FDE68A',
    flavour: 'Apple-like, honey, mild',
    benefits: ['Deep sleep support', 'Anxiety relief', 'Digestive calm', 'Anti-spasmodic'],
    brewTemp: '90°C', brewTime: '5 min'
  },
  {
    id: 'dandelion',
    name: 'Dandelion',
    icon: 'ph-leaf-fill',
    color: '#84CC16',
    flavour: 'Earthy, slightly bitter, roasted',
    benefits: ['Liver detox', 'Digestive bitters', 'Diuretic', 'Rich in vitamins A, C, K'],
    brewTemp: '100°C', brewTime: '10 min'
  },
  {
    id: 'echinacea',
    name: 'Echinacea',
    icon: 'ph-shield-fill',
    color: '#A78BFA',
    flavour: 'Earthy, slightly spicy, tingling',
    benefits: ['Immune boost', 'Cold & flu defence', 'Anti-viral', 'Upper respiratory support'],
    brewTemp: '95°C', brewTime: '8 min'
  },
  {
    id: 'ginger',
    name: 'Ginger',
    icon: 'ph-fire-fill',
    color: '#F97316',
    flavour: 'Spicy, warming, zesty',
    benefits: ['Nausea relief', 'Circulation boost', 'Anti-inflammatory', 'Digestive fire'],
    brewTemp: '100°C', brewTime: '10 min'
  },
  {
    id: 'hops',
    name: 'Hops',
    icon: 'ph-plant-fill',
    color: '#65A30D',
    flavour: 'Bitter, earthy, slightly floral',
    benefits: ['Sleep induction', 'Anxiety reduction', 'Sedative effect', 'Hormonal balance'],
    brewTemp: '90°C', brewTime: '5 min',
    note: 'Not recommended during pregnancy'
  },
  {
    id: 'lavender',
    name: 'Lavender',
    icon: 'ph-sparkle-fill',
    color: '#C084FC',
    flavour: 'Floral, sweet, aromatic',
    benefits: ['Relaxation', 'Headache relief', 'Mood lift', 'Sleep quality'],
    brewTemp: '85°C', brewTime: '4 min',
    note: 'Use light-handed — potent'
  },
  {
    id: 'lemon-balm',
    name: 'Lemon Balm',
    icon: 'ph-drop-fill',
    color: '#4ADE80',
    flavour: 'Lemon, mint, slightly floral',
    benefits: ['Cognitive calm', 'Anxiety relief', 'Digestion support', 'Anti-viral'],
    brewTemp: '90°C', brewTime: '5 min'
  },
  {
    id: 'passionflower',
    name: 'Passionflower',
    icon: 'ph-star-four-fill',
    color: '#F472B6',
    flavour: 'Mild, earthy, slightly floral',
    benefits: ['Deep relaxation', 'Insomnia relief', 'Anxiety & racing thoughts', 'Natural sedative'],
    brewTemp: '90°C', brewTime: '8 min'
  },
  {
    id: 'peppermint',
    name: 'Peppermint',
    icon: 'ph-wind-fill',
    color: '#2DD4BF',
    flavour: 'Cool, refreshing, minty',
    benefits: ['Digestive relief', 'Headache relief', 'Mental clarity', 'Sinus clearing'],
    brewTemp: '90°C', brewTime: '5 min'
  },
  {
    id: 'rooibos',
    name: 'Rooibos',
    icon: 'ph-coffee-fill',
    color: '#C9A84C',
    flavour: 'Nutty, sweet, earthy, South African',
    benefits: ['Rich in antioxidants', 'Caffeine-free', 'Bone health', 'Skin radiance'],
    brewTemp: '100°C', brewTime: '5 min',
    note: 'South African native — our foundation herb'
  },
  {
    id: 'rose',
    name: 'Rose',
    icon: 'ph-flower-tulip-fill',
    color: '#FB7185',
    flavour: 'Delicate floral, slightly sweet',
    benefits: ['Heart opening', 'Emotional balance', 'Antioxidant-rich', 'Skin glow'],
    brewTemp: '85°C', brewTime: '4 min'
  },
  {
    id: 'sage',
    name: 'Sage',
    icon: 'ph-leaf-fill',
    color: '#6EE7B7',
    flavour: 'Savoury, earthy, slightly bitter',
    benefits: ['Memory & focus', 'Menopause support', 'Antimicrobial', 'Sore throat relief'],
    brewTemp: '95°C', brewTime: '7 min',
    note: 'Avoid in high doses during pregnancy'
  }
];

const BOOSTS = [
  { id: 'lions-mane', name: "Lion's Mane", icon: 'ph-brain-fill', color: '#93C5FD', benefits: ['Focus & clarity', 'Nerve regeneration', 'Memory'] },
  { id: 'reishi', name: 'Reishi', icon: 'ph-moon-fill', color: '#6366F1', benefits: ['Immune modulation', 'Stress adapt', 'Deep sleep'] },
  { id: 'chaga', name: 'Chaga', icon: 'ph-shield-check-fill', color: '#78716C', benefits: ['Antioxidant king', 'Immune fortress', 'Anti-tumour research'] },
  { id: 'cordyceps', name: 'Cordyceps', icon: 'ph-lightning-fill', color: '#F59E0B', benefits: ['Energy & stamina', 'Oxygen utilisation', 'Athletic performance'] },
  { id: 'ashwagandha', name: 'Ashwagandha', icon: 'ph-heartbeat-fill', color: '#F97316', benefits: ['Stress adaptogen', 'Cortisol balance', 'Vitality'] },
  { id: 'sceletium', name: 'Sceletium (Kanna)', icon: 'ph-smiley-fill', color: '#4ADE80', benefits: ['Mood elevation', 'Anxiety relief', 'SA native plant'] }
];

const LEVELS = [
  { name: 'Apprentice',     minXP: 0,   badge: 'ph-student-fill',     color: '#9CA3AF' },
  { name: 'Herbalist',      minXP: 100, badge: 'ph-leaf-fill',         color: '#4ADE80' },
  { name: 'Tea Alchemist',  minXP: 300, badge: 'ph-flask-fill',        color: '#C9A84C' },
  { name: 'Master Blender', minXP: 600, badge: 'ph-crown-simple-fill', color: '#F59E0B' },
];

const XP_EVENTS = {
  PROFILE_NAME:  15,
  HEALTH_GOALS:  25,
  ALLERGIES:     15,
  BREW_STYLE:    10,
  FREQUENCY:     10,
  FIRST_BLEND:   50,
  EACH_BLEND:    25,
  BLEND_SHARED:  30,
  RETURN_VISIT:  10,
};

// Benefit keyword → wellness tag mapping
const BENEFIT_TO_TAG = {
  sleep:       ['sleep', 'deep sleep', 'insomnia', 'sleep induction', 'sleep quality', 'vivid dreaming', 'sedative'],
  energy:      ['energy', 'stamina', 'circulation', 'vitality', 'athletic', 'oxygen'],
  immunity:    ['immune', 'immunity', 'anti-viral', 'antioxidant', 'anti-tumour', 'antimicrobial', 'cold & flu', 'upper respiratory'],
  stress:      ['stress', 'anxiety', 'calm', 'relax', 'relaxation', 'adaptogen', 'cortisol', 'sedative', 'racing thoughts'],
  digestion:   ['digest', 'digestive', 'liver', 'diuretic', 'nausea', 'bitters'],
  skin:        ['skin', 'wound healing', 'lymphatic', 'glow'],
  focus:       ['focus', 'clarity', 'memory', 'cognitive', 'mental clarity', 'nerve', 'memory & focus'],
  hormones:    ['hormonal', 'menopause', 'mood', 'heart opening', 'emotional'],
};

const TAG_LABELS = {
  sleep: 'SLEEP', energy: 'ENERGY', immunity: 'IMMUNITY',
  stress: 'CALM', digestion: 'DIGESTION', skin: 'SKIN',
  focus: 'FOCUS', hormones: 'HORMONES',
};

// ---- Application State ----
const State = {
  currentScreen: 0,
  email: '',
  blendToken: localStorage.getItem('blendToken') || null,
  user: JSON.parse(localStorage.getItem('blendUser') || 'null'),
  profile: JSON.parse(localStorage.getItem('blendProfile') || 'null'),
  xp: parseInt(localStorage.getItem('blendXP') || '0', 10),
  earnedXPEvents: JSON.parse(localStorage.getItem('blendXPEvents') || '[]'),
  selectedIngredients: [],   // array of ingredient ids
  selectedBoosts: [],         // array of boost ids
  blendName: '',
  savedBlends: JSON.parse(localStorage.getItem('savedBlends') || '[]'),
  resendTimer: null,
  isFirstBlend: !localStorage.getItem('savedBlends') || JSON.parse(localStorage.getItem('savedBlends') || '[]').length === 0,
};

// ---- Helpers ----
function saveState() {
  localStorage.setItem('blendXP', String(State.xp));
  localStorage.setItem('blendXPEvents', JSON.stringify(State.earnedXPEvents));
  localStorage.setItem('savedBlends', JSON.stringify(State.savedBlends));
  if (State.user) localStorage.setItem('blendUser', JSON.stringify(State.user));
  if (State.profile) localStorage.setItem('blendProfile', JSON.stringify(State.profile));
  if (State.blendToken) localStorage.setItem('blendToken', State.blendToken);
}

function getLevelInfo(xp) {
  let level = LEVELS[0];
  for (const l of LEVELS) {
    if (xp >= l.minXP) level = l;
  }
  const idx = LEVELS.indexOf(level);
  const nextLevel = LEVELS[idx + 1] || null;
  let progress = 100;
  if (nextLevel) {
    const range = nextLevel.minXP - level.minXP;
    progress = Math.min(100, Math.round(((xp - level.minXP) / range) * 100));
  }
  return { level, nextLevel, progress };
}

function parseBrewTemp(str) {
  return parseInt(str, 10) || 0;
}

function parseBrewTime(str) {
  return parseInt(str, 10) || 0;
}

/* ============================================================
   VIEW — DOM Rendering
   ============================================================ */

const View = {

  // --- Screen navigation ---
  navigateTo(screenIndex, direction = 'forward') {
    const screens = document.querySelectorAll('.screen');
    const current = document.querySelector('.screen--active');
    const target = document.querySelector(`[data-screen="${screenIndex}"]`);

    if (!target || target === current) return;

    const enterClass = direction === 'forward' ? 'screen--enter-right' : 'screen--enter-left';
    const exitClass  = direction === 'forward' ? 'screen--exit-left'  : 'screen--exit-right';

    // Reset all hidden screens
    screens.forEach(s => {
      if (s !== current && s !== target) {
        s.removeAttribute('hidden');
        s.className = s.className.replace(/screen--(active|enter-right|enter-left|exit-left|exit-right)/g, '').trim();
        s.setAttribute('hidden', '');
      }
    });

    // Prepare target
    target.removeAttribute('hidden');
    target.classList.remove('screen--active', 'screen--enter-right', 'screen--enter-left', 'screen--exit-left', 'screen--exit-right');
    target.classList.add(enterClass);

    // Force reflow
    void target.offsetHeight;

    // Animate
    requestAnimationFrame(() => {
      if (current) {
        current.classList.remove('screen--active');
        current.classList.add(exitClass);
        const onDone = () => {
          current.setAttribute('hidden', '');
          current.classList.remove(exitClass);
          current.removeEventListener('transitionend', onDone);
        };
        current.addEventListener('transitionend', onDone, { once: true });
      }
      target.classList.remove(enterClass);
      target.classList.add('screen--active');
    });

    State.currentScreen = screenIndex;
  },

  // --- XP display update ---
  updateXPDisplays() {
    const { level, nextLevel, progress } = getLevelInfo(State.xp);

    // Screen 2
    const xpBadge = document.getElementById('xp-badge-icon');
    const xpLevelName = document.getElementById('xp-level-name');
    const xpCurrent = document.getElementById('xp-current');
    const xpBarFill = document.getElementById('xp-bar-fill');
    const xpProgressBar = document.getElementById('xp-progressbar');
    const xpNextLabel = document.getElementById('xp-next-label');

    if (xpBadge) {
      xpBadge.className = `xp-badge-icon ${level.badge}`;
      xpBadge.style.color = level.color;
    }
    if (xpLevelName) { xpLevelName.textContent = level.name; xpLevelName.style.color = level.color; }
    if (xpCurrent) xpCurrent.textContent = State.xp;
    if (xpBarFill) xpBarFill.style.width = `${progress}%`;
    if (xpProgressBar) xpProgressBar.setAttribute('aria-valuenow', progress);
    if (xpNextLabel) xpNextLabel.textContent = nextLevel ? `${nextLevel.minXP - State.xp} XP to ${nextLevel.name}` : 'Max Level Reached';

    // Wizard mini
    const wizardBadge = document.getElementById('wizard-badge-icon');
    const wizardXP = document.getElementById('wizard-xp-display');
    if (wizardBadge) { wizardBadge.className = level.badge; wizardBadge.style.color = level.color; }
    if (wizardXP) wizardXP.textContent = `${State.xp} XP`;

    // Library
    const libBadge = document.getElementById('lib-badge-icon');
    const libLevelName = document.getElementById('lib-level-name');
    const libXPCurrent = document.getElementById('lib-xp-current');
    const libXPFill = document.getElementById('lib-xp-fill');
    const libXPBar = document.getElementById('lib-xp-progressbar');
    const libXPNext = document.getElementById('lib-xp-next');
    if (libBadge) { libBadge.className = level.badge; libBadge.style.color = level.color; }
    if (libLevelName) { libLevelName.textContent = level.name; libLevelName.style.color = level.color; }
    if (libXPCurrent) libXPCurrent.textContent = State.xp;
    if (libXPFill) libXPFill.style.width = `${progress}%`;
    if (libXPBar) libXPBar.setAttribute('aria-valuenow', progress);
    if (libXPNext) libXPNext.textContent = nextLevel ? `${nextLevel.minXP - State.xp} XP to ${nextLevel.name}` : 'Max Level!';
  },

  // --- Ingredient grid ---
  renderIngredientGrid() {
    const grid = document.getElementById('ingredient-grid');
    if (!grid) return;
    grid.innerHTML = '';

    INGREDIENTS.forEach(ing => {
      const card = this._buildIngCard(ing, State.selectedIngredients.includes(ing.id), 'ingredient');
      grid.appendChild(card);
    });

    this._updateSelectionCounter();
  },

  renderBoostGrid() {
    const grid = document.getElementById('boost-grid');
    if (!grid) return;
    grid.innerHTML = '';
    BOOSTS.forEach(b => {
      const card = this._buildIngCard(b, State.selectedBoosts.includes(b.id), 'boost');
      grid.appendChild(card);
    });
  },

  _buildIngCard(item, selected, type) {
    const li = document.createElement('li');
    li.className = 'ingredient-card' + (selected ? ' selected' : '');
    li.setAttribute('role', 'listitem');
    li.setAttribute('data-id', item.id);
    li.setAttribute('data-type', type);
    li.setAttribute('tabindex', '0');
    li.setAttribute('aria-pressed', selected ? 'true' : 'false');
    li.setAttribute('aria-label', `${item.name}${selected ? ', selected' : ''}`);
    li.style.setProperty('--card-color', item.color);

    // Disable unselected when at max for base herbs
    if (type === 'ingredient' && State.selectedIngredients.length >= 6 && !selected) {
      li.classList.add('disabled');
    }

    // Top 2 benefits
    const topBenefits = item.benefits.slice(0, 2);

    li.innerHTML = `
      <div class="card-checkmark" aria-hidden="true"><i class="ph-check-bold"></i></div>
      <i class="${item.icon} card-icon" aria-hidden="true" style="color:${item.color}"></i>
      <span class="card-name">${item.name}</span>
      <div class="card-benefits">
        ${topBenefits.map(b => `<span class="card-benefit-pill">${b}</span>`).join('')}
      </div>
    `;
    return li;
  },

  _updateSelectionCounter() {
    const counter = document.getElementById('base-counter');
    if (counter) counter.textContent = `${State.selectedIngredients.length} / 6 selected`;
  },

  // --- Donut chart (pure CSS conic-gradient) ---
  renderDonut() {
    const chart = document.getElementById('donut-chart');
    const legend = document.getElementById('donut-legend');
    const countEl = document.getElementById('donut-count');
    const empty = document.getElementById('wizard-empty');
    const brewSection = document.getElementById('brew-instructions');
    const benefitsPanel = document.getElementById('benefits-panel');
    const wellnessTags = document.getElementById('wellness-tags-panel');
    const notesPanel = document.getElementById('notes-panel');
    const saveBtn = document.getElementById('btn-save-blend');

    const allIds = [...State.selectedIngredients, ...State.selectedBoosts];
    const total = allIds.length;

    if (countEl) countEl.textContent = total;

    if (total === 0) {
      if (chart) chart.style.background = 'conic-gradient(var(--dark-5) 0deg 360deg)';
      if (legend) legend.innerHTML = '';
      if (empty) empty.removeAttribute('hidden');
      if (brewSection) brewSection.setAttribute('hidden', '');
      if (benefitsPanel) benefitsPanel.setAttribute('hidden', '');
      if (wellnessTags) wellnessTags.setAttribute('hidden', '');
      if (notesPanel) notesPanel.setAttribute('hidden', '');
      if (saveBtn) { saveBtn.disabled = true; saveBtn.setAttribute('aria-disabled', 'true'); }
      return;
    }

    if (empty) empty.setAttribute('hidden', '');

    // Build conic-gradient stops (equal slices)
    const slice = 360 / total;
    let conicParts = [];
    let legendItems = [];
    let currentDeg = 0;

    const allItems = [
      ...State.selectedIngredients.map(id => ({ ...INGREDIENTS.find(i => i.id === id), _type: 'ingredient' })),
      ...State.selectedBoosts.map(id => ({ ...BOOSTS.find(b => b.id === id), _type: 'boost' })),
    ].filter(Boolean);

    allItems.forEach((item, idx) => {
      const start = currentDeg;
      const end = currentDeg + slice;
      conicParts.push(`${item.color} ${start}deg ${end}deg`);
      legendItems.push({ name: item.name, color: item.color });
      currentDeg = end;
    });

    if (chart) chart.style.background = `conic-gradient(${conicParts.join(', ')})`;

    // Legend
    if (legend) {
      legend.innerHTML = legendItems.map(l => `
        <li class="legend-item">
          <span class="legend-dot" style="background:${l.color}"></span>
          <span class="legend-name">${l.name}</span>
        </li>
      `).join('');
    }

    // Brew instructions
    this._renderBrewInstructions(allItems);

    // Benefits
    this._renderBenefits(allItems);

    // Wellness tags
    this._renderWellnessTags(allItems);

    // Notes
    this._renderNotes(allItems);

    // Enable save if we have at least 1 ingredient
    if (saveBtn && State.selectedIngredients.length > 0) {
      saveBtn.disabled = false;
      saveBtn.removeAttribute('aria-disabled');
    }
  },

  _renderBrewInstructions(items) {
    const section = document.getElementById('brew-instructions');
    const tempEl = document.getElementById('brew-temp');
    const timeEl = document.getElementById('brew-time');
    if (!section) return;

    // Only base ingredients have brew params
    const withBrew = items.filter(i => i.brewTemp);

    if (!withBrew.length) {
      section.setAttribute('hidden', '');
      return;
    }

    // Highest temp + longest time wins
    const maxTemp = Math.max(...withBrew.map(i => parseBrewTemp(i.brewTemp)));
    const maxTime = Math.max(...withBrew.map(i => parseBrewTime(i.brewTime)));

    if (tempEl) tempEl.textContent = `${maxTemp}°C`;
    if (timeEl) timeEl.textContent = `${maxTime} min`;
    section.removeAttribute('hidden');
  },

  _renderBenefits(items) {
    const panel = document.getElementById('benefits-panel');
    const list = document.getElementById('benefits-list');
    if (!panel || !list) return;

    // Collect + deduplicate benefits
    const seen = new Set();
    const benefits = [];
    items.forEach(item => {
      (item.benefits || []).forEach(b => {
        const key = b.toLowerCase().trim();
        if (!seen.has(key)) {
          seen.add(key);
          benefits.push(b);
        }
      });
    });

    if (!benefits.length) { panel.setAttribute('hidden', ''); return; }

    list.innerHTML = benefits.map((b, i) =>
      `<span class="benefit-pill" style="animation-delay:${i * 0.04}s" role="listitem">${b}</span>`
    ).join('');

    panel.removeAttribute('hidden');
  },

  _renderWellnessTags(items) {
    const panel = document.getElementById('wellness-tags-panel');
    const tagsEl = document.getElementById('wellness-tags');
    if (!panel || !tagsEl) return;

    const benefitText = items.flatMap(i => (i.benefits || []).map(b => b.toLowerCase()));
    const activeTags = new Set();

    Object.entries(BENEFIT_TO_TAG).forEach(([tag, keywords]) => {
      for (const kw of keywords) {
        if (benefitText.some(b => b.includes(kw))) {
          activeTags.add(tag);
          break;
        }
      }
    });

    if (!activeTags.size) { panel.setAttribute('hidden', ''); return; }

    tagsEl.innerHTML = [...activeTags].map((t, i) =>
      `<span class="wellness-tag tag--${t}" style="animation-delay:${i * 0.06}s" role="listitem">${TAG_LABELS[t] || t.toUpperCase()}</span>`
    ).join('');

    panel.removeAttribute('hidden');
  },

  _renderNotes(items) {
    const panel = document.getElementById('notes-panel');
    const list = document.getElementById('notes-list');
    if (!panel || !list) return;

    const notes = items.filter(i => i.note).map(i => `<strong>${i.name}:</strong> ${i.note}`);

    if (!notes.length) { panel.setAttribute('hidden', ''); return; }

    list.innerHTML = notes.map(n => `<p>${n}</p>`).join('');
    panel.removeAttribute('hidden');
  },

  // --- Library ---
  renderLibrary() {
    const grid = document.getElementById('library-grid');
    const empty = document.getElementById('library-empty');
    if (!grid) return;

    const blends = State.savedBlends;

    if (!blends.length) {
      grid.innerHTML = '';
      if (empty) empty.removeAttribute('hidden');
      return;
    }

    if (empty) empty.setAttribute('hidden', '');

    grid.innerHTML = blends.map(blend => {
      const ingItems = (blend.ingredients || []).map(id => INGREDIENTS.find(i => i.id === id)).filter(Boolean);
      const boostItems = (blend.boosts || []).map(id => BOOSTS.find(b => b.id === id)).filter(Boolean);
      const allItems = [...ingItems, ...boostItems];

      const tags = this._computeWellnessTags(allItems);
      const dateStr = blend.savedAt ? new Date(blend.savedAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

      return `
        <li class="blend-card" data-blend-id="${blend.id}" role="listitem">
          <p class="blend-card-name">${blend.name || 'Untitled Blend'}</p>
          <div class="blend-card-meta">
            <span><i class="ph-leaf-fill"></i> ${ingItems.length} herbs</span>
            ${boostItems.length ? `<span><i class="ph-lightning-fill"></i> ${boostItems.length} boosts</span>` : ''}
            ${dateStr ? `<span><i class="ph-calendar-fill"></i> ${dateStr}</span>` : ''}
          </div>
          <div class="blend-card-tags">
            ${tags.slice(0, 4).map(t => `<span class="wellness-tag tag--${t}">${TAG_LABELS[t] || t.toUpperCase()}</span>`).join('')}
          </div>
          <div class="blend-card-actions">
            <button class="btn btn--gold btn--small btn-brew-again" data-blend-id="${blend.id}">
              <i class="ph-coffee-fill btn-icon"></i> Brew Again
            </button>
            <button class="btn btn--ghost btn--small btn-delete-blend" data-blend-id="${blend.id}" aria-label="Delete ${blend.name || 'blend'}">
              <i class="ph-trash-fill"></i>
            </button>
          </div>
        </li>
      `;
    }).join('');

    // Attach brew-again / delete listeners
    grid.querySelectorAll('.btn-brew-again').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = btn.getAttribute('data-blend-id');
        Controller.loadBlendForEditing(id);
      });
    });

    grid.querySelectorAll('.btn-delete-blend').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = btn.getAttribute('data-blend-id');
        Controller.deleteBlend(id);
      });
    });
  },

  _computeWellnessTags(items) {
    const benefitText = items.flatMap(i => (i.benefits || []).map(b => b.toLowerCase()));
    const activeTags = [];
    Object.entries(BENEFIT_TO_TAG).forEach(([tag, keywords]) => {
      for (const kw of keywords) {
        if (benefitText.some(b => b.includes(kw))) {
          activeTags.push(tag);
          break;
        }
      }
    });
    return activeTags;
  },

  // --- Toasts ---
  showToast(type, title, message, extra = {}) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.setAttribute('role', 'status');

    let iconClass = 'ph-info-fill toast-icon--success';
    if (type === 'xp') iconClass = 'ph-star-fill toast-icon--xp';
    else if (type === 'error') iconClass = 'ph-warning-circle-fill toast-icon--error';
    else if (type === 'success') iconClass = 'ph-check-circle-fill toast-icon--success';

    toast.innerHTML = `
      <i class="${iconClass} toast-icon" aria-hidden="true"></i>
      <div class="toast-body">
        <p class="toast-title">${title}</p>
        ${message ? `<p class="toast-msg">${message}</p>` : ''}
      </div>
      ${extra.xp ? `<span class="toast-xp-badge">+${extra.xp} XP</span>` : ''}
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast--exit');
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
    }, extra.duration || 3000);
  },

  // --- XP float label ---
  showXPFloat(xpAmount) {
    const label = document.createElement('div');
    label.className = 'xp-float-label';
    label.textContent = `+${xpAmount} XP`;
    label.style.top = '80px';
    label.style.right = '24px';
    document.body.appendChild(label);
    label.addEventListener('animationend', () => label.remove(), { once: true });
  },

  // --- Level-up overlay ---
  showLevelUp(levelName) {
    const overlay = document.getElementById('levelup-overlay');
    const nameEl = overlay?.querySelector('.levelup-name');
    const badgeEl = overlay?.querySelector('.levelup-badge');
    if (!overlay || !nameEl) return;

    const levelData = LEVELS.find(l => l.name === levelName);
    if (nameEl) nameEl.textContent = levelName;
    if (badgeEl && levelData) {
      badgeEl.className = `levelup-badge ${levelData.badge}`;
      badgeEl.style.color = levelData.color;
    }

    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('active');

    setTimeout(() => {
      overlay.classList.remove('active');
      overlay.setAttribute('aria-hidden', 'true');
    }, 2800);

    overlay.addEventListener('click', () => {
      overlay.classList.remove('active');
    }, { once: true });
  },

  // --- OTP email display ---
  setOTPEmailDisplay(email) {
    const el = document.getElementById('otp-email-display');
    if (el) el.textContent = email;
  },

  // --- Auth step toggle ---
  showOTPStep() {
    document.getElementById('auth-step-email')?.setAttribute('hidden', '');
    document.getElementById('auth-step-otp')?.removeAttribute('hidden');
    // Focus first OTP digit
    setTimeout(() => document.querySelector('.otp-digit')?.focus(), 100);
  },

  showEmailStep() {
    document.getElementById('auth-step-otp')?.setAttribute('hidden', '');
    document.getElementById('auth-step-email')?.removeAttribute('hidden');
  },

  setAuthError(step, msg) {
    const el = document.getElementById(`auth-${step}-error`);
    if (!el) return;
    if (msg) { el.textContent = msg; el.removeAttribute('hidden'); }
    else { el.setAttribute('hidden', ''); el.textContent = ''; }
  },

  // --- Resend countdown ---
  startResendCountdown() {
    const btn = document.getElementById('btn-resend-otp');
    const countEl = document.getElementById('resend-countdown');
    if (!btn || !countEl) return;

    let secs = 60;
    btn.classList.remove('active');
    btn.style.cursor = 'not-allowed';

    if (State.resendTimer) clearInterval(State.resendTimer);

    State.resendTimer = setInterval(() => {
      secs--;
      if (countEl) countEl.textContent = secs;
      if (secs <= 0) {
        clearInterval(State.resendTimer);
        btn.classList.add('active');
        btn.style.cursor = 'pointer';
        if (countEl) countEl.textContent = '';
        btn.textContent = 'Resend code';
      }
    }, 1000);
  },

  // --- Profile pre-fill ---
  prefillProfile() {
    if (!State.profile) return;
    const p = State.profile;

    if (p.firstName) {
      const nameInput = document.getElementById('input-firstname');
      if (nameInput) nameInput.value = p.firstName;
    }

    if (p.goals?.length) {
      p.goals.forEach(v => {
        const chip = document.querySelector(`#field-goals .chip[data-value="${v}"]`);
        if (chip) { chip.setAttribute('aria-pressed', 'true'); chip.classList.add('selected'); }
      });
    }

    if (p.allergies?.length) {
      p.allergies.forEach(v => {
        const chip = document.querySelector(`#field-allergies .chip[data-value="${v}"]`);
        if (chip) { chip.setAttribute('aria-pressed', 'true'); chip.classList.add('selected'); }
      });
    }

    if (p.brewStyle) {
      const pill = document.querySelector(`#field-brew .pill-opt[data-value="${p.brewStyle}"]`);
      if (pill) { pill.setAttribute('aria-pressed', 'true'); pill.classList.add('selected'); }
    }

    if (p.frequency) {
      const pill = document.querySelector(`#field-freq .pill-opt[data-value="${p.frequency}"]`);
      if (pill) { pill.setAttribute('aria-pressed', 'true'); pill.classList.add('selected'); }
    }
  },

  // --- Profile completion ---
  markFieldCompleted(fieldId) {
    const field = document.getElementById(fieldId);
    if (field) field.classList.add('field-completed');
  },
};

/* ============================================================
   CONTROLLER — Interaction & API
   ============================================================ */

const Controller = {

  // ---- Initialisation ----
  init() {
    View.updateXPDisplays();
    this._bindLandingEvents();
    this._bindAuthEvents();
    this._bindProfileEvents();
    this._bindWizardEvents();
    this._bindLibraryEvents();

    // Phosphor icons re-render
    if (window.PhosphorIcons) window.PhosphorIcons.renderAll?.();

    // Boot flow
    if (State.blendToken) {
      // Already authenticated
      this._postAuthRoute();
    } else {
      View.navigateTo(0);
      const landing = document.getElementById('screen-landing');
      if (landing) {
        landing.removeAttribute('hidden');
        landing.classList.add('screen--active');
      }
    }

    // Return visit XP
    const lastVisit = localStorage.getItem('blendLastVisit');
    const today = new Date().toDateString();
    if (lastVisit !== today && State.blendToken) {
      localStorage.setItem('blendLastVisit', today);
      setTimeout(() => this._awardXP('RETURN_VISIT'), 1000);
    }
  },

  _postAuthRoute() {
    const profile = State.profile;
    const profileComplete = profile && profile.firstName && profile.goals?.length;

    if (!profileComplete) {
      View.navigateTo(2);
      View.prefillProfile();
      View.renderIngredientGrid();
      View.renderBoostGrid();
      View.updateXPDisplays();
    } else {
      View.renderIngredientGrid();
      View.renderBoostGrid();
      View.navigateTo(3);
    }
  },

  // ---- Landing events ----
  _bindLandingEvents() {
    document.getElementById('btn-start-blending')?.addEventListener('click', () => {
      View.navigateTo(1);
    });
    document.getElementById('btn-signin')?.addEventListener('click', () => {
      View.navigateTo(1);
    });
  },

  // ---- Auth events ----
  _bindAuthEvents() {
    document.getElementById('btn-back-landing')?.addEventListener('click', () => {
      View.navigateTo(0, 'back');
    });

    document.getElementById('btn-send-otp')?.addEventListener('click', async () => {
      await this._handleSendOTP();
    });

    document.getElementById('input-email')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._handleSendOTP();
    });

    document.getElementById('btn-verify-otp')?.addEventListener('click', async () => {
      await this._handleVerifyOTP();
    });

    document.getElementById('btn-resend-otp')?.addEventListener('click', () => {
      if (document.getElementById('btn-resend-otp')?.classList.contains('active')) {
        this._handleSendOTP();
      }
    });

    // OTP digit auto-advance & paste
    const digits = document.querySelectorAll('.otp-digit');
    digits.forEach((digit, i) => {
      digit.addEventListener('input', (e) => {
        const val = e.target.value.replace(/\D/g, '');
        e.target.value = val;
        if (val && i < digits.length - 1) digits[i + 1].focus();
        digit.classList.toggle('otp-filled', !!val);
        // Auto-verify if all filled
        const allFilled = [...digits].every(d => d.value.length === 1);
        if (allFilled) setTimeout(() => this._handleVerifyOTP(), 100);
      });

      digit.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !digit.value && i > 0) digits[i - 1].focus();
      });

      digit.addEventListener('paste', (e) => {
        e.preventDefault();
        const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
        [...pasted].forEach((ch, j) => {
          if (digits[j]) { digits[j].value = ch; digits[j].classList.add('otp-filled'); }
        });
        const lastFilled = Math.min(pasted.length - 1, digits.length - 1);
        if (digits[lastFilled]) digits[lastFilled].focus();
        if (pasted.length === 6) setTimeout(() => this._handleVerifyOTP(), 100);
      });
    });
  },

  async _handleSendOTP() {
    const emailInput = document.getElementById('input-email');
    const btn = document.getElementById('btn-send-otp');
    const email = emailInput?.value.trim().toLowerCase();

    View.setAuthError('email', '');

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      View.setAuthError('email', 'Please enter a valid email address');
      emailInput?.focus();
      return;
    }

    State.email = email;
    btn?.classList.add('btn--loading');

    try {
      const res = await fetch(`${window.location.origin}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose: 'blend-access' }),
      });

      if (res.ok || res.status === 200) {
        View.setOTPEmailDisplay(email);
        View.showOTPStep();
        View.startResendCountdown();
        View.showToast('success', 'Code Sent', `Check ${email} for your 6-digit code`);
      } else {
        const data = await res.json().catch(() => ({}));
        View.setAuthError('email', data.message || 'Failed to send code. Please try again.');
      }
    } catch (err) {
      // If API doesn't exist yet, use demo mode
      console.info('[TeaBlend] OTP API not available — demo mode', err.message);
      View.setOTPEmailDisplay(email);
      View.showOTPStep();
      View.startResendCountdown();
      View.showToast('success', 'Demo Mode', 'Use code 123456 to continue');
    } finally {
      btn?.classList.remove('btn--loading');
    }
  },

  async _handleVerifyOTP() {
    const btn = document.getElementById('btn-verify-otp');
    const digits = document.querySelectorAll('.otp-digit');
    const otp = [...digits].map(d => d.value).join('');

    View.setAuthError('otp', '');

    if (otp.length < 6) {
      View.setAuthError('otp', 'Please enter the complete 6-digit code');
      return;
    }

    btn?.classList.add('btn--loading');

    try {
      const res = await fetch(`${window.location.origin}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: State.email, otp }),
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        this._onAuthSuccess(data.token || `blend_token_${Date.now()}`, data.user || { email: State.email });
      } else {
        const data = await res.json().catch(() => ({}));
        View.setAuthError('otp', data.message || 'Invalid or expired code. Please try again.');
        digits.forEach(d => { d.value = ''; d.classList.remove('otp-filled'); });
        digits[0]?.focus();
      }
    } catch (err) {
      // Demo mode: accept 123456
      if (otp === '123456' || otp === '000000') {
        this._onAuthSuccess(`demo_token_${Date.now()}`, { email: State.email, firstName: '' });
      } else {
        View.setAuthError('otp', 'Demo mode: use code 123456');
        digits.forEach(d => { d.value = ''; d.classList.remove('otp-filled'); });
        digits[0]?.focus();
      }
    } finally {
      btn?.classList.remove('btn--loading');
    }
  },

  _onAuthSuccess(token, user) {
    State.blendToken = token;
    State.user = user;
    localStorage.setItem('blendToken', token);
    localStorage.setItem('blendUser', JSON.stringify(user));

    View.showToast('success', 'Welcome to Origin', 'Your blend journey begins now');

    clearInterval(State.resendTimer);
    this._postAuthRoute();
    View.updateXPDisplays();
  },

  // ---- Profile events ----
  _bindProfileEvents() {
    // Chip multi-select
    document.querySelectorAll('#field-goals .chip, #field-allergies .chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const pressed = chip.getAttribute('aria-pressed') === 'true';
        chip.setAttribute('aria-pressed', String(!pressed));
        chip.classList.toggle('selected', !pressed);

        // Award XP on first interaction with this group
        const fieldEl = chip.closest('.profile-field');
        if (fieldEl && !fieldEl.dataset.xpEarned) {
          const event = fieldEl.dataset.xpEvent;
          if (event) this._awardXP(event, fieldEl);
        }
      });
    });

    // Pill single-select
    document.querySelectorAll('#field-brew .pill-opt, #field-freq .pill-opt').forEach(pill => {
      pill.addEventListener('click', () => {
        const group = pill.closest('.pill-group');
        group?.querySelectorAll('.pill-opt').forEach(p => {
          p.setAttribute('aria-pressed', 'false');
          p.classList.remove('selected');
        });
        pill.setAttribute('aria-pressed', 'true');
        pill.classList.add('selected');

        const fieldEl = pill.closest('.profile-field');
        if (fieldEl && !fieldEl.dataset.xpEarned) {
          const event = fieldEl.dataset.xpEvent;
          if (event) this._awardXP(event, fieldEl);
        }
      });
    });

    // Name XP
    const nameInput = document.getElementById('input-firstname');
    if (nameInput) {
      let nameXPGiven = false;
      nameInput.addEventListener('input', () => {
        const fieldEl = document.getElementById('field-name');
        if (nameInput.value.trim().length >= 2 && !nameXPGiven && fieldEl && !fieldEl.dataset.xpEarned) {
          nameXPGiven = true;
          this._awardXP('PROFILE_NAME', fieldEl);
        }
      });
    }

    // Form submit
    document.getElementById('profile-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this._saveProfile();
    });

    document.getElementById('btn-save-profile')?.addEventListener('click', (e) => {
      e.preventDefault();
      this._saveProfile();
    });
  },

  _saveProfile() {
    const firstName = document.getElementById('input-firstname')?.value.trim() || '';
    const goals = [...document.querySelectorAll('#field-goals .chip[aria-pressed="true"]')].map(c => c.dataset.value);
    const allergies = [...document.querySelectorAll('#field-allergies .chip[aria-pressed="true"]')].map(c => c.dataset.value);
    const brewStyle = document.querySelector('#field-brew .pill-opt[aria-pressed="true"]')?.dataset.value || '';
    const frequency = document.querySelector('#field-freq .pill-opt[aria-pressed="true"]')?.dataset.value || '';

    State.profile = { firstName, goals, allergies, brewStyle, frequency };
    saveState();

    View.showToast('success', `Welcome, ${firstName || 'Blender'}!`, 'Profile saved. Let\'s build your blend.');

    View.renderIngredientGrid();
    View.renderBoostGrid();
    View.navigateTo(3);
  },

  // ---- XP engine ----
  _awardXP(event, fieldEl) {
    const amount = XP_EVENTS[event];
    if (!amount) return;

    const prevLevel = getLevelInfo(State.xp).level;
    State.xp += amount;

    if (fieldEl) fieldEl.dataset.xpEarned = '1';

    saveState();
    View.updateXPDisplays();
    View.showXPFloat(amount);
    View.showToast('xp', `+${amount} XP`, XP_EVENT_LABELS[event] || 'Keep going!', { xp: amount, duration: 2500 });

    // Level-up check
    const newLevel = getLevelInfo(State.xp).level;
    if (newLevel.name !== prevLevel.name) {
      setTimeout(() => View.showLevelUp(newLevel.name), 500);
    }
  },

  // ---- Wizard events ----
  _bindWizardEvents() {
    // Ingredient toggle (event delegation)
    document.getElementById('ingredient-grid')?.addEventListener('click', (e) => {
      const card = e.target.closest('.ingredient-card');
      if (!card || card.classList.contains('disabled')) return;
      this._toggleIngredient(card.dataset.id, 'ingredient');
    });

    document.getElementById('ingredient-grid')?.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        const card = e.target.closest('.ingredient-card');
        if (card && !card.classList.contains('disabled')) {
          e.preventDefault();
          this._toggleIngredient(card.dataset.id, 'ingredient');
        }
      }
    });

    // Boost toggle
    document.getElementById('boost-grid')?.addEventListener('click', (e) => {
      const card = e.target.closest('.ingredient-card');
      if (!card) return;
      this._toggleIngredient(card.dataset.id, 'boost');
    });

    document.getElementById('boost-grid')?.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        const card = e.target.closest('.ingredient-card');
        if (card) { e.preventDefault(); this._toggleIngredient(card.dataset.id, 'boost'); }
      }
    });

    // Blend name
    document.getElementById('input-blend-name')?.addEventListener('input', (e) => {
      State.blendName = e.target.value;
    });

    // Save blend
    document.getElementById('btn-save-blend')?.addEventListener('click', () => {
      this._saveBlend();
    });

    // Library button
    document.getElementById('btn-library')?.addEventListener('click', () => {
      View.renderLibrary();
      View.updateXPDisplays();
      View.navigateTo(4);
    });
  },

  _toggleIngredient(id, type) {
    if (type === 'ingredient') {
      const idx = State.selectedIngredients.indexOf(id);
      if (idx >= 0) {
        State.selectedIngredients.splice(idx, 1);
      } else {
        if (State.selectedIngredients.length >= 6) return;
        State.selectedIngredients.push(id);
      }
      View.renderIngredientGrid();
    } else {
      const idx = State.selectedBoosts.indexOf(id);
      if (idx >= 0) State.selectedBoosts.splice(idx, 1);
      else State.selectedBoosts.push(id);
      View.renderBoostGrid();
    }
    View.renderDonut();
  },

  async _saveBlend() {
    if (!State.selectedIngredients.length) return;

    const blendName = State.blendName.trim() || this._autoName();
    const isFirst = State.savedBlends.length === 0;

    const blend = {
      id: `blend_${Date.now()}`,
      name: blendName,
      ingredients: [...State.selectedIngredients],
      boosts: [...State.selectedBoosts],
      savedAt: new Date().toISOString(),
      userId: State.user?.id || State.email,
    };

    // Try API
    let savedRemotely = false;
    if (State.blendToken) {
      try {
        const res = await fetch(`${window.location.origin}/api/blends`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${State.blendToken}`,
          },
          body: JSON.stringify(blend),
        });
        if (res.ok) { savedRemotely = true; const data = await res.json().catch(() => {}); if (data?.id) blend.id = data.id; }
      } catch (err) {
        console.info('[TeaBlend] Blend API unavailable — saving locally', err.message);
      }
    }

    // Local storage fallback
    State.savedBlends.unshift(blend);
    saveState();

    const xpEvent = isFirst ? 'FIRST_BLEND' : 'EACH_BLEND';
    this._awardXP(xpEvent);

    View.showToast('success',
      `"${blendName}" saved!`,
      savedRemotely ? 'Synced to your account' : 'Saved locally on this device',
      { duration: 3500 }
    );

    // Reset wizard for next blend
    State.selectedIngredients = [];
    State.selectedBoosts = [];
    State.blendName = '';
    const blendNameInput = document.getElementById('input-blend-name');
    if (blendNameInput) blendNameInput.value = '';

    View.renderIngredientGrid();
    View.renderBoostGrid();
    View.renderDonut();
  },

  _autoName() {
    const hour = new Date().getHours();
    let timePrefix = 'Morning';
    if (hour >= 12 && hour < 17) timePrefix = 'Afternoon';
    else if (hour >= 17 && hour < 21) timePrefix = 'Evening';
    else if (hour >= 21 || hour < 5) timePrefix = 'Night';

    const primary = State.selectedIngredients[0];
    const item = INGREDIENTS.find(i => i.id === primary);
    return item ? `${timePrefix} ${item.name} Blend` : `${timePrefix} Blend`;
  },

  // ---- Library events ----
  _bindLibraryEvents() {
    document.getElementById('btn-back-wizard')?.addEventListener('click', () => {
      View.navigateTo(3, 'back');
    });

    document.getElementById('btn-new-blend')?.addEventListener('click', () => {
      State.selectedIngredients = [];
      State.selectedBoosts = [];
      State.blendName = '';
      const blendNameInput = document.getElementById('input-blend-name');
      if (blendNameInput) blendNameInput.value = '';
      View.renderIngredientGrid();
      View.renderBoostGrid();
      View.renderDonut();
      View.navigateTo(3, 'back');
    });

    document.getElementById('btn-first-blend')?.addEventListener('click', () => {
      View.navigateTo(3, 'back');
    });
  },

  loadBlendForEditing(blendId) {
    const blend = State.savedBlends.find(b => b.id === blendId);
    if (!blend) return;

    State.selectedIngredients = [...(blend.ingredients || [])];
    State.selectedBoosts = [...(blend.boosts || [])];
    State.blendName = blend.name || '';

    const blendNameInput = document.getElementById('input-blend-name');
    if (blendNameInput) blendNameInput.value = State.blendName;

    View.renderIngredientGrid();
    View.renderBoostGrid();
    View.renderDonut();
    View.navigateTo(3, 'back');
  },

  deleteBlend(blendId) {
    State.savedBlends = State.savedBlends.filter(b => b.id !== blendId);
    saveState();
    View.renderLibrary();
    View.showToast('success', 'Blend deleted', '', { duration: 2000 });
  },
};

// XP event descriptive labels for toasts
const XP_EVENT_LABELS = {
  PROFILE_NAME:  'Name saved to your profile',
  HEALTH_GOALS:  'Health goals noted',
  ALLERGIES:     'Sensitivities recorded',
  BREW_STYLE:    'Brew preference saved',
  FREQUENCY:     'Tea habit noted',
  FIRST_BLEND:   'First blend created!',
  EACH_BLEND:    'New blend saved',
  BLEND_SHARED:  'Blend shared!',
  RETURN_VISIT:  'Welcome back to Origin',
};

/* ============================================================
   BOOT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  // Set initial screen state — all hidden except landing
  const screens = document.querySelectorAll('.screen');
  screens.forEach((s, i) => {
    if (i === 0) {
      s.classList.add('screen--active');
      s.removeAttribute('hidden');
    } else {
      s.setAttribute('hidden', '');
    }
  });

  Controller.init();

  // PWA service worker registration
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW not critical for tea wizard
    });
  }

  // Init Phosphor icons after DOM ready
  if (window.PhosphorIcons) {
    window.PhosphorIcons.renderAll?.();
  }
});
