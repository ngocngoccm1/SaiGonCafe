(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const page = document.body.dataset.page || 'home';
  const fallback = 'assets/brand/logo-from-menu.png';

  // Header + navigation
  const header = $('.global-header');
  const toggle = $('.nav-toggle');
  const nav = $('.global-links');
  let lastScrollY = Math.max(scrollY, 0);
  let navHidden = false;
  let navTicking = false;
  const navLocked = () => document.body.classList.contains('menu-open') ||
    document.body.classList.contains('cart-open') ||
    document.body.classList.contains('modal-open');
  const setNavHidden = hidden => {
    navHidden = hidden;
    header?.classList.toggle('nav-hidden', hidden);
    document.body.classList.toggle('nav-hidden', hidden);
  };
  const syncHeader = () => {
    const currentY = Math.max(scrollY, 0);
    header?.classList.toggle('scrolled', currentY > 18);

    if (navLocked() || currentY <= 80 || currentY < lastScrollY - 4) {
      setNavHidden(false);
    } else if (currentY > lastScrollY + 4) {
      setNavHidden(true);
    } else {
      setNavHidden(navHidden);
    }

    lastScrollY = currentY;
    navTicking = false;
  };
  const requestNavSync = () => {
    if (navTicking) return;
    navTicking = true;
    requestAnimationFrame(syncHeader);
  };
  syncHeader();
  addEventListener('scroll', requestNavSync, { passive: true });
  toggle?.addEventListener('click', () => {
    setNavHidden(false);
    toggle.classList.toggle('active');
    nav?.classList.toggle('open');
    document.body.classList.toggle('menu-open');
  });
  $$('.global-links a').forEach(a => a.addEventListener('click', () => {
    toggle?.classList.remove('active');
    nav?.classList.remove('open');
    document.body.classList.remove('menu-open');
  }));

  // Intro
  const intro = $('.intro');
  const finishIntro = () => {
    if (!intro) return;
    intro.classList.add('done');
    sessionStorage.setItem('saigonJourneyIntro', '1');
  };
  if (intro) {
    if (sessionStorage.getItem('saigonJourneyIntro') || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      intro.remove();
    } else {
      setTimeout(finishIntro, 2700);
      $('.skip-intro')?.addEventListener('click', finishIntro);
    }
  }

  // Reveal + lightweight parallax
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('is-visible');
    });
  }, { threshold: .12 });
  $$('.reveal').forEach(el => revealObserver.observe(el));

  const parallaxItems = $$('[data-parallax]');
  if (parallaxItems.length && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const updateParallax = () => {
      parallaxItems.forEach(el => {
        const rect = el.getBoundingClientRect();
        const offset = (innerHeight / 2 - (rect.top + rect.height / 2)) * Number(el.dataset.parallax || .04);
        el.style.transform = `translate3d(0,${Math.max(-34, Math.min(34, offset))}px,0)`;
      });
    };
    updateParallax();
    addEventListener('scroll', updateParallax, { passive: true });
  }

  // Shared site config
  const config = window.SAIGON_SITE || {};
  $$('[data-config]').forEach(el => {
    const value = config[el.dataset.config];
    if (value) el.textContent = Array.isArray(value) ? value.join(' · ') : value;
  });
  $$('[data-href]').forEach(el => {
    const key = el.dataset.href;
    const value = config[key];
    if (!value) return el.closest('[data-hide-empty]')?.classList.add('hidden');
    if (key === 'phone') el.href = `tel:${String(value).replace(/\s/g, '')}`;
    else if (key === 'whatsapp') el.href = `https://wa.me/${String(value).replace(/\D/g, '')}`;
    else el.href = value;
  });
  $$('[data-year]').forEach(el => el.textContent = new Date().getFullYear());

  // Travel transitions between stops
  const transition = document.createElement('div');
  transition.className = 'travel-transition';
  transition.innerHTML = `<div class="travel-stage"><p>Travelling to the next Saigon stop</p><div class="travel-road"><img class="travel-scooter" src="assets/images/illustrations/vespa.svg" alt=""></div></div>`;
  document.body.appendChild(transition);
  $$('a.travel-link, .journey-stop, .next-stop-card').forEach(link => {
    link.addEventListener('click', event => {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || event.metaKey || event.ctrlKey) return;
      event.preventDefault();
      transition.classList.add('active');
      setTimeout(() => location.href = href, 720);
    });
  });

  // Image fallback
  $$('img').forEach(img => {
    img.addEventListener('error', () => {
      if (img.dataset.fallbackDone) return;
      img.dataset.fallbackDone = '1';
      img.src = fallback;
      img.classList.add('fallback-logo');
    });
  });

  // Modal + cart markup
  const modal = document.createElement('div');
  modal.className = 'dish-modal';
  modal.innerHTML = `<div class="dish-modal-card" role="dialog" aria-modal="true" aria-labelledby="dishModalTitle">
    <button class="modal-close" aria-label="Close">×</button>
    <div class="dish-modal-media"><img src="${fallback}" alt=""></div>
    <div class="dish-modal-body"><div class="eyebrow">From the menu</div><h2 id="dishModalTitle"></h2><p class="modal-desc"></p><div class="tag-row modal-tags"></div><div class="modal-price"></div><div class="modal-actions"><button class="modal-add">Add to order</button><button class="modal-close-secondary">Close</button></div></div>
  </div>`;
  document.body.appendChild(modal);

  const backdrop = document.createElement('div');
  backdrop.className = 'cart-backdrop';
  document.body.appendChild(backdrop);
  const drawer = document.createElement('aside');
  drawer.className = 'cart-drawer';
  drawer.innerHTML = `<button class="drawer-close" aria-label="Close order">×</button><div class="cart-drawer-head"><div class="eyebrow">Your Saigon order</div><h2>Selected items</h2></div><div class="cart-items"></div><div class="cart-drawer-foot"><div class="cart-total"><span>Estimated total</span><strong>0,00 €</strong></div><button class="cart-copy" style="width:100%">Copy order summary</button></div>`;
  document.body.appendChild(drawer);

  const cartKey = 'saigonCafeOrderV4';
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem(cartKey) || '[]'); } catch { cart = []; }
  let activeItem = null;

  const parsePrice = value => Number(String(value || '').replace(/[^0-9,.-]/g, '').replace(',', '.')) || 0;
  const saveCart = () => localStorage.setItem(cartKey, JSON.stringify(cart));
  const cartCount = () => cart.reduce((sum, item) => sum + item.qty, 0);
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[ch]));

  function itemFromElement(el) {
    return {
      id: el.dataset.id || `${page}-${el.dataset.name || 'item'}`,
      name: el.dataset.name || 'Menu item',
      price: el.dataset.price || '',
      desc: el.dataset.desc || '',
      image: el.dataset.image || fallback,
      tags: el.dataset.tags || '',
      page
    };
  }

  function updateBadges() {
    $$('.cart-count').forEach(el => el.textContent = cartCount());
  }

  function renderCart() {
    const root = $('.cart-items', drawer);
    const total = cart.reduce((sum, item) => sum + parsePrice(item.price) * item.qty, 0);
    $('.cart-total strong', drawer).textContent = `${total.toFixed(2).replace('.', ',')} €`;
    if (!cart.length) {
      root.innerHTML = '<div class="cart-empty">No dishes selected yet. Explore a street and add something delicious.</div>';
    } else {
      root.innerHTML = cart.map(item => `<article class="cart-row" data-cart-id="${esc(item.id)}">
        <img src="${esc(item.image || fallback)}" alt="${esc(item.name)}">
        <div><h3>${esc(item.name)}</h3><small>${esc(item.price)}</small><div class="cart-row-controls"><button data-cart-action="minus">−</button><b>${item.qty}</b><button data-cart-action="plus">+</button></div></div>
        <button data-cart-action="remove" aria-label="Remove">×</button>
      </article>`).join('');
    }
    updateBadges();
    saveCart();
  }

  function addToCart(item) {
    const found = cart.find(row => row.id === item.id);
    if (found) found.qty += 1;
    else cart.push({ ...item, qty: 1 });
    renderCart();
    openCart();
  }

  function openCart() {
    setNavHidden(false);
    drawer.classList.add('open');
    backdrop.classList.add('open');
    document.body.classList.add('cart-open');
  }
  function closeCart() {
    drawer.classList.remove('open');
    backdrop.classList.remove('open');
    document.body.classList.remove('cart-open');
  }

  $$('.cart-button').forEach(btn => btn.addEventListener('click', openCart));
  $('.drawer-close', drawer).addEventListener('click', closeCart);
  backdrop.addEventListener('click', closeCart);
  $('.cart-items', drawer).addEventListener('click', event => {
    const btn = event.target.closest('[data-cart-action]');
    const row = event.target.closest('[data-cart-id]');
    if (!btn || !row) return;
    const item = cart.find(i => i.id === row.dataset.cartId);
    if (!item) return;
    const action = btn.dataset.cartAction;
    if (action === 'plus') item.qty++;
    if (action === 'minus') item.qty--;
    if (action === 'remove' || item.qty <= 0) cart = cart.filter(i => i.id !== item.id);
    renderCart();
  });
  $('.cart-copy', drawer).addEventListener('click', async () => {
    if (!cart.length) return;
    const lines = cart.map(i => `${i.qty} × ${i.name} — ${i.price}`);
    const text = `Sài Gòn Café order\n${lines.join('\n')}`;
    try {
      await navigator.clipboard.writeText(text);
      $('.cart-copy', drawer).textContent = 'Copied!';
      setTimeout(() => $('.cart-copy', drawer).textContent = 'Copy order summary', 1300);
    } catch {
      alert(text);
    }
  });

  function openModal(item) {
    setNavHidden(false);
    activeItem = item;
    $('.dish-modal-media img', modal).src = item.image || fallback;
    $('.dish-modal-media img', modal).alt = item.name;
    $('#dishModalTitle', modal).textContent = item.name;
    $('.modal-desc', modal).textContent = item.desc || 'A selection from this stop on the Saigon journey.';
    $('.modal-price', modal).textContent = item.price;
    $('.modal-tags', modal).innerHTML = item.tags ? item.tags.split('|').filter(Boolean).map(t => `<span class="tag">${esc(t)}</span>`).join('') : '';
    modal.classList.add('open');
    document.body.classList.add('modal-open');
  }
  function closeModal() {
    modal.classList.remove('open');
    document.body.classList.remove('modal-open');
  }
  $('.modal-close', modal).addEventListener('click', closeModal);
  $('.modal-close-secondary', modal).addEventListener('click', closeModal);
  modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });
  $('.modal-add', modal).addEventListener('click', () => { if (activeItem) addToCart(activeItem); closeModal(); });

  document.addEventListener('click', event => {
    const add = event.target.closest('[data-add-order]');
    const view = event.target.closest('[data-view-dish]');
    const card = event.target.closest('[data-menu-item]');
    if (add) {
      const source = add.closest('[data-menu-item]');
      if (source) addToCart(itemFromElement(source));
      return;
    }
    if (view) {
      const source = view.closest('[data-menu-item]');
      if (source) openModal(itemFromElement(source));
      return;
    }
    if (card && !event.target.closest('a,button')) openModal(itemFromElement(card));
  });

  addEventListener('keydown', event => {
    if (event.key === 'Escape') { closeModal(); closeCart(); return; }
    const card = event.target.closest?.('[data-menu-item]');
    if (card && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      openModal(itemFromElement(card));
    }
  });

  renderCart();

  // Page-specific entrance effects
  if (page === 'cho-lon') setTimeout(() => $('.wood-gate')?.classList.add('open'), 180);
})();
