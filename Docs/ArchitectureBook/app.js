/* OTOMIX Architecture Book — app.js
 * Reads window.OTOMIX_BOOK (from content.js), renders TOC + content + search.
 * All string data goes through textContent (safe). No innerHTML with user data.
 */
(function () {
  'use strict';

  var BOOK = window.OTOMIX_BOOK;
  var LANG = localStorage.getItem('otomix_book_lang') || 'en';

  // ====== helpers ======
  function t(obj) {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    if (typeof obj === 'object') {
      if (obj[LANG] != null) return obj[LANG];
      if (obj.en != null) return obj.en;
    }
    return '';
  }

  function el(tag, opts) {
    var e = document.createElement(tag);
    if (opts) {
      for (var k in opts) {
        if (k === 'text') e.textContent = opts[k];
        else if (k === 'class') e.className = opts[k];
        else if (k === 'html') { /* forbidden */ }
        else e.setAttribute(k, opts[k]);
      }
    }
    return e;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function vscodeLink(path, line) {
    var p = path.replace(/\\/g, '/');
    var href = 'vscode://file/C:/Oto Dj - Oto Mix/Oto Mix/' + p + (line ? ':' + line : '');
    var a = el('a', { class: 'file-link', href: href, title: path + ':' + line });
    a.textContent = path + (line ? ':' + line : '');
    return a;
  }

  // ====== inline markdown renderer (safe) ======
  function renderInline(text, parent) {
    var codeParts = String(text).split(/(`[^`]+`)/);
    for (var i = 0; i < codeParts.length; i++) {
      var part = codeParts[i];
      if (!part) continue;
      if (part.charAt(0) === '`' && part.charAt(part.length - 1) === '`' && part.length > 1) {
        var c = el('code');
        c.textContent = part.slice(1, -1);
        parent.appendChild(c);
        continue;
      }
      var boldParts = part.split(/(\*\*[^*]+\*\*)/);
      for (var j = 0; j < boldParts.length; j++) {
        var bp = boldParts[j];
        if (!bp) continue;
        if (bp.slice(0, 2) === '**' && bp.slice(-2) === '**') {
          var b = el('strong');
          b.textContent = bp.slice(2, -2);
          parent.appendChild(b);
        } else {
          var linkParts = bp.split(/(\[[^\]]+\]\([^)]+\))/);
          for (var k = 0; k < linkParts.length; k++) {
            var lp = linkParts[k];
            if (!lp) continue;
            var lm = lp.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
            if (lm) {
              var a = el('a', { href: lm[2] });
              a.textContent = lm[1];
              if (lm[2].indexOf('http') !== 0 && lm[2].indexOf('vscode') !== 0) {
                a.href = '#';
                a.title = lm[2];
              }
              parent.appendChild(a);
            } else {
              parent.appendChild(document.createTextNode(lp));
            }
          }
        }
      }
    }
  }

  function renderMarkdown(mdText, container) {
    if (!mdText) return;
    var lines = String(mdText).split(/\r?\n/);
    var i = 0;
    var inCode = false;
    var codeBuf = [];
    var listBuf = [];

    function flushList() {
      if (listBuf.length === 0) return;
      var ul = el('ul');
      for (var n = 0; n < listBuf.length; n++) {
        var li = el('li');
        renderInline(listBuf[n], li);
        ul.appendChild(li);
      }
      container.appendChild(ul);
      listBuf = [];
    }

    function flushCode() {
      if (codeBuf.length === 0) return;
      var pre = el('pre');
      var code = el('code');
      code.textContent = codeBuf.join('\n');
      pre.appendChild(code);
      container.appendChild(pre);
      codeBuf = [];
    }

    while (i < lines.length) {
      var line = lines[i];
      if (/^\s*```/.test(line)) {
        if (inCode) { flushCode(); inCode = false; } else { inCode = true; }
        i++; continue;
      }
      if (inCode) { codeBuf.push(line); i++; continue; }
      if (/^### /.test(line)) { flushList(); var h4 = el('h4'); renderInline(line.slice(4), h4); container.appendChild(h4); i++; continue; }
      if (/^## /.test(line))  { flushList(); var h3 = el('h3'); renderInline(line.slice(3), h3); container.appendChild(h3); i++; continue; }
      if (/^# /.test(line))   { flushList(); var h2 = el('h2'); renderInline(line.slice(2), h2); container.appendChild(h2); i++; continue; }
      if (/^[-*] /.test(line)) { listBuf.push(line.slice(2)); i++; continue; }
      if (line.trim() === '') { flushList(); i++; continue; }
      flushList();
      var p = el('p');
      renderInline(line, p);
      container.appendChild(p);
      i++;
    }
    flushList();
    flushCode();
  }

  // ====== state ======
  function getPhases() {
    if (!BOOK || !Array.isArray(BOOK.phases)) return [];
    return BOOK.phases;
  }

  function getPhase(id) {
    var phases = getPhases();
    for (var i = 0; i < phases.length; i++) {
      if (phases[i].id === id) return phases[i];
    }
    return null;
  }

  function getTask(phaseId, taskId) {
    var phase = getPhase(phaseId);
    if (!phase || !Array.isArray(phase.tasks)) return null;
    for (var i = 0; i < phase.tasks.length; i++) {
      if (phase.tasks[i].id === taskId) return phase.tasks[i];
    }
    return null;
  }

  function statusOf(task) {
    var s = (task && task.status) || 'TODO';
    if (s.indexOf('BLOCKED') === 0) return 'blocked';
    if (s === 'DONE') return 'done';
    return 'todo';
  }

  // ====== TOC ======
  function renderToc() {
    var toc = document.getElementById('toc');
    if (!toc) return;
    clear(toc);

    // Home
    var homeLabel = el('div', { class: 'toc-label', text: 'Home' });
    toc.appendChild(homeLabel);
    var home = el('a', { class: 'toc-item', href: '#/' });
    home.textContent = 'Overview';
    toc.appendChild(home);

    var phaseLabel = el('div', { class: 'toc-label', text: 'Phases' });
    toc.appendChild(phaseLabel);

    var phases = getPhases();
    for (var i = 0; i < phases.length; i++) {
      var p = phases[i];
      var done = 0, total = 0, blocked = 0;
      if (Array.isArray(p.tasks)) {
        total = p.tasks.length;
        for (var j = 0; j < p.tasks.length; j++) {
          var st = statusOf(p.tasks[j]);
          if (st === 'done') done++;
          else if (st === 'blocked') blocked++;
        }
      }
      var link = el('a', { class: 'toc-item', href: '#/' + p.id });
      link.setAttribute('data-phase', p.id);
      link.textContent = p.id + ' — ' + t(p.title).replace(/^Phase \d+ — /, '');
      var badgeClass = 'in-progress';
            if (done === total && total > 0) badgeClass = 'done';
            else if (done === 0) badgeClass = 'todo';
            else if (blocked > 0) badgeClass = 'blocked';
            var badge = el('span', { class: 'badge ' + badgeClass });
      badge.textContent = done + '/' + total + (blocked > 0 ? ' + ' + blocked : '');
      link.appendChild(badge);
      toc.appendChild(link);
    }

    // Appendices
    var appLabel = el('div', { class: 'toc-label', text: 'Appendices' });
    toc.appendChild(appLabel);
    var cLink = el('a', { class: 'toc-item', href: '#/constants' });
    cLink.textContent = 'Constants Reference';
    toc.appendChild(cLink);
    var gLink = el('a', { class: 'toc-item', href: '#/glossary' });
    gLink.textContent = 'Glossary';
    toc.appendChild(gLink);

    // highlight active
    updateActive();
  }

  function updateActive() {
    var hash = location.hash.replace(/^#/, '') || '/';
    var toc = document.getElementById('toc');
    if (!toc) return;
    var links = toc.querySelectorAll('.toc-item');
    for (var i = 0; i < links.length; i++) links[i].classList.remove('active');
    var parts = hash.split('/').filter(Boolean);
    if (parts.length === 0) {
      var home = toc.querySelector('a[href="#/"]');
      if (home) home.classList.add('active');
      return;
    }
    var sel = 'a[href="#/' + parts[0] + '"]';
    var active = toc.querySelector(sel);
    if (active) active.classList.add('active');
  }

  // ====== views ======
  function renderHome(container) {
    container.appendChild(el('h1', { text: 'OTOMIX Architecture Book' }));
    var meta = (BOOK && BOOK.metadata) || {};
    var p = el('p');
    p.textContent = 'A living encyclopedia of OTOMIX — a beat-based automatic DJ mixing engine.';
    container.appendChild(p);

    var info = el('p');
    info.style.color = 'var(--fg2)';
    info.style.fontSize = '13px';
    info.textContent = 'Generated: ' + (meta.generated || '—')
      + ' · Branch: ' + (meta.current_branch || '—')
      + ' · Tests: ' + (meta.total_tests || '—');
    container.appendChild(info);

    container.appendChild(el('h2', { text: 'Phases' }));
    var phases = getPhases();
    for (var i = 0; i < phases.length; i++) {
      var ph = phases[i];
      var a = el('a', { class: 'task-row', href: '#/' + ph.id });
      var title = el('div', { class: 'task-desc' });
      title.textContent = t(ph.title);
      a.appendChild(title);
      var meta2 = el('div');
      meta2.style.fontSize = '12px';
      meta2.style.color = 'var(--fg2)';
      meta2.style.marginTop = '4px';
      meta2.textContent = t(ph.status_label) || ph.status || '';
      a.appendChild(meta2);
      container.appendChild(a);
    }
  }

  function renderPhase(container, phaseId) {
    var phase = getPhase(phaseId);
    if (!phase) {
      container.appendChild(el('h1', { text: 'Phase not found: ' + phaseId }));
      return;
    }
    container.appendChild(el('h1', { text: t(phase.title) || phaseId }));
    var status = el('p');
    var badge = el('span', { class: 'badge-status ' + (phase.status || 'todo') });
    badge.textContent = phase.status || 'unknown';
    status.appendChild(badge);
    var lbl = document.createTextNode('  ' + (t(phase.status_label) || ''));
    status.appendChild(lbl);
    container.appendChild(status);

    if (phase.narrative) {
      var narDiv = el('div');
      const lang = localStorage.getItem("book_lang") || "en"; const text = lang === "fa" && phase.narrative_fa ? phase.narrative_fa : phase.narrative; renderMarkdown(t(text), narDiv);
      container.appendChild(narDiv);
    }

    // tasks
    if (Array.isArray(phase.tasks) && phase.tasks.length > 0) {
      container.appendChild(el('h2', { text: 'Tasks (' + phase.tasks.length + ')' }));
      for (var i = 0; i < phase.tasks.length; i++) {
        var tk = phase.tasks[i];
        var a = el('a', { class: 'task-row', href: '#/' + phaseId + '/' + tk.id });
        var dot = el('span', { class: 'status-dot ' + statusOf(tk) });
        a.appendChild(dot);
        var idSpan = el('span', { class: 'task-id', text: tk.id });
        a.appendChild(idSpan);
        var desc = el('span', { class: 'task-desc', text: t(tk.description) });
        a.appendChild(desc);
        container.appendChild(a);
      }
    }
  }

  function renderTask(container, phaseId, taskId) {
    var task = getTask(phaseId, taskId);
    if (!task) {
      container.appendChild(el('h1', { text: 'Task not found: ' + taskId }));
      return;
    }
    var back = el('a', { href: '#/' + phaseId });
    back.textContent = '← Back to ' + phaseId;
    back.style.fontSize = '13px';
    container.appendChild(back);
    container.appendChild(el('h1', { text: task.id }));

    var tbl = el('table', { class: 'field-table' });
    var rows = [
      ['Status', task.status || 'TODO'],
      ['Description', t(task.description)],
      ['Expected Outcome', t(task.expected_outcome)],
      ['Prerequisites', Array.isArray(task.prerequisites) ? task.prerequisites.join(', ') : ''],
      ['Test', t(task.test)],
      ['Spec Reference', t(task.spec_reference)],
      ['Review Checkpoint', t(task.review_checkpoint)],
      ['Notes', t(task.notes)],
      ['Test File', task.test_file || ''],
      ['Test Count', task.test_count != null ? String(task.test_count) : ''],
      ['MD Line', task.md_line != null ? String(task.md_line) : '']
    ];
    for (var i = 0; i < rows.length; i++) {
      var v = rows[i][1];
      if (!v) continue;
      var tr = el('tr');
      var th = el('th');
      th.textContent = rows[i][0];
      tr.appendChild(th);
      var td = el('td');
      if (rows[i][0] === 'Test File') {
        td.appendChild(vscodeLink(v));
      } else if (rows[i][0] === 'MD Line') {
        td.textContent = v;
      } else {
        renderInline(v, td);
      }
      tr.appendChild(td);
      tbl.appendChild(tr);
    }
    container.appendChild(tbl);
  }

  function renderConstants(container) {
    container.appendChild(el('h1', { text: 'Constants Reference' }));
    if (!BOOK || !BOOK.constants) return;
    var groups = BOOK.constants;
    for (var cat in groups) {
      if (!Array.isArray(groups[cat]) || groups[cat].length === 0) continue;
      container.appendChild(el('h2', { text: cat.charAt(0).toUpperCase() + cat.slice(1) }));
      var tbl = el('table');
      var thead = el('thead');
      var hr = el('tr');
      ['Name', 'Value', 'File', 'Line'].forEach(function (h) {
        var th = el('th'); th.textContent = h; hr.appendChild(th);
      });
      thead.appendChild(hr);
      tbl.appendChild(thead);
      var tbody = el('tbody');
      for (var i = 0; i < groups[cat].length; i++) {
        var c = groups[cat][i];
        var tr = el('tr');
        var c1 = el('td'); var code = el('code'); code.textContent = c.name; c1.appendChild(code); tr.appendChild(c1);
        var c2 = el('td'); c2.textContent = String(c.value); tr.appendChild(c2);
        var c3 = el('td'); c3.appendChild(vscodeLink(c.file || '', c.line)); tr.appendChild(c3);
        var c4 = el('td'); c4.textContent = c.line != null ? String(c.line) : ''; tr.appendChild(c4);
        tbody.appendChild(tr);
      }
      tbl.appendChild(tbody);
      container.appendChild(tbl);
    }
  }

  function renderGlossary(container) {
    container.appendChild(el('h1', { text: 'Glossary' }));
    if (!BOOK || !Array.isArray(BOOK.glossary)) return;
    for (var i = 0; i < BOOK.glossary.length; i++) {
      var g = BOOK.glossary[i];
      container.appendChild(el('h3', { text: t(g.term) }));
      var p = el('p');
      renderInline(t(g.definition), p);
      container.appendChild(p);
    }
  }

  // ====== router ======
  function render() {
    var content = document.getElementById('content');
    if (!content) return;
    clear(content);
    if (!BOOK) {
      var err = el('div');
      err.style.cssText = 'background:#3d1f1f;border:1px solid #f85149;padding:20px;border-radius:8px;margin:20px 0';
      err.appendChild(el('h2', { text: '⚠️ content.js not loaded' }));
      err.appendChild(el('p', { text: 'Run build-book.ps1 to generate content.js, then reload this page.' }));
      content.appendChild(err);
      return;
    }
    var hash = location.hash.replace(/^#/, '') || '/';
    var parts = hash.split('/').filter(Boolean);
    if (parts.length === 0) return renderHome(content);
    if (parts[0] === 'constants') return renderConstants(content);
    if (parts[0] === 'glossary') return renderGlossary(content);
    if (parts[0] === 'ch0' || parts[0] === 'ch1') {
      return renderPhase(content, parts[0]);
    }
    if (parts.length === 1) return renderPhase(content, parts[0]);
    if (parts.length === 2) return renderTask(content, parts[0], parts[1]);
    renderHome(content);
  }

  // ====== search ======
  var searchIndex = null;

  function buildSearchIndex() {
    if (!BOOK) return [];
    var idx = [];
    var phases = getPhases();
    for (var i = 0; i < phases.length; i++) {
      var p = phases[i];
      idx.push({ type: 'phase', id: p.id, label: p.id + ' — ' + t(p.title), text: (p.id + ' ' + t(p.title) + ' ' + t(p.narrative)).toLowerCase(), href: '#/' + p.id });
      if (Array.isArray(p.tasks)) {
        for (var j = 0; j < p.tasks.length; j++) {
          var tk = p.tasks[j];
          idx.push({
            type: 'task', id: tk.id,
            label: tk.id + ' — ' + t(tk.description),
            text: (tk.id + ' ' + t(tk.description) + ' ' + t(tk.expected_outcome) + ' ' + (tk.prerequisites || []).join(' ')).toLowerCase(),
            href: '#/' + p.id + '/' + tk.id
          });
        }
      }
    }
    if (BOOK.constants) {
      for (var cat in BOOK.constants) {
        if (!Array.isArray(BOOK.constants[cat])) continue;
        for (var k = 0; k < BOOK.constants[cat].length; k++) {
          var c = BOOK.constants[cat][k];
          idx.push({ type: 'constant', id: c.name, label: c.name + ' = ' + c.value + ' (' + cat + ')', text: (c.name + ' ' + c.value + ' ' + cat).toLowerCase(), href: '#/constants' });
        }
      }
    }
    if (Array.isArray(BOOK.glossary)) {
      for (var g = 0; g < BOOK.glossary.length; g++) {
        var gl = BOOK.glossary[g];
        idx.push({ type: 'glossary', id: t(gl.term), label: t(gl.term), text: (t(gl.term) + ' ' + t(gl.definition)).toLowerCase(), href: '#/glossary' });
      }
    }
    return idx;
  }

  function doSearch(query) {
    if (!searchIndex) searchIndex = buildSearchIndex();
    var q = query.toLowerCase().trim();
    var resultsEl = document.getElementById('search-results');
    if (!resultsEl) return;
    if (q.length < 2) {
      resultsEl.hidden = true;
      clear(resultsEl);
      return;
    }
    var hits = [];
    for (var i = 0; i < searchIndex.length && hits.length < 20; i++) {
      var entry = searchIndex[i];
      if (entry.text.indexOf(q) !== -1) hits.push(entry);
    }
    clear(resultsEl);
    if (hits.length === 0) {
      var empty = el('div');
      empty.style.padding = '16px';
      empty.style.color = 'var(--fg2)';
      empty.textContent = 'No results for "' + query + '"';
      resultsEl.appendChild(empty);
    } else {
      for (var h = 0; h < hits.length; h++) {
        var hit = hits[h];
        var a = el('a', { class: 'search-result', href: hit.href });
        var meta = el('div', { class: 'sr-meta', text: hit.type.toUpperCase() });
        a.appendChild(meta);
        var label = el('div');
        label.textContent = hit.label;
        a.appendChild(label);
        (function (href) {
          a.addEventListener('click', function () {
            resultsEl.hidden = true;
            document.getElementById('search-input').value = '';
          });
        })(hit.href);
        resultsEl.appendChild(a);
      }
    }
    resultsEl.hidden = false;
  }

  // ====== theme ======
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    var btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = theme === 'light' ? '☀️' : '🌙';
  }

  function initTheme() {
    var stored = localStorage.getItem('otomix_book_theme') || 'dark';
    applyTheme(stored);
    var btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.addEventListener('click', function () {
        var cur = document.documentElement.getAttribute('data-theme') || 'dark';
        var next = cur === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        localStorage.setItem('otomix_book_theme', next);
      });
    }
  }

  // ====== mobile sidebar ======
  function initMobile() {
    var btn = document.getElementById('menu-toggle');
    var sidebar = document.getElementById('sidebar');
    if (btn && sidebar) {
      btn.addEventListener('click', function () {
        sidebar.classList.toggle('open');
      });
      document.addEventListener('click', function (e) {
        if (window.innerWidth <= 768 && sidebar.classList.contains('open')
          && !sidebar.contains(e.target) && e.target !== btn) {
          sidebar.classList.remove('open');
        }
      });
    }
  }

  // ====== search input ======
  function initSearch() {
    var inp = document.getElementById('search-input');
    var resultsEl = document.getElementById('search-results');
    if (!inp) return;
    inp.addEventListener('input', function () { doSearch(inp.value); });
    inp.addEventListener('focus', function () { if (inp.value.length >= 2) doSearch(inp.value); });
    document.addEventListener('click', function (e) {
      if (resultsEl && !resultsEl.contains(e.target) && e.target !== inp) {
        resultsEl.hidden = true;
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === '/' && document.activeElement !== inp) {
        e.preventDefault();
        inp.focus();
      } else if (e.key === 'Escape') {
        inp.blur();
        if (resultsEl) resultsEl.hidden = true;
        inp.value = '';
      }
    });
  }

  // ====== boot ======
  function boot() {
    if (!BOOK) {
      console.error('[OTOMIX Book] window.OTOMIX_BOOK not defined — content.js missing or failed.');
    } else {
      console.log('[OTOMIX Book] Loaded: ' + (Array.isArray(BOOK.phases) ? BOOK.phases.length : 0) + ' phases');
    }
    initTheme();
    initMobile();
    initSearch();
    renderToc();
    render();
    window.addEventListener('hashchange', function () {
      render();
      updateActive();
      var sidebar = document.getElementById('sidebar');
      if (sidebar) sidebar.classList.remove('open');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
// --- Language Toggle Logic ---
(function() {
  const i18n = {
    'Overview': 'نمای کلی',
    'Phases': 'فازها',
    'Appendices': 'ضمائم',
    'Constants Reference': 'مرجع ثابت‌ها',
    'Glossary': 'واژه‌نامه',
    'Tasks': 'تسک‌ها',
    'blocked': 'بلاک شده',
    'todo': 'در انتظار',
    'done': 'انجام شده',
    'in-progress': 'در حال انجام',
    'Status': 'وضعیت',
    'Description': 'توضیحات',
    'Test': 'تست',
    'Spec Reference': 'مرجع مشخصات',
    'Review Checkpoint': 'نقطه بازبینی',
    'Notes': 'یادداشت‌ها',
    'Prerequisites': 'پیش‌نیازها',
    'Expected Outcome': 'خروجی مورد انتظار',
    'Search (press /)': 'جستجو (دکمه /)'
  };

  const reverseI18n = {};
  for (const [en, fa] of Object.entries(i18n)) {
    reverseI18n[fa] = en;
  }

  function translateDOM(lang) {
    const dict = lang === 'fa' ? i18n : reverseI18n;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let node;
    const nodesToReplace = [];
    
    while (node = walker.nextNode()) {
      const text = node.nodeValue.trim();
      if (dict[text]) {
        nodesToReplace.push({ node, newText: dict[text] });
      }
    }
    
    nodesToReplace.forEach(item => {
      item.node.nodeValue = item.node.nodeValue.replace(item.node.nodeValue.trim(), item.newText);
    });
  }

  function setLanguage(lang) {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
    localStorage.setItem('otomix_book_lang', lang);
    const btn = document.getElementById('lang-toggle');
    if (btn) btn.textContent = lang === 'fa' ? 'EN' : 'FA';
    translateDOM(lang);
  }

  window.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('lang-toggle');
    const currentLang = localStorage.getItem('otomix_book_lang') || 'en';
    
    // Initial set
    setTimeout(() => setLanguage(currentLang), 100);

    if (btn) {
      btn.addEventListener('click', () => {
        const newLang = localStorage.getItem('otomix_book_lang') === 'fa' ? 'en' : 'fa';
        setLanguage(newLang);
      });
    }
  });

  // Hook into hashchange to translate newly rendered content
  window.addEventListener('hashchange', () => {
    setTimeout(() => translateDOM(localStorage.getItem('otomix_book_lang') || 'en'), 100);
  });
})();
// --- Language Toggle Logic ---
window.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('lang-toggle');
  if (!btn) return;
  const lang = localStorage.getItem('book_lang') || 'en';
  document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
  btn.textContent = lang === 'fa' ? 'EN' : 'FA';
  btn.onclick = () => {
    const newLang = localStorage.getItem('book_lang') === 'fa' ? 'en' : 'fa';
    localStorage.setItem('book_lang', newLang);
    location.reload();
  };
});