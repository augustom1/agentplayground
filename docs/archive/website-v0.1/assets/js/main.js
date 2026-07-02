// ============================================
// AgentPlayground — Main JS
// ============================================

// Active nav link on scroll
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');

function updateActiveNav() {
  let current = '';
  sections.forEach(section => {
    const top = section.getBoundingClientRect().top;
    if (top <= 100) current = section.id;
  });
  navLinks.forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === '#' + current);
  });
}

window.addEventListener('scroll', updateActiveNav, { passive: true });

// Mobile menu toggle
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobile-menu');

if (hamburger && mobileMenu) {
  hamburger.addEventListener('click', () => {
    mobileMenu.classList.toggle('open');
  });

  // Close on link click
  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => mobileMenu.classList.remove('open'));
  });
}

// Contact form — mailto
const contactForm = document.getElementById('contact-form');
if (contactForm) {
  contactForm.addEventListener('submit', e => {
    e.preventDefault();
    const name    = contactForm.querySelector('[name="name"]').value.trim();
    const email   = contactForm.querySelector('[name="email"]').value.trim();
    const subject = contactForm.querySelector('[name="subject"]').value.trim();
    const message = contactForm.querySelector('[name="message"]').value.trim();

    const to      = 'contact@agentplayground.net';
    const sub     = encodeURIComponent((subject || 'AgentPlayground Inquiry') + (name ? ` — ${name}` : ''));
    const body    = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);

    window.location.href = `mailto:${to}?subject=${sub}&body=${body}`;
    showToast('Opening your mail client…');
  });
}

function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

// Copy code blocks
document.querySelectorAll('pre').forEach(pre => {
  const btn = document.createElement('button');
  btn.textContent = 'Copy';
  btn.style.cssText = `
    position: absolute; top: 10px; right: 10px;
    background: rgba(124,58,237,0.2); color: #c4b5fd;
    border: 1px solid rgba(124,58,237,0.3); border-radius: 6px;
    font-size: 11px; font-weight: 600; padding: 3px 9px; cursor: pointer;
    font-family: inherit; transition: all 0.2s;
  `;
  btn.addEventListener('click', () => {
    const code = pre.querySelector('code') || pre;
    navigator.clipboard.writeText(code.innerText).then(() => {
      btn.textContent = 'Copied!';
      setTimeout(() => (btn.textContent = 'Copy'), 1800);
    });
  });
  pre.style.position = 'relative';
  pre.appendChild(btn);
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href').slice(1);
    const target = document.getElementById(id);
    if (target) {
      e.preventDefault();
      const offset = 72;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});

// Highlight active docs nav item
const docsLinks = document.querySelectorAll('.docs-nav-item');
const docsHeadings = document.querySelectorAll('.docs-content h2[id], .docs-content h3[id]');

if (docsLinks.length) {
  function updateDocsNav() {
    let current = '';
    docsHeadings.forEach(h => {
      if (h.getBoundingClientRect().top <= 120) current = h.id;
    });
    docsLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === '#' + current);
    });
  }
  window.addEventListener('scroll', updateDocsNav, { passive: true });
}
