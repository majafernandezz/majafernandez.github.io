/* Portfolio measurement. Reuses the existing GTM data layer. */
(() => {
  'use strict';
  if (window.__majaPortfolioEventsInstalled) return;
  if (!window.dataLayer || typeof window.dataLayer.push !== 'function') return;
  window.__majaPortfolioEventsInstalled = true;

  const contacts = {
    'linkedin-button': { contact_method: 'linkedin', button_location: 'about' },
    'email-button': { contact_method: 'email', button_location: 'contact' },
    'linkedin-contact-button': { contact_method: 'linkedin', button_location: 'contact' }
  };

  // closest() also handles a click on the nested span, SVG or path.
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : event.target.parentElement;
    const link = target?.closest('a[id]');
    if (!link || !Object.hasOwn(contacts, link.id)) return;
    window.dataLayer.push({ event: 'contact_click', ...contacts[link.id] });
  });

  let activeMs = 0;
  let maxScroll = 0;
  let sent = false;
  let pagePresent = true;
  let focused = document.hasFocus();
  let active = document.visibilityState === 'visible' && focused;
  let previous = performance.now();

  function accountTime() {
    const now = performance.now();
    if (active) {
      // Conservatively exclude long timer gaps (e.g. device suspension).
      activeMs += Math.min(Math.max(0, now - previous), 1000);
    }
    previous = now;
  }

  function check() {
    if (sent || !active || activeMs < 30000 || maxScroll < 50) return;
    sent = true;
    clearInterval(timer);
    window.dataLayer.push({
      event: 'qualified_portfolio_visit',
      page_name: 'portfolio_home',
      active_seconds: Math.floor(activeMs / 1000),
      scroll_percent: Math.floor(maxScroll)
    });
  }

  function updateActivity() {
    accountTime();
    active = pagePresent && focused && document.visibilityState === 'visible';
    sampleScroll();
    check();
  }

  function sampleScroll() {
    // Depth reached by the bottom of the viewport, following actual scrolling.
    if (!active || window.scrollY <= 0) return;
    const height = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    maxScroll = Math.max(maxScroll, Math.min(100, (window.scrollY + window.innerHeight) / height * 100));
  }

  const timer = setInterval(() => {
    accountTime();
    active = pagePresent && focused && document.hasFocus() && document.visibilityState === 'visible';
    check();
  }, 250);

  window.addEventListener('scroll', () => {
    accountTime();
    sampleScroll();
    check();
  }, { passive: true });
  window.addEventListener('focus', () => { focused = true; updateActivity(); });
  window.addEventListener('blur', () => { focused = false; updateActivity(); });
  document.addEventListener('visibilitychange', updateActivity);
  window.addEventListener('pagehide', () => { pagePresent = false; updateActivity(); });
  window.addEventListener('pageshow', () => {
    pagePresent = true;
    focused = document.hasFocus();
    updateActivity();
  });
  sampleScroll();
})();
