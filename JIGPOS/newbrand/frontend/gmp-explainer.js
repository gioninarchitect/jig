/**
 * GMP Visual Explainer — Origin Retail Platform
 * Animations, scroll reveals, count-up numbers, nav active state
 */

(function () {
  'use strict';

  /* ── Scroll-reveal observer ────────────────────────────────── */
  function initReveal() {
    const targets = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .stagger');

    if (!('IntersectionObserver' in window)) {
      // Fallback: show everything immediately
      targets.forEach(el => el.classList.add('visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    targets.forEach(el => observer.observe(el));
  }

  /* ── Count-up animation ────────────────────────────────────── */
  function countUp(el, target, duration) {
    const start = performance.now();
    const isInt = Number.isInteger(target);

    function step(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = target * eased;

      el.textContent = isInt
        ? Math.floor(value).toString()
        : value.toFixed(1);

      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = isInt ? target.toString() : target.toFixed(1);
    }

    requestAnimationFrame(step);
  }

  function initCountUps() {
    const els = document.querySelectorAll('[data-count]');
    if (!('IntersectionObserver' in window)) {
      els.forEach(el => { el.textContent = el.dataset.count; });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const target = parseFloat(entry.target.dataset.count);
            const duration = parseInt(entry.target.dataset.duration || '1400', 10);
            countUp(entry.target, target, duration);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );

    els.forEach(el => observer.observe(el));
  }

  /* ── Progress bar animation ────────────────────────────────── */
  function initProgressBars() {
    const fills = document.querySelectorAll('.progress-fill[data-width]');
    if (!('IntersectionObserver' in window)) {
      fills.forEach(el => { el.style.width = el.dataset.width + '%'; });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const w = entry.target.dataset.width;
            entry.target.style.width = w + '%';
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );

    fills.forEach(el => observer.observe(el));
  }

  /* ── Active nav link on scroll ─────────────────────────────── */
  function initNavHighlight() {
    const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
    const sections = [];

    navLinks.forEach(link => {
      const id = link.getAttribute('href').slice(1);
      const el = document.getElementById(id);
      if (el) sections.push({ el, link });
    });

    if (!sections.length) return;

    function onScroll() {
      const scrollY = window.scrollY + 100;
      let active = sections[0];

      sections.forEach(({ el, link }) => {
        if (el.offsetTop <= scrollY) active = { el, link };
      });

      navLinks.forEach(a => a.classList.remove('active'));
      active.link.classList.add('active');
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ── Flow step hover pulsing icon ──────────────────────────── */
  function initFlowIcons() {
    const steps = document.querySelectorAll('.flow-step');
    steps.forEach(step => {
      const icon = step.querySelector('.flow-icon-wrap');
      if (!icon) return;

      step.addEventListener('mouseenter', () => {
        icon.style.transform = 'scale(1.12)';
        icon.style.transition = 'transform .2s ease';
      });
      step.addEventListener('mouseleave', () => {
        icon.style.transform = 'scale(1)';
      });
    });
  }

  /* ── Principle card number label ───────────────────────────── */
  function initPrincipleCards() {
    const cards = document.querySelectorAll('.principle-card');
    cards.forEach(card => {
      const icon = card.querySelector('.pc-icon');
      if (!icon) return;

      card.addEventListener('mouseenter', () => {
        icon.style.transform = 'scale(1.15) rotate(-5deg)';
        icon.style.transition = 'transform .25s ease';
      });
      card.addEventListener('mouseleave', () => {
        icon.style.transform = 'scale(1) rotate(0deg)';
      });
    });
  }

  /* ── Smooth scroll for anchor links ────────────────────────── */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', e => {
        const id = link.getAttribute('href').slice(1);
        const target = document.getElementById(id);
        if (!target) return;
        e.preventDefault();
        const offset = 70;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      });
    });
  }

  /* ── Print button ───────────────────────────────────────────── */
  function initPrintButton() {
    const btn = document.getElementById('btn-print');
    if (btn) btn.addEventListener('click', () => window.print());
  }

  /* ── Tooltip on legal cards ─────────────────────────────────── */
  function initTooltips() {
    const cards = document.querySelectorAll('[data-tooltip]');
    cards.forEach(card => {
      const tip = document.createElement('div');
      tip.className = 'gmp-tooltip';
      tip.textContent = card.dataset.tooltip;
      tip.style.cssText = `
        position: absolute;
        bottom: calc(100% + 8px);
        left: 50%;
        transform: translateX(-50%);
        background: #1A1A1A;
        border: 1px solid rgba(201,168,76,.35);
        color: #F5F0E8;
        font-size: .72rem;
        padding: 6px 12px;
        border-radius: 6px;
        white-space: nowrap;
        pointer-events: none;
        opacity: 0;
        transition: opacity .2s;
        z-index: 50;
      `;
      card.style.position = 'relative';
      card.appendChild(tip);

      card.addEventListener('mouseenter', () => { tip.style.opacity = '1'; });
      card.addEventListener('mouseleave', () => { tip.style.opacity = '0'; });
    });
  }

  /* ── Back-to-top button ─────────────────────────────────────── */
  function initBackToTop() {
    const btn = document.createElement('button');
    btn.id = 'back-to-top';
    btn.innerHTML = '↑';
    btn.setAttribute('aria-label', 'Back to top');
    btn.style.cssText = `
      position: fixed;
      bottom: 28px;
      right: 28px;
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background: rgba(201,168,76,.15);
      border: 1px solid rgba(201,168,76,.35);
      color: #C9A84C;
      font-size: 1.1rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity .3s, background .2s;
      z-index: 200;
    `;

    btn.addEventListener('mouseenter', () => { btn.style.background = 'rgba(201,168,76,.3)'; });
    btn.addEventListener('mouseleave', () => { btn.style.background = 'rgba(201,168,76,.15)'; });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    document.body.appendChild(btn);

    window.addEventListener('scroll', () => {
      btn.style.opacity = window.scrollY > 400 ? '1' : '0';
      btn.style.pointerEvents = window.scrollY > 400 ? 'auto' : 'none';
    }, { passive: true });
  }

  /* ── Init all ───────────────────────────────────────────────── */
  function init() {
    initReveal();
    initCountUps();
    initProgressBars();
    initNavHighlight();
    initFlowIcons();
    initPrincipleCards();
    initSmoothScroll();
    initPrintButton();
    initTooltips();
    initBackToTop();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
