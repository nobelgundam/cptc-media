/* ================================================================
 * NetSimEngine — เครื่องยนต์จำลองเครือข่าย (vanilla JS, self-contained)
 * โหลดด้วย <script src="js/engine.js"></script> ธรรมดา (ไม่ใช่ module
 * เพราะ file:// บล็อก ES6 module/Fetch) → IIFE สร้าง window.NetSimEngine
 * data model id-based: nodes[]{id,type,x,y}  edges[]{id,a,b,media}
 * อ้างอิง pattern: parsePktXmlToGraph / animatePacketAlongPath /
 *                  findShortestPathBFS / makeNodeDraggable (Gemini deep research)
 * ================================================================ */
(function (global) {
  'use strict';
  var SVGNS = 'http://www.w3.org/2000/svg';

  /* ---------- ข้อมูลชนิดอุปกรณ์ + ไอคอน SVG เขียนมือ (center 0,0) ---------- */
  var TYPES = {
    pc: { label: 'พีซี', en: 'PC', prefix: 'PC', icon:
      '<rect x="-15" y="-13" width="30" height="20" rx="2" fill="#2d3e57" stroke="#7fb2ff" stroke-width="2"/>'
      + '<rect x="-12" y="-10" width="24" height="14" rx="1" fill="#173a63"/>'
      + '<rect x="-5" y="7" width="10" height="4" fill="#7fb2ff"/>'
      + '<rect x="-10" y="11" width="20" height="3" rx="1.5" fill="#9fb3cc"/>' },
    phone: { label: 'มือถือ', en: 'Phone', prefix: 'Phone', icon:
      '<rect x="-9" y="-15" width="18" height="30" rx="4" fill="#2d3e57" stroke="#7fb2ff" stroke-width="2"/>'
      + '<rect x="-6" y="-11" width="12" height="20" rx="1" fill="#173a63"/>'
      + '<circle cx="0" cy="12" r="1.6" fill="#9fb3cc"/>' },
    switch: { label: 'สวิตช์', en: 'Switch', prefix: 'SW', icon:
      '<rect x="-18" y="-8" width="36" height="16" rx="3" fill="#214a3a" stroke="#3ddc97" stroke-width="2"/>'
      + '<rect x="-13" y="-2" width="5" height="5" rx="1" fill="#9affd6"/>'
      + '<rect x="-5" y="-2" width="5" height="5" rx="1" fill="#9affd6"/>'
      + '<rect x="3" y="-2" width="5" height="5" rx="1" fill="#9affd6"/>'
      + '<rect x="11" y="-2" width="5" height="5" rx="1" fill="#9affd6"/>'
      + '<path d="M-9 -5 h4 M-1 -5 h4 M7 -5 h4" stroke="#3ddc97" stroke-width="1.4"/>' },
    router: { label: 'เราเตอร์', en: 'Router', prefix: 'R', icon:
      '<rect x="-17" y="-10" width="34" height="20" rx="10" fill="#3a2a52" stroke="#c08bff" stroke-width="2"/>'
      + '<path d="M-9 -2 h14 M5 -2 l-4 -3 M5 -2 l-4 3" fill="none" stroke="#e0c4ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
      + '<path d="M9 4 h-14 M-5 4 l4 -3 M-5 4 l4 3" fill="none" stroke="#e0c4ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' },
    ap: { label: 'แอคเซสพอยต์', en: 'Access Point', prefix: 'AP', icon:
      '<circle cx="0" cy="6" r="6" fill="#173a63" stroke="#5fd0ff" stroke-width="2"/>'
      + '<path d="M-6 -1 a8 8 0 0 1 12 0" fill="none" stroke="#7fe0ff" stroke-width="2" stroke-linecap="round"/>'
      + '<path d="M-11 -5 a14 14 0 0 1 22 0" fill="none" stroke="#7fe0ff" stroke-width="2" stroke-linecap="round" opacity="0.75"/>'
      + '<path d="M-15 -10 a20 20 0 0 1 30 0" fill="none" stroke="#7fe0ff" stroke-width="2" stroke-linecap="round" opacity="0.5"/>' },
    server: { label: 'เซิร์ฟเวอร์', en: 'Server', prefix: 'SRV', icon:
      '<rect x="-11" y="-15" width="22" height="30" rx="3" fill="#4a3410" stroke="#ffce6b" stroke-width="2"/>'
      + '<rect x="-7" y="-11" width="14" height="6" rx="1" fill="#2a1e08"/>'
      + '<rect x="-7" y="-2" width="14" height="6" rx="1" fill="#2a1e08"/>'
      + '<circle cx="5" cy="-8" r="1.3" fill="#3ddc97"/>'
      + '<circle cx="5" cy="1" r="1.3" fill="#3ddc97"/>'
      + '<rect x="-7" y="7" width="14" height="6" rx="1" fill="#2a1e08"/>'
      + '<circle cx="5" cy="10" r="1.3" fill="#ffd54a"/>' },
    isp: { label: 'ผู้ให้บริการเน็ต', en: 'ISP', prefix: 'ISP', icon:
      '<circle cx="0" cy="0" r="15" fill="#13344e" stroke="#74c7ff" stroke-width="2"/>'
      + '<ellipse cx="0" cy="0" rx="6.5" ry="15" fill="none" stroke="#74c7ff" stroke-width="1.4"/>'
      + '<line x1="-15" y1="0" x2="15" y2="0" stroke="#74c7ff" stroke-width="1.4"/>'
      + '<path d="M-13 -7 H13 M-13 7 H13" stroke="#74c7ff" stroke-width="1.2" fill="none"/>' }
  };
  var MEDIA = { utp: 'edge-utp', fiber: 'edge-fiber', wireless: 'edge-wireless' };
  var MEDIA_LABEL = { utp: 'สาย UTP (UTP)', fiber: 'ไฟเบอร์ (Fiber)', wireless: 'ไร้สาย (Wireless)' };
  var MEDIA_SHORT = { utp: 'UTP', fiber: 'Fiber', wireless: 'Wireless' };

  /* ---------- อุปกรณ์ตัวไหนรองรับสื่อ/พอร์ตอะไร (กันต่อมั่ว · ตามจริง ปวช.1/ปวส.1) ----------
   * พีซี-เซิร์ฟเวอร์ ด้วยไฟเบอร์ = ต่อไม่ได้ (ไม่มีพอร์ตไฟเบอร์)
   * เซิร์ฟเวอร์ ด้วยไร้สาย = ต่อไม่ได้ (เซิร์ฟเวอร์ต่อสายเสมอ) */
  var DEVICE_MEDIA = {
    pc:     ['utp', 'wireless'],
    phone:  ['wireless'],
    switch: ['utp', 'fiber'],
    router: ['utp', 'fiber', 'wireless'],
    ap:     ['utp', 'wireless'],
    server: ['utp', 'fiber'],
    isp:    ['fiber', 'utp']
  };
  function deviceSupports(type, m) { return (DEVICE_MEDIA[type] || []).indexOf(m) >= 0; }
  function supportedText(type) {
    return (DEVICE_MEDIA[type] || []).map(function (m) { return MEDIA_SHORT[m]; }).join(', ') || '—';
  }
  function typeLabel(type) { var t = TYPES[type]; return t ? t.label + ' (' + t.en + ')' : type; }

  /* ---------- กฎบทบาท-ตำแหน่ง (topology role): ISP ต่อได้เฉพาะ Router ----------
   * แก้ปัญหาเด็กวางมั่ว (ต่อ ISP เข้า Switch/AP/PC ตรงๆ) — เน็ตจากผู้ให้บริการ
   * ต้องผ่านเราเตอร์ก่อนเสมอ · media matrix คุมชนิดสายอยู่แล้ว ที่นี่คุม "ใครต่อใคร" */
  function roleError(A, B) {
    if (A.type === 'isp' && B.type !== 'router')
      return { node: B, msg: 'ISP ต้องต่อเข้า Router ก่อน — ต่อ ' + typeLabel(B.type) + ' ตรงๆ ไม่ได้ (เน็ตผู้ให้บริการต้องผ่านเราเตอร์)' };
    if (B.type === 'isp' && A.type !== 'router')
      return { node: A, msg: 'ISP ต้องต่อเข้า Router ก่อน — ต่อ ' + typeLabel(A.type) + ' ตรงๆ ไม่ได้ (เน็ตผู้ให้บริการต้องผ่านเราเตอร์)' };
    return null;
  }

  /* ---------- สถานะ engine ---------- */
  var svg, layers = {}, state, seq, els;
  var mode = 'idle';          // place | connect | delete | simulate | idle
  var placeType = 'pc';
  var media = 'utp';
  var sel = { connect: null, simSrc: null, delPending: null };
  var statusCb = null, changeCb = null, toastCb = null, configCb = null, wifiCb = null, settingsCb = null;
  var STORE_KEY = 'netsim_builder_v1';
  var arp = {};               // ตาราง ARP รายเครื่อง (ip neigh) — อยู่ใน memory ไม่เซฟ · ล้างเมื่อโหลดผังใหม่
  var dnsStrict = false;      // true เฉพาะ builder (init opts.dnsStrict) = ชื่อต้องผ่าน DNS ของเครื่อง · false = แปลงชื่อเองเหมือนเดิม (ไฟล์ภารกิจ)
  var pktCb = null, pktN = 0; // callback ดักจับแพ็กเก็ต (init opts.onPacket) · null = ไม่ปล่อยเหตุการณ์ใด ๆ ไม่แตะ ARP cache เพิ่ม (ไฟล์ภารกิจเทอม 1)

  function fresh() {
    state = { nodes: [], edges: [], tables: [] };   // tables = โต๊ะวาดห้อง (ไม่ใช่ node: ไม่มีสาย/IP/ไม่นับ)
    seq = {}; els = { node: {}, edge: {}, edgeHit: {}, table: {} };
    sel = { connect: null, simSrc: null, delPending: null };
    arp = {};
  }

  function mk(name, attrs) {
    var e = document.createElementNS(SVGNS, name);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function status(msg) { if (statusCb) statusCb(msg); }
  function toast(msg, kind) { if (toastCb) toastCb(msg, kind); }
  function changed() { if (changeCb) changeCb(state.nodes.length, state.edges.length); save(); }

  /* ---------- พิกัด screen -> svg ---------- */
  function toSvg(clientX, clientY) {
    var r = svg.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  }

  /* ================= NODES ================= */
  // ข้าม id ที่มีอยู่แล้ว — ผังที่โหลดเข้ามา (preset/ไฟล์ผัง) มี PC1.. อยู่ก่อน ตัวนับเริ่ม 0 จะชน
  function nextId(type) {
    var id;
    do { seq[type] = (seq[type] || 0) + 1; id = TYPES[type].prefix + seq[type]; } while (nodeById(id));
    return id;
  }
  function nodeById(id) {
    for (var i = 0; i < state.nodes.length; i++) if (state.nodes[i].id === id) return state.nodes[i];
    return null;
  }

  function renderNode(n) {
    var g = mk('g', { 'class': 'node', 'data-id': n.id, transform: 'translate(' + n.x + ',' + n.y + ')' });
    g.innerHTML = '<circle class="ring" cx="0" cy="0" r="26"/>' + TYPES[n.type].icon;
    var label = mk('text', { 'class': 'node-label', x: 0, y: 32, 'text-anchor': 'middle' });
    label.textContent = n.id;
    g.appendChild(label);
    if (canHaveIP(n.type)) {   // เลขไอพีใต้ชื่อ (เฉพาะ PC/Server)
      var iptext = mk('text', { 'class': 'node-ip', x: 0, y: 43, 'text-anchor': 'middle' });
      iptext.textContent = n.ip || '';
      g.appendChild(iptext);
    }
    if (canHaveWifi(n.type) && n.wifi) {   // แม่กุญแจ = Wi-Fi มีรหัส (หลัง loadState/reload)
      var lk0 = mk('text', { 'class': 'node-lock', x: 16, y: -16, 'text-anchor': 'middle' });
      lk0.textContent = '🔒'; g.appendChild(lk0);
    }
    if (n.fw) {   // 🛡️ Firewall (wk10 1009): บล็อก=โล่ · เปิด Allow Sharing=กุญแจไข
      var fwg = mk('text', { 'class': 'node-fw', x: -16, y: -16, 'text-anchor': 'middle' });
      fwg.textContent = n.fwAllow ? '🔓' : '🛡️'; g.appendChild(fwg);
    }
    dhcpBadge(n, g);   // ป้าย DHCP เล็ก ๆ (router ที่เปิดแจก / เครื่องที่ถือ lease)
    var hit = mk('circle', { 'class': 'node-hit', cx: 0, cy: 0, r: 26 });
    g.appendChild(hit);
    layers.nodes.appendChild(g);
    els.node[n.id] = g;
    attachNode(hit, g, n);
  }

  var MAX_NODES = 40;              // กันเด็กแตะรัวจนกระดานรก/ลากหนืด (ภารกิจจริงใช้ 5-12 ตัว)
  function addNode(type, x, y) {
    if (state.nodes.length >= MAX_NODES) {
      toast('กระดานเต็มแล้ว (สูงสุด ' + MAX_NODES + ' ตัว) — ลบตัวที่ไม่ใช้ก่อน', 'bad');
      return null;
    }
    var n = { id: nextId(type), type: type, x: Math.round(x), y: Math.round(y) };
    state.nodes.push(n);
    renderNode(n);
    changed();
    return n;
  }

  function removeNode(id) {
    // ลบ edge ที่ต่อกับ node นี้ก่อน
    var keep = [];
    for (var i = 0; i < state.edges.length; i++) {
      var e = state.edges[i];
      if (e.a === id || e.b === id) {
        if (els.edge[e.id]) els.edge[e.id].remove(); delete els.edge[e.id];
        if (els.edgeHit[e.id]) els.edgeHit[e.id].remove(); delete els.edgeHit[e.id];
      }
      else keep.push(e);
    }
    state.edges = keep;
    state.nodes = state.nodes.filter(function (n) { return n.id !== id; });
    if (els.node[id]) els.node[id].remove();
    delete els.node[id];
    changed();
  }

  // ตัดสายเส้นเดียว (โหมดตัดสาย) — ลบ edge ไม่แตะ node → ใช้สอน Single Point of Failure / reroute
  function removeEdge(id) {
    state.edges = state.edges.filter(function (e) { return e.id !== id; });
    if (els.edge[id]) { els.edge[id].remove(); delete els.edge[id]; }
    if (els.edgeHit[id]) { els.edgeHit[id].remove(); delete els.edgeHit[id]; }
    changed();
  }
  function tapCutEdge(id) {
    var found = false;
    for (var i = 0; i < state.edges.length; i++) if (state.edges[i].id === id) { found = true; break; }
    if (!found) return;
    removeEdge(id);
    toast('✂️ ตัดสายแล้ว — ลองชี้เส้นทาง/ping ดูว่ายังถึงกันไหม', 'bad');
    status('โหมดตัดสาย: แตะที่เส้นสายเพื่อตัด (ดูว่าเครือข่ายล่ม หรือหาทางอ้อมได้)');
  }

  /* ================= TABLES (โต๊ะ) — สี่เหลี่ยมวาดห้อง · อยู่ใต้สาย/อุปกรณ์ · ไม่ใช่ node ================= */
  var MAX_TABLES = 30, TB_MIN_W = 40, TB_MIN_H = 30;
  function tableById(id) {
    for (var i = 0; i < state.tables.length; i++) if (state.tables[i].id === id) return state.tables[i];
    return null;
  }
  function nextTableId() {
    var k = 0, id;
    do { id = 'T' + (++k); } while (tableById(id));
    return id;
  }
  function renderTable(t) {
    var g = mk('g', { 'class': 'table', 'data-id': t.id, transform: 'translate(' + t.x + ',' + t.y + ')' });
    var body = mk('rect', { 'class': 'table-body', x: 0, y: 0, width: t.w, height: t.h, rx: 6 });
    var lb = mk('text', { 'class': 'table-label', x: 8, y: 16 }); lb.textContent = 'โต๊ะ';
    var hv = mk('circle', { 'class': 'table-handle-vis', cx: t.w, cy: t.h, r: 8 });
    var hh = mk('circle', { 'class': 'table-handle', cx: t.w, cy: t.h, r: 22 });
    g.appendChild(body); g.appendChild(lb); g.appendChild(hv); g.appendChild(hh);
    layers.tables.appendChild(g);
    els.table[t.id] = g;
    attachTable(g, body, hh, t);
  }
  function placeTableEl(t) {
    var g = els.table[t.id]; if (!g) return;
    g.setAttribute('transform', 'translate(' + t.x + ',' + t.y + ')');
    var b = g.querySelector('.table-body'); b.setAttribute('width', t.w); b.setAttribute('height', t.h);
    [].forEach.call(g.querySelectorAll('.table-handle,.table-handle-vis'), function (c) { c.setAttribute('cx', t.w); c.setAttribute('cy', t.h); });
  }
  function addTable(x, y) {
    if (state.tables.length >= MAX_TABLES) { toast('โต๊ะเต็มแล้ว (สูงสุด ' + MAX_TABLES + ' ตัว) — ลบตัวที่ไม่ใช้ก่อน', 'bad'); return null; }
    var W = svg.clientWidth, H = svg.clientHeight;
    var w = Math.min(120, Math.max(TB_MIN_W, W - 8)), h = Math.min(64, Math.max(TB_MIN_H, H - 8));
    var t = { id: nextTableId(), x: Math.round(clamp(x - w / 2, 0, W - w)), y: Math.round(clamp(y - h / 2, 0, H - h)), w: Math.round(w), h: Math.round(h) };
    state.tables.push(t);
    renderTable(t);
    changed();
    return t;
  }
  function removeTable(id) {
    state.tables = state.tables.filter(function (t) { return t.id !== id; });
    if (els.table[id]) els.table[id].remove();
    delete els.table[id];
    changed();
  }
  function selEl(id) { return els.node[id] || els.table[id]; }
  function tapDeleteTable(id) {
    if (sel.delPending === id) {
      els.table[id].classList.remove('sel-del'); sel.delPending = null;
      removeTable(id);
      toast('ลบโต๊ะ ' + id + ' แล้ว', 'bad');
      status('โหมดลบ: แตะอุปกรณ์ที่ต้องการลบ');
    } else {
      if (sel.delPending) selEl(sel.delPending).classList.remove('sel-del');
      sel.delPending = id;
      els.table[id].classList.add('sel-del');
      status('⚠️ แตะโต๊ะ ' + id + ' อีกครั้งเพื่อยืนยันลบ (แตะตัวอื่นเพื่อยกเลิก)');
    }
  }
  // ลากตัวโต๊ะ = ย้าย · ลากจุดมุมขวาล่าง = ปรับขนาด · แตะเฉยๆ = วางอุปกรณ์ที่เลือกไว้ลงบนโต๊ะ / (โหมดลบ) ลบโต๊ะ
  function attachTable(g, body, handle, t) {
    var drag = null, moved = false, sx = 0, sy = 0;
    [body, handle].forEach(function (el) {
      el.addEventListener('touchstart', function (e) { e.preventDefault(); }, { passive: false });
      el.addEventListener('pointerdown', function (e) {
        el.setPointerCapture(e.pointerId);
        var p = toSvg(e.clientX, e.clientY);
        sx = p.x; sy = p.y; moved = false;
        if (mode === 'place') drag = (el === handle) ? { k: 'size' } : { k: 'move', ox: p.x - t.x, oy: p.y - t.y };
      });
      el.addEventListener('pointermove', function (e) {
        var p = toSvg(e.clientX, e.clientY);
        if (Math.abs(p.x - sx) > 6 || Math.abs(p.y - sy) > 6) moved = true;
        if (!drag) return;
        var W = svg.clientWidth, H = svg.clientHeight;
        if (drag.k === 'move') { t.x = clamp(p.x - drag.ox, 0, Math.max(0, W - t.w)); t.y = clamp(p.y - drag.oy, 0, Math.max(0, H - t.h)); }
        else { t.w = clamp(p.x - t.x, TB_MIN_W, Math.max(TB_MIN_W, W - t.x)); t.h = clamp(p.y - t.y, TB_MIN_H, Math.max(TB_MIN_H, H - t.y)); }
        placeTableEl(t);
      });
      function end(e) {
        if (el.hasPointerCapture && el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
        if (drag) {
          var was = drag; drag = null;
          t.x = Math.round(t.x); t.y = Math.round(t.y); t.w = Math.round(t.w); t.h = Math.round(t.h);
          if (moved) { placeTableEl(t); save(); return; }
          if (was.k === 'size') return;
          if (placeType !== 'table') { var p = toSvg(e.clientX, e.clientY); addNode(placeType, p.x, p.y); }   // แตะโต๊ะ = วางคอมบนโต๊ะ
          return;
        }
        if (!moved && mode === 'delete') tapDeleteTable(t.id);
      }
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
    });
  }
  function cleanTables(arr) {   // กรองโต๊ะจากไฟล์/ลิงก์/autosave · ไม่มี tables = ว่าง (ไฟล์เก่าโหลดเหมือนเดิม)
    var seen = {}, out = [];
    (Array.isArray(arr) ? arr : []).forEach(function (t) {
      if (!t || !isFinite(t.x) || !isFinite(t.y) || !isFinite(t.w) || !isFinite(t.h) || out.length >= MAX_TABLES) return;
      var c = { id: String(t.id || ''), x: Math.round(+t.x), y: Math.round(+t.y), w: Math.round(Math.max(TB_MIN_W, +t.w)), h: Math.round(Math.max(TB_MIN_H, +t.h)) };
      if (!c.id || seen[c.id]) { var k = 0; do { c.id = 'T' + (++k); } while (seen[c.id]); }
      seen[c.id] = 1; out.push(c);
    });
    return out;
  }

  /* ลากย้าย node — Pointer Events + setPointerCapture + touchstart fallback */
  function attachNode(hit, g, n) {
    var dragging = false, moved = false, startX = 0, startY = 0, off = { x: 0, y: 0 };
    var THRESH = 6;

    // มาตรการเสริม WebView เก่า (LINE) — passive:false ให้ preventDefault ได้
    hit.addEventListener('touchstart', function (e) { e.preventDefault(); }, { passive: false });

    hit.addEventListener('pointerdown', function (e) {
      hit.setPointerCapture(e.pointerId);
      var p = toSvg(e.clientX, e.clientY);
      startX = p.x; startY = p.y; moved = false;
      if (mode === 'place') {
        dragging = true; off.x = p.x - n.x; off.y = p.y - n.y;
        g.classList.add('dragging');
      }
    });

    hit.addEventListener('pointermove', function (e) {
      var p = toSvg(e.clientX, e.clientY);
      if (Math.abs(p.x - startX) > THRESH || Math.abs(p.y - startY) > THRESH) moved = true;
      if (!dragging) return;
      n.x = clamp(p.x - off.x, 16, svg.clientWidth - 16);
      n.y = clamp(p.y - off.y, 16, svg.clientHeight - 24);
      g.setAttribute('transform', 'translate(' + n.x + ',' + n.y + ')');
      updateEdgesFor(n.id);
    });

    function end(e) {
      if (hit.hasPointerCapture && hit.hasPointerCapture(e.pointerId)) hit.releasePointerCapture(e.pointerId);
      if (dragging) {
        dragging = false; g.classList.remove('dragging');
        n.x = Math.round(n.x); n.y = Math.round(n.y);
        save();
        return;
      }
      if (!moved) tapNode(n.id);   // แตะ (ไม่ลาก) = ทำงานตามโหมด
    }
    hit.addEventListener('pointerup', end);
    hit.addEventListener('pointercancel', end);  // กัน LINE WebView ตัดกลางลาก
  }

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  /* ================= EDGES ================= */
  function edgeExists(a, b) {
    for (var i = 0; i < state.edges.length; i++) {
      var e = state.edges[i];
      if ((e.a === a && e.b === b) || (e.a === b && e.b === a)) return true;
    }
    return false;
  }
  function renderEdge(e) {
    var A = nodeById(e.a), B = nodeById(e.b);
    if (!A || !B) return;
    var line = mk('line', { 'class': 'edge ' + MEDIA[e.media], 'data-id': e.id,
      x1: A.x, y1: A.y, x2: B.x, y2: B.y });
    layers.edges.appendChild(line);
    els.edge[e.id] = line;
    // เส้นโปร่งใสกว้าง = พื้นที่แตะตัดสาย (active เฉพาะโหมดตัดสาย ผ่าน css .cut-on)
    var hit = mk('line', { 'class': 'edge-hit', 'data-id': e.id,
      x1: A.x, y1: A.y, x2: B.x, y2: B.y });
    hit.addEventListener('pointerdown', function (ev) {
      if (mode === 'cutlink') { ev.preventDefault(); ev.stopPropagation(); tapCutEdge(e.id); }
    });
    layers.edges.appendChild(hit);
    els.edgeHit[e.id] = hit;
  }
  function addEdge(a, b, m) {
    if (a === b) return { ok: false, reason: 'same' };
    if (edgeExists(a, b)) return { ok: false, reason: 'dup' };
    var A = nodeById(a), B = nodeById(b);
    if (!A || !B) return { ok: false, reason: 'missing' };
    // ตรวจทั้งสองฝั่งว่ารองรับสื่อชนิดนี้ไหม (กันต่อมั่ว)
    if (!deviceSupports(A.type, m)) return { ok: false, reason: 'media', node: A };
    if (!deviceSupports(B.type, m)) return { ok: false, reason: 'media', node: B };
    // กฎบทบาท: ISP ต่อได้เฉพาะ Router (กันวางมั่ว ISP→Switch/AP/PC)
    var rerr = roleError(A, B); if (rerr) return { ok: false, reason: 'role', node: rerr.node, msg: rerr.msg };
    // เชื่อมไร้สายเข้า AP/Router ที่ "ตั้งรหัสแล้ว" ต้องใส่รหัสก่อน (ผ่าน connectAuth)
    if (!_authBypass) { var sap = securedAp(a, b, m); if (sap) return { ok: false, reason: 'wifi', node: sap, a: a, b: b, m: m }; }
    var e = { id: nextEdgeId(), a: a, b: b, media: m };
    state.edges.push(e);
    renderEdge(e);
    changed();
    return { ok: true };
  }
  var _edgeSeq = 0;
  function nextEdgeId() {
    var id;
    do { id = 'e' + (++_edgeSeq); } while (state.edges.some(function (x) { return x.id === id; }));
    return id;
  }
  function updateEdgesFor(id) {
    for (var i = 0; i < state.edges.length; i++) {
      var e = state.edges[i];
      if (e.a !== id && e.b !== id) continue;
      var line = els.edge[e.id]; if (!line) continue;
      var A = nodeById(e.a), B = nodeById(e.b);
      line.setAttribute('x1', A.x); line.setAttribute('y1', A.y);
      line.setAttribute('x2', B.x); line.setAttribute('y2', B.y);
      var hit = els.edgeHit[e.id];
      if (hit) { hit.setAttribute('x1', A.x); hit.setAttribute('y1', A.y); hit.setAttribute('x2', B.x); hit.setAttribute('y2', B.y); }
    }
  }

  /* ================= แตะ node ตามโหมด ================= */
  function clearSelClasses() {
    for (var id in els.node) {
      els.node[id].classList.remove('sel-connect', 'sel-sim', 'sel-del');
    }
    for (var tid in els.table) els.table[tid].classList.remove('sel-del');
  }
  function tapNode(id) {
    if (mode === 'connect') return tapConnect(id);
    if (mode === 'delete') return tapDelete(id);
    if (mode === 'simulate') return tapSim(id);
    if (mode === 'config') return tapConfig(id);
    if (mode === 'settings') return tapSettings(id);
    // place mode: แตะ node เฉยๆ ไม่ทำอะไร (ลากเพื่อย้าย)
  }

  function tapConnect(id) {
    if (sel.connect === null) {
      sel.connect = id;
      els.node[id].classList.add('sel-connect');
      status('🔗 แตะอุปกรณ์ปลายทางที่จะเชื่อมกับ ' + id + ' (สื่อ: ' + MEDIA_LABEL[media] + ')');
    } else if (sel.connect === id) {
      els.node[id].classList.remove('sel-connect'); sel.connect = null;
      status('เลือกอุปกรณ์ตัวแรกเพื่อเริ่มเชื่อมสาย');
    } else {
      var res = addEdge(sel.connect, id, media);
      els.node[sel.connect].classList.remove('sel-connect');
      var first = sel.connect; sel.connect = null;
      if (res.ok) {
        var op = openAp(first, id, media);
        toast('เชื่อม ' + first + ' ↔ ' + id + (op ? ' ⚠️ Wi-Fi ไม่มีรหัส ใครก็เกาะได้!' : ' (' + MEDIA_LABEL[media] + ')'), op ? 'bad' : 'ok');
        status(op ? '📶 Wi-Fi วงนี้ยังเปิดโล่ง ใครก็เกาะได้' : 'เชื่อมสำเร็จ — แตะอุปกรณ์ตัวแรกเพื่อเชื่อมเส้นต่อไป');
      } else if (res.reason === 'wifi') {
        if (wifiCb) { wifiCb(res.node.id, first, id, media); }
        else { toast('🔒 Wi-Fi มีรหัส — ใส่รหัสก่อนถึงเชื่อมได้', 'bad'); }
        status('🔒 ' + res.node.id + ' มีรหัส Wi-Fi — ใส่รหัสให้ถูกเพื่อเชื่อม');
      } else if (res.reason === 'media') {
        var nd = res.node;
        toast('🚫 ' + typeLabel(nd.type) + ' ต่อ "' + MEDIA_LABEL[media] + '" ไม่ได้ — รองรับ: ' + supportedText(nd.type), 'bad');
        status('สื่อไม่ตรงชนิดอุปกรณ์ — ดู "รองรับ" ใต้ปุ่มอุปกรณ์ แล้วเลือกสื่อใหม่');
      } else if (res.reason === 'role') {
        toast('🚫 ' + res.msg, 'bad');
        status(res.msg);
      } else if (res.reason === 'dup') {
        toast('สองตัวนี้เชื่อมกันอยู่แล้ว', 'bad'); status('เลือกอุปกรณ์ตัวแรกเพื่อเริ่มเชื่อมสาย');
      } else {
        status('เลือกอุปกรณ์ตัวแรกเพื่อเริ่มเชื่อมสาย');
      }
    }
  }

  function tapDelete(id) {
    if (sel.delPending === id) {                     // แตะซ้ำ = ยืนยันลบ
      els.node[id].classList.remove('sel-del'); sel.delPending = null;
      removeNode(id);
      toast('ลบ ' + id + ' แล้ว', 'bad');
      status('โหมดลบ: แตะอุปกรณ์ที่ต้องการลบ');
    } else {
      if (sel.delPending) selEl(sel.delPending).classList.remove('sel-del');
      sel.delPending = id;
      els.node[id].classList.add('sel-del');
      status('⚠️ แตะ ' + id + ' อีกครั้งเพื่อยืนยันลบ (แตะตัวอื่นเพื่อยกเลิก)');
    }
  }

  function tapSim(id) {
    if (sel.simSrc === null) {
      sel.simSrc = id;
      els.node[id].classList.add('sel-sim');
      status('🎯 แตะอุปกรณ์ปลายทาง (ต้นทาง = ' + id + ')');
    } else if (sel.simSrc === id) {
      els.node[id].classList.remove('sel-sim'); sel.simSrc = null;
      status('🧭 ชี้เส้นทาง: แตะเครื่องต้นทาง');
    } else {
      var src = sel.simSrc, dst = id;
      els.node[src].classList.remove('sel-sim'); sel.simSrc = null;
      runSimulate(src, dst);
    }
  }

  /* ================= BFS + packet animation ================= */
  function buildAdj() {
    var g = {};
    state.nodes.forEach(function (n) { g[n.id] = []; });
    state.edges.forEach(function (e) { g[e.a].push(e.b); g[e.b].push(e.a); });
    return g;
  }
  /* อุปกรณ์ที่ "ส่งต่อ" แพ็กเก็ตให้เครื่องอื่นได้ — PC/Server เป็นปลายทางเท่านั้น
   * (แก้ 29 ส.ค. 69: เดิม BFS มองทุกโหนดเป็นทางผ่าน แพ็กเก็ตจึงทะลุ PC เครื่องกลางได้ = ผิดหลัก) */
  var FORWARDERS = { switch: 1, router: 1, ap: 1, isp: 1 };
  function findShortestPathBFS(graph, startNode, targetNode) {
    var queue = [startNode], visited = {}, parent = {};
    visited[startNode] = true; parent[startNode] = null;
    while (queue.length) {
      var cur = queue.shift();
      if (cur === targetNode) {
        var path = [], c = targetNode;
        while (c !== null) { path.unshift(c); c = parent[c]; }
        return path;
      }
      var nb = graph[cur] || [];
      for (var i = 0; i < nb.length; i++) {
        var nid = nb[i];
        if (visited[nid]) continue;
        if (nid !== targetNode) {                       // ปลายทางเข้าได้เสมอ
          var nt = (nodeById(nid) || {}).type;
          if (!FORWARDERS[nt]) continue;                // ตัวกลางต้องเป็นสวิตช์/เราเตอร์/AP/ISP
        }
        visited[nid] = true; parent[nid] = cur; queue.push(nid);
      }
    }
    return null;   // ไม่มีเส้นทาง -> ส่งไม่ถึง
  }

  function edgeBetween(a, b) {
    for (var i = 0; i < state.edges.length; i++) {
      var e = state.edges[i];
      if ((e.a === a && e.b === b) || (e.a === b && e.b === a)) return e;
    }
    return null;
  }

  function runSimulate(src, dst) {
    var path = findShortestPathBFS(buildAdj(), src, dst);
    if (!path) {
      toast('⛔ ส่งไม่ถึง — ' + src + ' ยังไม่ได้เชื่อมถึง ' + dst, 'bad');
      status('ส่งไม่ถึง — เส้นทางจากต้นทางไปปลายทางยังขาดตอน');
      return;
    }
    animateAlong(path, null);
  }
  // วิ่งแพ็กเก็ตตามเส้นทาง path (array of node id) — reuse ทั้งโหมดจำลอง + คำสั่ง ping
  function animateAlong(path, onDone) {
    var d = '', hi = [];
    for (var i = 0; i < path.length; i++) {
      var n = nodeById(path[i]);
      d += (i === 0 ? 'M' : ' L') + ' ' + n.x + ' ' + n.y;
      if (i > 0) { var ed = edgeBetween(path[i - 1], path[i]); if (ed && els.edge[ed.id]) hi.push(els.edge[ed.id]); }
    }
    hi.forEach(function (l) { l.classList.add('active'); });
    var trail = mk('path', { 'class': 'packet-trail', d: d, fill: 'none' });
    layers.packets.appendChild(trail);
    var packet = mk('circle', { 'class': 'packet', r: 7, cx: nodeById(path[0]).x, cy: nodeById(path[0]).y });
    layers.packets.appendChild(packet);
    var hops = path.length - 1;
    status('📦 แพ็กเก็ตวิ่ง: ' + path.join(' → '));
    animatePacketAlongPath(trail, packet, Math.max(1100, hops * 750), function () {
      packet.remove(); trail.remove();
      hi.forEach(function (l) { l.classList.remove('active'); });
      if (onDone) onDone(hops, path);
      else {
        toast('✅ ส่งถึงแล้ว! (' + hops + ' hop)', 'ok');
        status('สำเร็จ: ' + path.join(' → ') + ' — แตะต้นทางใหม่เพื่อจำลองอีกครั้ง');
      }
    });
  }

  /* ⚠️ requestAnimationFrame หยุดสนิทเมื่อแท็บถูกซ่อน/ล็อกจอ (verify บนเครื่องจริง 29 ส.ค.:
   * visibilityState=hidden → 0 เฟรมใน 1.5 วิ) — เด็กสลับไปเปิด Classroom กลางคาบแล้วกลับมา
   * จะค้างที่ "กำลัง ping ..." ไม่มีบรรทัดผลลัพธ์ให้จด · จึงต้องมีนาฬิกาสำรองปิดงานให้เสมอ */
  function animatePacketAlongPath(pathEl, packetEl, durationMs, onComplete) {
    var total = pathEl.getTotalLength(), start = null, finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      if (typeof onComplete === 'function') onComplete();
    }
    function step(ts) {
      if (finished) return;
      if (start === null) start = ts;
      var t = (ts - start) / durationMs; if (t > 1) t = 1;
      var pt = pathEl.getPointAtLength(t * total);
      packetEl.setAttribute('cx', pt.x); packetEl.setAttribute('cy', pt.y);
      if (t < 1) requestAnimationFrame(step);
      else finish();
    }
    requestAnimationFrame(step);
    setTimeout(finish, durationMs + 400);     // จอดับ/สลับแอปก็ยังได้ผลลัพธ์
  }

  /* ================= IP / Terminal subsystem (ปวช.1/ปวส.1 เบื้องต้น) ================= */
  var DEFAULT_MASK = '255.255.255.0';
  function canHaveIP(type) { return type === 'pc' || type === 'phone' || type === 'server' || type === 'isp' || type === 'router'; }  // ปลายทาง + ISP + Router (ขา Gateway)
  function parseIp(s) {
    var a = (s || '').trim().split('.');
    if (a.length !== 4) return { bad: 1 };
    for (var i = 0; i < 4; i++) { if (!/^\d+$/.test(a[i]) || +a[i] < 0 || +a[i] > 255) return { bad: 1 }; }
    return { net: a[0] + '.' + a[1] + '.' + a[2], host: +a[3] };
  }
  // วงเดียวกัน = 3 ชุดแรกตรงกัน (/24) · ยกเว้น 169.254.x.y (APIPA/link-local = /16 ทั้งก้อน → ได้ 169.254 ทั้งคู่ยังคุยกันเองได้)
  function isLinkLocal(net) { return /^169\.254\./.test(net); }
  function sameNetwork(ipA, ipB) {
    var a = parseIp(ipA), b = parseIp(ipB);
    if (a.bad || b.bad) return false;
    return a.net === b.net || (isLinkLocal(a.net) && isLinkLocal(b.net));
  }
  function ipError(ip) {   // กฎพื้นฐาน /24 (generic — ไม่ผูกภารกิจรายสัปดาห์)
    var r = parseIp(ip);
    if (r.bad) return 'รูปแบบผิด — ต้องเลข 4 ชุด 0–255 เช่น 192.168.1.10';
    if (r.host === 0) return 'ลงท้าย .0 ไม่ได้ (เป็นเลขวง/หมายเลขเครือข่าย)';
    if (r.host === 255) return 'ลงท้าย .255 ไม่ได้ (เป็น Broadcast)';
    return null;
  }
  function ipConflict(id, ip) {
    var r = parseIp(ip); if (r.bad) return null;
    for (var i = 0; i < state.nodes.length; i++) {
      var n = state.nodes[i]; if (n.id === id || !n.ip) continue;
      var o = parseIp(n.ip);
      if (!o.bad && o.net === r.net && o.host === r.host) return n.id;
    }
    return null;
  }
  function findNodeByIp(ip) {
    var r = parseIp(ip); if (r.bad) return null;
    for (var i = 0; i < state.nodes.length; i++) {
      var n = state.nodes[i]; if (!n.ip) continue;
      var o = parseIp(n.ip);
      if (!o.bad && o.net === r.net && o.host === r.host) return n;
    }
    return null;
  }
  function setNodeIP(id, ip, gw, http, dns) {   // ตั้งเอง (Static) — ล้างโหมด DHCP/lease เดิมทิ้ง · dns = DNS Server (ไม่บังคับ · ว่าง = ไม่มีฟิลด์)
    var n = nodeById(id); if (!n) return;
    var newIp = (ip || '').trim();
    if ((n.ip || '') !== newIp) delete arp[id];
    n.ip = newIp; n.gw = (gw || '').trim();
    delete n.ipmode; delete n.lease; delete n.dns;
    var dv = (dns || '').trim(); if (dv) n.dns = dv;
    if (http !== undefined && http !== null && http !== '') n.http = +http;
    paintNode(id);
    save(); changed();
  }
  function setNodeHttp(id, http) {   // เปลี่ยนแค่ HTTP status ของเซิร์ฟเวอร์ (ไม่แตะ IP — ใช้ตอนโหมด DHCP)
    var n = nodeById(id); if (!n || http === undefined || http === null || http === '') return;
    n.http = +http; save(); changed();
  }

  /* ================= DHCP (wk4 MikroTik · router แจก IP ให้ PC/Server) =================
   * โมเดลเดิม: router มี IP เดียว (n.ip) และ "ข้ามวง" = มี router อยู่ในเส้นทาง + ต้นทางมี gw → DHCP จึงแจกได้วงเดียว
   * = วง /24 ของ router · router: n.dhcp = {on,from,to,dns} (from/to = เลขท้าย 1–254) · เครื่องลูก: n.ipmode='dhcp'
   * + n.lease={server:<routerId>} + n.dns · node ที่ไม่มีฟิลด์เหล่านี้ = ทำงานเหมือนเดิมเป๊ะ */
  function canDhcpClient(type) { return type === 'pc' || type === 'phone' || type === 'server'; }
  function dhcpCfg(r) {   // ค่า DHCP ที่ใช้ได้จริงของ router (null = ปิด/ไม่มี IP) · ค่าเพี้ยนจากไฟล์ → ใช้ค่าตั้งต้น 10–254
    if (!r || r.type !== 'router' || !r.dhcp || !r.dhcp.on || !r.ip || ipError(r.ip)) return null;
    var f = Math.floor(+r.dhcp.from), t = Math.floor(+r.dhcp.to);
    if (!(f >= 1 && f <= 254)) f = 10;
    if (!(t >= 1 && t <= 254)) t = 254;
    return { net: parseIp(r.ip).net, from: f, to: t, gw: r.ip, dns: String(r.dhcp.dns || '').trim() || r.ip };
  }
  /* DISCOVER เป็น broadcast → ผ่านได้เฉพาะสวิตช์/AP · router = ปลายทางที่หยุด (ไม่ทะลุ router อื่น/PC/ISP)
   * คืน router ที่เปิด DHCP เรียงใกล้→ไกล (นับ hop · เสมอ = ตามลำดับใน state) */
  function dhcpServersFor(srcId) {
    var adj = buildAdj(), dist = {}, queue = [srcId], found = [], order = {};
    state.nodes.forEach(function (n, i) { order[n.id] = i; });
    dist[srcId] = 0;
    while (queue.length) {
      var cur = queue.shift(), nb = adj[cur] || [];
      for (var i = 0; i < nb.length; i++) {
        var id = nb[i]; if (dist[id] !== undefined) continue;
        dist[id] = dist[cur] + 1;
        var nn = nodeById(id), t = nn ? nn.type : '';
        if (t === 'router') { if (dhcpCfg(nn)) found.push({ id: id, d: dist[id] }); }
        else if (t === 'switch' || t === 'ap') queue.push(id);
      }
    }
    found.sort(function (a, b) { return a.d - b.d || order[a.id] - order[b.id]; });
    return found.map(function (f) { return f.id; });
  }
  function ipInUse(selfId, net, host) {   // มีเครื่องอื่น (static หรือ lease) ถือ net.host อยู่ไหม
    for (var i = 0; i < state.nodes.length; i++) {
      var n = state.nodes[i]; if (n.id === selfId || !n.ip) continue;
      var o = parseIp(n.ip);
      if (!o.bad && o.net === net && o.host === host) return true;
    }
    return false;
  }
  // IP ว่างตัวแรกในช่วง · ลูกข่ายเดิมของ server เดิมขอ IP เดิมคืนได้ถ้ายังว่าง (renew แล้วเลขไม่เด้ง)
  function pickLeaseIp(c, n, srvId) {
    var old = parseIp(n.ip);
    if (n.lease && n.lease.server === srvId && !old.bad && old.net === c.net && old.host >= c.from && old.host <= c.to &&
        !ipInUse(n.id, c.net, old.host)) return n.ip;
    for (var h = c.from; h <= c.to; h++) if (!ipInUse(n.id, c.net, h)) return c.net + '.' + h;
    return null;
  }
  function hash32(s) { var h = 7; s = String(s); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 65521; return h; }
  function hex2(v) { v = v & 255; return (v < 16 ? '0' : '') + v.toString(16); }
  function macOf(id) { var a = hash32(id), b = hash32(id + '#mac'); return '52:54:00:' + hex2(a >> 8) + ':' + hex2(a) + ':' + hex2(b); }
  function apipaFor(id) {   // 169.254.x.y คงที่ตาม id (ชนเครื่องอื่นค่อยขยับ y)
    var h = hash32(id), x = 1 + (h % 254), y = 1 + ((h * 7 + 3) % 254), ip = '';
    for (var k = 0; k < 254; k++) {
      ip = '169.254.' + x + '.' + y;
      var o = findNodeByIp(ip); if (!o || o.id === id) return ip;
      y = (y % 254) + 1;
    }
    return ip;
  }
  function dhcpTag(n) {   // ป้าย DHCP เล็ก ๆ ข้างไอคอน: router ที่เปิดแจก (ซ้าย) · เครื่องที่ถือ lease (ขวา)
    if (n.type === 'router' && n.dhcp && n.dhcp.on) return { x: -20, a: 'end' };
    if (n.lease && n.lease.server && canDhcpClient(n.type)) return { x: 20, a: 'start' };
    return null;
  }
  function dhcpBadge(n, g) {
    var old = g.querySelector('.node-dhcp'); if (old) old.remove();
    var tg = dhcpTag(n); if (!tg) return;
    var b = mk('text', { 'class': 'node-dhcp', x: tg.x, y: -14, 'text-anchor': tg.a, 'pointer-events': 'none' });
    b.textContent = 'DHCP'; g.appendChild(b);
  }
  function paintNode(id) {   // วาดป้าย IP + ป้าย DHCP ใหม่ตามค่าใน node
    var n = nodeById(id), g = els.node[id]; if (!n || !g) return;
    var t = g.querySelector('.node-ip'); if (t) t.textContent = n.ip || '';
    dhcpBadge(n, g);
  }
  // ขอ IP อัตโนมัติ (DISCOVER→OFFER→REQUEST→ACK ก้าวเดียว) — server ใกล้สุดที่ยังมี IP ว่างชนะ · ไม่ได้ = 169.254 ไม่มี gw
  function dhcpRequest(id) {
    var n = nodeById(id);
    if (!n || !canDhcpClient(n.type)) return { ok: false, reason: 'notclient' };
    var servers = dhcpServersFor(id), oldIp = n.ip || '';
    for (var i = 0; i < servers.length; i++) {
      var srv = nodeById(servers[i]), c = dhcpCfg(srv), ip = pickLeaseIp(c, n, srv.id);
      if (!ip) continue;   // ช่วงเต็ม → ลอง server ตัวถัดไป (ถ้ามี)
      n.ip = ip; n.gw = c.gw; n.dns = c.dns; n.ipmode = 'dhcp'; n.lease = { server: srv.id };
      if (oldIp !== ip) delete arp[id];
      paintNode(id); capDhcp(id, srv, ip); changed();
      return { ok: true, ip: ip, gw: c.gw, dns: c.dns, server: srv.id, serverIp: srv.ip };
    }
    n.ip = apipaFor(id); n.gw = ''; n.dns = ''; n.ipmode = 'dhcp'; delete n.lease;
    if (oldIp !== n.ip) delete arp[id];
    paintNode(id); capDhcp(id, null, ''); changed();
    return { ok: false, reason: servers.length ? 'full' : 'noserver', apipa: true, ip: n.ip };
  }
  function dhcpRelease(id) {   // คืน IP: ล้าง ip/gw/dns/lease แต่ยังอยู่โหมด DHCP (ipmode คงเดิม)
    var n = nodeById(id);
    if (!n || !canDhcpClient(n.type)) return { ok: false, reason: 'notclient' };
    if (n.ipmode !== 'dhcp') return { ok: false, reason: 'static' };
    var had = leaseOf(id), oldIp = n.ip || '';
    n.ip = ''; n.gw = ''; n.dns = ''; delete n.lease; delete arp[id];
    paintNode(id); changed();
    return { ok: true, ip: oldIp, lease: had };
  }
  function leaseOf(id) {   // lease ปัจจุบัน {server, serverIp} หรือ null
    var n = nodeById(id); if (!n || !n.lease || !n.lease.server) return null;
    var s = nodeById(n.lease.server);
    return { server: n.lease.server, serverIp: s ? (s.ip || '') : '' };
  }
  function setNodeDhcp(id, cfg) {   // router เท่านั้น · cfg = {on,from,to,dns}
    var n = nodeById(id); if (!n || n.type !== 'router' || !cfg) return;
    n.dhcp = { on: !!cfg.on, from: +cfg.from || 10, to: +cfg.to || 254, dns: String(cfg.dns || '').trim() };
    paintNode(id); changed();
  }
  function getDhcp(id) {   // ค่า DHCP ที่ router นี้เก็บไว้ (null = ไม่เคยตั้ง)
    var n = nodeById(id); if (!n || n.type !== 'router' || !n.dhcp) return null;
    return { on: !!n.dhcp.on, from: +n.dhcp.from || 10, to: +n.dhcp.to || 254, dns: String(n.dhcp.dns || '') };
  }

  /* ---------- ตาราง ARP (ip neigh): เครื่องในวงเดียวกันที่เคยคุยสำเร็จ + gateway เมื่อเคยออกนอกวง ---------- */
  function arpAdd(srcId, id, ip, isGw) {
    var l = arp[srcId] || (arp[srcId] = []);
    for (var i = 0; i < l.length; i++) if (l[i].ip === ip) { l[i].id = id; return false; }
    l.push({ id: id, ip: ip, gw: !!isGw });
    return true;   // รายการใหม่ (ถามจริงครั้งแรก → ดักจับเห็น ARP request/reply)
  }
  function arpNote(srcId, targetId, path) {   // เรียกเมื่อ ping/http/ping เน็ต "สำเร็จ"
    var s = nodeById(srcId); if (!s || !s.ip) return;
    var t = targetId ? nodeById(targetId) : null;
    if (t && t.ip && sameNetwork(s.ip, t.ip)) { if (arpAdd(srcId, t.id, t.ip, false)) arpPair(srcId, t.id, t.ip); return; }
    if (!s.gw) return;
    var gn = findNodeByIp(s.gw), gid = gn ? gn.id : null;
    if (!gid) for (var i = 0; i < (path || []).length; i++) { if ((nodeById(path[i]) || {}).type === 'router') { gid = path[i]; break; } }
    if (gid && arpAdd(srcId, gid, s.gw, true)) arpPair(srcId, gid, s.gw);
  }
  function arpList(srcId) {   // ตัดรายการที่ปลายทางหายไป/เปลี่ยน IP แล้วออก
    return (arp[srcId] || []).filter(function (e) {
      var t = nodeById(e.id); return t && (e.gw || t.ip === e.ip);
    }).map(function (e) { return { ip: e.ip, id: e.id, mac: macOf(e.id) }; });
  }
  function linkCount(id) {
    var c = 0;
    for (var i = 0; i < state.edges.length; i++) if (state.edges[i].a === id || state.edges[i].b === id) c++;
    return c;
  }

  /* ================= ความปลอดภัย Wi-Fi (wk7 1009) ================= */
  function canHaveWifi(type) { return type === 'ap' || type === 'router'; }
  var _authBypass = false;
  function securedAp(a, b, m) {   // AP/Router ที่ "ตั้งรหัสแล้ว" ในการเชื่อมไร้สาย
    if (m !== 'wireless') return null;
    var A = nodeById(a), B = nodeById(b);
    if (A && canHaveWifi(A.type) && A.wifi) return A;
    if (B && canHaveWifi(B.type) && B.wifi) return B;
    return null;
  }
  function openAp(a, b, m) {       // AP/Router ที่ "ยังไม่ตั้งรหัส" (เปิด = เสี่ยง)
    if (m !== 'wireless') return null;
    var A = nodeById(a), B = nodeById(b);
    if (A && canHaveWifi(A.type) && !A.wifi) return A;
    if (B && canHaveWifi(B.type) && !B.wifi) return B;
    return null;
  }
  function setNodeWifi(id, pass) {
    var n = nodeById(id); if (!n) return;
    n.wifi = (pass || '').trim();
    var g = els.node[id];
    if (g) {
      var lk = g.querySelector('.node-lock');
      if (n.wifi && !lk) { lk = mk('text', { 'class': 'node-lock', x: 16, y: -16, 'text-anchor': 'middle' }); lk.textContent = '🔒'; g.appendChild(lk); }
      else if (!n.wifi && lk) lk.remove();
    }
    save(); changed();
  }
  function connectAuth(a, b, m, pass) {   // เชื่อมไร้สายโดยใส่รหัส (builder เรียกหลังถามรหัส)
    var ap = securedAp(a, b, m);
    if (ap && String(pass) !== String(ap.wifi)) return { ok: false, reason: 'wifibad', node: ap };
    _authBypass = true; var r = addEdge(a, b, m); _authBypass = false; return r;
  }
  // กฎรหัสแข็งแรง: ≥10 ตัว + พิมพ์ใหญ่ + พิมพ์เล็ก + ตัวเลข + สัญลักษณ์
  function wifiChecks(p) {
    p = String(p || '');
    return { len: p.length >= 10, up: /[A-Z]/.test(p), low: /[a-z]/.test(p), dig: /[0-9]/.test(p), sym: /[^A-Za-z0-9]/.test(p) };
  }
  function wifiStrong(p) { var c = wifiChecks(p); return c.len && c.up && c.low && c.dig && c.sym; }
  // ความเร็วเน็ต: เน็ตรวม 100 Mbps แบ่งกันตามจำนวนเครื่องที่เกาะ Wi-Fi
  // Wi-Fi เปิด (ไม่มีรหัส) = คนแปลกหน้าแอบเกาะ +3 เครื่อง → ช้าลง
  function wifiSpeed(apId) {
    var ap = nodeById(apId); if (!ap || !canHaveWifi(ap.type)) return null;
    var total = 100, dev = 0;
    state.edges.forEach(function (e) { if (e.media === 'wireless' && (e.a === apId || e.b === apId)) dev++; });
    var ghosts = ap.wifi ? 0 : 3;
    var users = Math.max(1, dev + ghosts);
    return { total: total, devices: dev, ghosts: ghosts, users: users, perDevice: Math.round(total / users), secured: !!ap.wifi };
  }

  /* ping เบื้องต้น: ต้อง (1) สายเชื่อมถึง [BFS]  และ (2) วงเดียวกัน [subnet /24]
   *               คนละวง → ต้องมี Router ในเส้นทาง + ตั้ง Gateway */
  function pingCheck(srcId, targetIp) {
    var src = nodeById(srcId);
    if (!src || !src.ip) return { ok: false, reason: 'srcnoip' };
    if (ipError(src.ip)) return { ok: false, reason: 'srcbad' };
    var tr = parseIp(targetIp);
    if (tr.bad) return { ok: false, reason: 'badtarget' };
    var sp = parseIp(src.ip);
    if (sp.net === tr.net && sp.host === tr.host) return { ok: false, reason: 'self' };
    var target = findNodeByIp(targetIp);
    if (!target) return { ok: false, reason: 'nohost' };
    var sameNet = (sp.net === tr.net) || (isLinkLocal(sp.net) && isLinkLocal(tr.net));
    var path = findShortestPathBFS(buildAdj(), srcId, target.id);
    if (!path) return { ok: false, reason: 'unwired', sameNet: sameNet, target: target.id };
    var fwBlock = !!(target.fw && !target.fwAllow);   // 🛡️ Firewall ปลายทางบล็อก แม้สาย+วงถูกครบ (ตอน 3)
    if (sameNet) {
      if (fwBlock) return { ok: false, reason: 'firewall', target: target.id, sameNet: true, path: path };
      return { ok: true, path: path, target: target.id, sameNet: true };
    }
    var hasRouter = path.some(function (id) { return nodeById(id).type === 'router'; });
    if (hasRouter && src.gw) {
      if (fwBlock) return { ok: false, reason: 'firewall', target: target.id, sameNet: false, path: path };
      return { ok: true, path: path, target: target.id, sameNet: false, routed: true };
    }
    return { ok: false, reason: 'diffnet', hasRouter: hasRouter, target: target.id };
  }
  // http: ต้องส่งถึง server ได้ (reachable) + ปลายทางเป็น Server → คืน HTTP status ที่ server ตั้งไว้
  function httpRequest(srcId, targetIp) {
    var pc = pingCheck(srcId, targetIp);
    if (!pc.ok) return { ok: false, reason: pc.reason };
    var target = findNodeByIp(targetIp);
    if (!target || target.type !== 'server') return { ok: false, reason: 'noserver', target: target ? target.id : null };
    return { ok: true, status: target.http || 200, path: pc.path, target: target.id };
  }
  /* ================= 🛡️ Firewall (wk10 1009 · reusable) ================= */
  function canHaveFirewall(type) { return type === 'pc' || type === 'server'; }   // เฉพาะเครื่องปลายทาง (PC/เครื่องพิมพ์-Server)
  function renderFwGlyph(id) {
    var n = nodeById(id), g = els.node[id]; if (!n || !g) return;
    var old = g.querySelector('.node-fw'); if (old) old.remove();
    if (n.fw) {
      var fwg = mk('text', { 'class': 'node-fw', x: -16, y: -16, 'text-anchor': 'middle' });
      fwg.textContent = n.fwAllow ? '🔓' : '🛡️'; g.appendChild(fwg);
    }
  }
  function setFirewall(id, blocking) {   // blocking=true → บล็อก (🛡️) · false → เปิด Allow File+Printer Sharing (🔓)
    var n = nodeById(id); if (!n) return;
    n.fw = true; n.fwAllow = !blocking;
    renderFwGlyph(id); save(); changed();
  }
  function getFirewall(id) {
    var n = nodeById(id); if (!n) return null;
    return { has: !!n.fw, blocking: !!(n.fw && !n.fwAllow), allow: !!(n.fw && n.fwAllow) };
  }
  function tapSettings(id) {
    var n = nodeById(id); if (!n) return;
    if (!canHaveFirewall(n.type)) { toast('⚙️ ตั้งค่า Firewall ได้เฉพาะ PC / เครื่องพิมพ์-Server (เครื่องปลายทาง)', 'bad'); return; }
    if (settingsCb) settingsCb(id);
  }

  function tapConfig(id) {
    var n = nodeById(id); if (!n) return;
    if (n.type === 'switch' && pktCb) { if (configCb) configCb(id); return; }   // builder (มี onPacket): สวิตช์ตั้ง Port Mirror ได้
    if (canHaveIP(n.type) || canHaveWifi(n.type)) { if (configCb) configCb(id); return; }
    toast('อุปกรณ์นี้ตั้งค่าไม่ได้ · ตั้ง IP = PC/Server · ตั้งรหัส Wi-Fi = AP/Router', 'bad');
  }

  /* ================= canvas (วางอุปกรณ์เมื่อแตะที่ว่าง) ================= */
  function attachCanvas() {
    svg.addEventListener('touchstart', function (e) {
      if (mode === 'place') e.preventDefault();
    }, { passive: false });
    svg.addEventListener('pointerdown', function (e) {
      if (e.target !== svg) return; // แตะที่ node/ไอคอน = ปล่อยให้ node จัดการ
      if (mode === 'place') {
        var p = toSvg(e.clientX, e.clientY);
        if (placeType === 'table') addTable(p.x, p.y); else addNode(placeType, p.x, p.y);
      } else if (mode === 'delete' && sel.delPending) {
        selEl(sel.delPending).classList.remove('sel-del'); sel.delPending = null;
        status('โหมดลบ: แตะอุปกรณ์ที่ต้องการลบ');
      } else if (mode === 'connect' && sel.connect) {
        els.node[sel.connect].classList.remove('sel-connect'); sel.connect = null;
        status('ยกเลิก — เลือกอุปกรณ์ตัวแรกเพื่อเริ่มเชื่อมสาย');
      } else if (mode === 'simulate' && sel.simSrc) {
        els.node[sel.simSrc].classList.remove('sel-sim'); sel.simSrc = null;
        status('🧭 ชี้เส้นทาง: แตะเครื่องต้นทาง');
      }
    });
  }

  /* ================= persistence ================= */
  // state ที่เซฟ/ส่งออก: ไม่มีโต๊ะ = ไม่ใส่คีย์ tables (ผังเก่าออกมาเหมือนเดิมทุกไบต์)
  function exportObj(extra) {
    var o = { nodes: state.nodes, edges: state.edges };
    if (state.tables.length) o.tables = state.tables;
    if (extra) for (var k in extra) o[k] = extra[k];
    return o;
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(exportObj({ seq: seq }))); }
    catch (err) {}
  }
  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return false;
      var s = JSON.parse(raw);
      if (!s || ((!s.nodes || !s.nodes.length) && !(s.tables && s.tables.length))) return false;
      state.nodes = s.nodes || []; state.edges = s.edges || []; seq = s.seq || {}; state.tables = cleanTables(s.tables);
      var mx = 0;
      state.edges.forEach(function (e) { var num = parseInt((e.id || '').replace('e', ''), 10); if (num > mx) mx = num; });
      _edgeSeq = mx;
      renderAll();
      return true;
    } catch (err) { return false; }
  }
  /* ผังจากจออื่น (ครูวาดบนคอม → เด็กเปิดบนมือถือ) อาจล้นกระดาน → ย่อ+เลื่อนเข้าจอ · ไม่ขยาย · พอดีอยู่แล้วไม่แตะ */
  function fitToCanvas() {
    if (!svg || !state.nodes.length) return;
    var r = svg.getBoundingClientRect(), M = 34, B = 12;   // M = รัศมีไอคอน+ขอบ · B = ป้ายชื่อ/IP ใต้ไอคอน
    if (r.width < 2 * M + 10 || r.height < 2 * M + B + 10) return;   // กระดานยังไม่แสดง
    var xs = state.nodes.map(function (n) { return n.x; }), ys = state.nodes.map(function (n) { return n.y; });
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
    var y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    // โต๊ะชิดขอบกระดานได้ (ผนังห้อง) → ย่อก็ต่อเมื่อโต๊ะล้นกระดานจริง ๆ ไม่ใช่แค่ใกล้ขอบ
    var tOut = state.tables.some(function (t) { return t.x < 0 || t.y < 0 || t.x + t.w > r.width || t.y + t.h > r.height; });
    if (!tOut && x0 >= M && y0 >= M && x1 <= r.width - M && y1 <= r.height - M - B) return;
    state.tables.forEach(function (t) { x0 = Math.min(x0, t.x); x1 = Math.max(x1, t.x + t.w); y0 = Math.min(y0, t.y); y1 = Math.max(y1, t.y + t.h); });
    var k = Math.min(1, (r.width - 2 * M) / ((x1 - x0) || 1), (r.height - 2 * M - B) / ((y1 - y0) || 1));
    state.nodes.forEach(function (n) {
      n.x = Math.round(M + (n.x - x0) * k);
      n.y = Math.round(M + (n.y - y0) * k);
    });
    state.tables.forEach(function (t) {
      t.x = Math.round(M + (t.x - x0) * k); t.y = Math.round(M + (t.y - y0) * k);
      t.w = Math.max(TB_MIN_W, Math.round(t.w * k)); t.h = Math.max(TB_MIN_H, Math.round(t.h * k));
    });
  }
  function renderAll() {
    layers.tables.innerHTML = ''; layers.edges.innerHTML = ''; layers.nodes.innerHTML = ''; layers.packets.innerHTML = '';
    els = { node: {}, edge: {}, edgeHit: {}, table: {} };
    state.tables.forEach(renderTable);
    state.edges.forEach(renderEdge);
    state.nodes.forEach(renderNode);
  }

  /* ================= อินเทอร์เน็ตภายนอก (ping/tracert ปลายทางจริง) =================
   * ปลายทางนอกวง (เว็บ/DNS) จำลอง latency ต่างกัน = สอน "ปิงต่ำ=ลื่น · ปิงสูง=แล็ก"
   * สำเร็จเฉพาะเมื่อ topology มีทางออกจริง: ต้นทางตั้ง IP+Gateway + มี ISP + เชื่อมถึง ISP ผ่าน Router */
  var NET_HOSTS = {
    '8.8.8.8':      { ms: 12,  ttl: 117, ip: '8.8.8.8',       note: 'Google DNS' },
    'google.com':   { ms: 9,   ttl: 116, ip: '142.250.71.14', note: 'เซิร์ฟเวอร์ในไทย เร็ว' },
    'youtube.com':  { ms: 11,  ttl: 115, ip: '142.250.71.46', note: 'เซิร์ฟเวอร์ในไทย เร็ว' },
    'facebook.com': { ms: 14,  ttl: 58,  ip: '57.144.222.1',  note: 'เซิร์ฟเวอร์ต่างประเทศ' },
    'garena.co.th': { ms: 30,  ttl: 54,  ip: '103.10.29.55',  note: 'เซิร์ฟเวอร์เกมในไทย' },
    'roblox.com':   { ms: 178, ttl: 52,  ip: '128.116.112.1', note: 'เซิร์ฟเวอร์ US ไกล ปิงสูง แล็ก' }
  };
  /* เฉพาะโหมดเข้ม (builder · dnsStrict): ชื่อ www. ของเว็บเดิม + DNS สาธารณะตัวอื่น (ping ได้เหมือน 8.8.8.8)
   * โหมดปกติ (ไฟล์ภารกิจเทอม 1) ไม่แตะสองตารางนี้ → netTarget ตอบเท่าเดิมทุกตัวอักษร */
  var NAME_ALIAS = { 'www.google.com': 'google.com', 'www.youtube.com': 'youtube.com', 'www.facebook.com': 'facebook.com',
    'www.roblox.com': 'roblox.com', 'www.garena.co.th': 'garena.co.th' };
  var EXTRA_NET = {
    '8.8.4.4': { ms: 13, ttl: 117, ip: '8.8.4.4', note: 'Google DNS ตัวสำรอง' },
    '1.1.1.1': { ms: 8,  ttl: 57,  ip: '1.1.1.1', note: 'Cloudflare DNS' }
  };
  function netTarget(host) {
    host = (host || '').trim().toLowerCase();
    if (dnsStrict && NAME_ALIAS[host]) host = NAME_ALIAS[host];
    var h = NET_HOSTS[host] || (dnsStrict ? EXTRA_NET[host] : null);
    return h ? { host: host, ip: h.ip, ms: h.ms, ttl: h.ttl, note: h.note } : null;
  }
  function ispNode() {
    for (var i = 0; i < state.nodes.length; i++) if (state.nodes[i].type === 'isp') return state.nodes[i];
    return null;
  }
  // ต้นทางออกอินเทอร์เน็ตได้ไหม → คืน path ถึง ISP (ใช้ animate/tracert) หรือเหตุผลที่ออกไม่ได้
  function reachInternet(srcId) {
    var src = nodeById(srcId);
    if (!src || !src.ip) return { ok: false, reason: 'srcnoip' };
    if (ipError(src.ip)) return { ok: false, reason: 'srcbad' };
    var isp = ispNode();
    if (!isp) return { ok: false, reason: 'noisp' };
    var path = findShortestPathBFS(buildAdj(), srcId, isp.id);
    if (!path) return { ok: false, reason: 'unwired' };
    var hasRouter = path.some(function (id) { return nodeById(id).type === 'router'; });
    if (!hasRouter) return { ok: false, reason: 'norouter' };
    if (!src.gw) return { ok: false, reason: 'nogw' };
    return { ok: true, path: path, isp: isp.id };
  }
  function pingNet(srcId, host, onArrive, opt) {   // opt = {count, http:true, host} (เฉพาะดักจับ: http → ปล่อย HTTP แทน ICMP)
    var t = netTarget(host);
    if (!t) return { ok: false, reason: 'dns' };
    var r = reachInternet(srcId);
    if (!r.ok) return { ok: false, reason: r.reason, target: t };
    arpNote(srcId, null, r.path);   // ออกนอกวงสำเร็จ → gateway เข้า ip neigh
    if (pktCb) {
      if (opt && opt.http) capHttp(srcId, t.ip, t.ip, r.path, opt.host || t.host, 200, t.ttl);
      else capEcho(srcId, t.ip, t.ip, r.path, cntOf(opt), t.ttl, true);
    }
    animateAlong(r.path, function (hops) { if (onArrive) onArrive(t, hops); });
    return { ok: true, target: t, path: r.path };
  }
  // ข้อมูลเส้นทาง tracert (ไม่ animate) — internet: path→ISP+ปลายทาง · LAN: path ถึงเครื่อง
  function tracePath(srcId, host) {
    var t = netTarget(host);
    if (t) {
      var r = reachInternet(srcId);
      if (!r.ok) return { ok: false, reason: r.reason, target: t };
      capTrace(srcId, 'net', r.path, t);
      return { ok: true, kind: 'net', nodes: r.path, target: t };
    }
    var pc = pingCheck(srcId, host);
    if (!pc.ok) return { ok: false, reason: pc.reason };
    capTrace(srcId, 'lan', pc.path, { ip: host });
    return { ok: true, kind: 'lan', nodes: pc.path, target: { ip: host } };
  }

  /* ================= DNS (wk13-14 · แปลงชื่อ → เลข IP) =================
   * โหมดเข้ม (dnsStrict · builder เท่านั้น): ชื่อต้องถาม "DNS ของเครื่องต้นทาง" ก่อน
   *   ไม่มี DNS = nodns · DNS ไปไม่ถึง/ไม่ใช่ DNS = timeout · ถึงแต่ไม่รู้จักชื่อ = nxdomain
   *   DNS สาธารณะ (8.8.8.8 …) ตอบเมื่อเครื่องออกเน็ตได้จริง · DNS = IP router ที่เปิด DHCP (แบบ MikroTik) ตอบเมื่อ ping ถึง router
   *   ชื่อเว็บนอกต้องให้ router ถึง ISP ด้วย ไม่งั้นหาไม่เจอ · ชื่อในร้าน = n.host ของ Server (ตอบเฉพาะ DNS = router ในร้าน · DNS สาธารณะตอบ nxdomain · ไม่มีตาราง record)
   * โหมดปกติ: ไม่ดู DNS ของเครื่องเลย (ชื่อที่ engine รู้จักแปลงได้เองเหมือนเดิม) */
  var PUBLIC_DNS = { '8.8.8.8': 'dns.google', '8.8.4.4': 'dns.google', '1.1.1.1': 'one.one.one.one' };
  function isName(s) {   // ชื่อ (มีตัวอักษร ไม่ใช่เลข IP) — เลข IP ไม่ต้องถาม DNS
    s = String(s || '').trim();
    return /[A-Za-z]/.test(s) && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(s) && parseIp(s).bad === 1;
  }
  function hostNode(nm) {
    for (var i = 0; i < state.nodes.length; i++) {
      var n = state.nodes[i];
      if (n.host && String(n.host).toLowerCase() === nm) return n;
    }
    return null;
  }
  function hostError(id, name) {   // ตรวจชื่อเครื่อง (Hostname) ที่ครูตั้งให้ Server · คืนข้อความผิด หรือ null
    var h = String(name || '').trim().toLowerCase();
    if (!h) return null;   // เว้นว่าง = ไม่ตั้งชื่อ
    if (h.length > 40) return 'ยาวเกิน 40 ตัวอักษร';
    if (!/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/.test(h) || /\.\./.test(h) || !/[a-z]/.test(h))
      return 'ใช้ได้เฉพาะ a-z 0-9 . - และต้องมีตัวอักษรอย่างน้อย 1 ตัว (เช่น shop.local)';
    if (NET_HOSTS[h] || NAME_ALIAS[h]) return 'ชื่อนี้เป็นชื่อเว็บจริงบนอินเทอร์เน็ตอยู่แล้ว';
    var o = hostNode(h);
    if (o && o.id !== id) return 'ชื่อนี้ซ้ำกับ ' + o.id;
    return null;
  }
  function setNodeHost(id, name) {   // Server เท่านั้น · ว่าง = เอาชื่อออก
    var n = nodeById(id); if (!n || n.type !== 'server') return;
    var h = String(name || '').trim().toLowerCase();
    if (h) n.host = h; else delete n.host;
    save(); changed();
  }
  // เซิร์ฟเวอร์ DNS ที่ dns ชี้ไป ตอบได้ไหม → {up, name, upstream}
  function dnsServer(srcId, dns) {
    if (PUBLIC_DNS[dns]) return reachInternet(srcId).ok ? { up: true, name: PUBLIC_DNS[dns], upstream: true } : { up: false };
    var rn = findNodeByIp(dns);
    if (rn && rn.type === 'router' && rn.dhcp && rn.dhcp.on && pingCheck(srcId, dns).ok) {
      var isp = ispNode();
      return { up: true, name: 'UnKnown', upstream: !!(isp && findShortestPathBFS(buildAdj(), rn.id, isp.id)), id: rn.id };
    }
    return { up: false };
  }
  /* แปลงชื่อ → IP · dnsArg = ระบุ DNS ตรง ๆ (nslookup ชื่อ DNS) · คืน
   *   ok: {ok:true, kind:'net'|'lan', key:<ส่งต่อ ping/tracePath>, ip, name, dns, dnsName, nonauth}
   *   ไม่ผ่าน: {ok:false, reason:'srcnoip'|'nodns'|'timeout'|'nxdomain', dns, dnsName, noUpstream} */
  function resolveName(srcId, name, dnsArg) {
    var r = resolveCore(srcId, name, dnsArg);
    if (pktCb && dnsStrict) { try { capDns(srcId, name, r); } catch (err) {} }   // ดักจับ: ปล่อย Standard query / response
    return r;
  }
  function resolveCore(srcId, name, dnsArg) {
    var nm = String(name || '').trim().toLowerCase().replace(/\.$/, '');
    var lit = !parseIp(nm).bad, ext = netTarget(nm);
    if (!dnsStrict) {   // เดิม: ชื่อที่ engine รู้จักแปลงได้เลย ไม่ดู DNS ของเครื่อง
      if (!lit && ext) return { ok: true, kind: 'net', key: ext.host, ip: ext.ip, name: nm, nonauth: true };
      var l0 = lit ? null : hostNode(nm);
      if (l0 && l0.ip) return { ok: true, kind: 'lan', key: l0.ip, ip: l0.ip, name: nm };
      return { ok: false, reason: 'nxdomain', dns: '' };
    }
    var src = nodeById(srcId);
    if (!src || !src.ip) return { ok: false, reason: 'srcnoip', dns: '' };
    var dns = String((dnsArg !== undefined && dnsArg !== null && String(dnsArg).trim() !== '') ? dnsArg : (src.dns || '')).trim();
    if (!dns) return { ok: false, reason: 'nodns', dns: '' };
    var srv = dnsServer(srcId, dns);
    if (!srv.up) return { ok: false, reason: 'timeout', dns: dns };
    if (!lit) {
      if (ext) {
        if (srv.upstream) return { ok: true, kind: 'net', key: ext.host, ip: ext.ip, name: nm, dns: dns, dnsName: srv.name, nonauth: true };
        return { ok: false, reason: 'nxdomain', dns: dns, dnsName: srv.name, noUpstream: true };   // router ไม่มีทางออก ISP = ถามต่อไม่ได้
      }
      var ln = hostNode(nm);   // ชื่อในร้าน: ตอบได้เฉพาะ DNS ที่เป็น router ในร้าน (srv.id) · 8.8.8.8 ไม่รู้จักชื่อในร้าน = nxdomain เหมือนของจริง
      if (ln && ln.ip && srv.id) return { ok: true, kind: 'lan', key: ln.ip, ip: ln.ip, name: nm, dns: dns, dnsName: srv.name };
    }
    return { ok: false, reason: 'nxdomain', dns: dns, dnsName: srv.name };
  }

  /* ================= 📡 ดักจับแพ็กเก็ต (แบบ Wireshark ย่อ · ทำงานเฉพาะเมื่อ init ส่ง onPacket) =================
   * 1 เหตุการณ์ = 1 เฟรมบน 1 "ช่วงสาย" (ระหว่าง PC/Server/Router/ISP) ส่งเข้า pktCb(ev)
   * ev = {n, proto:'ARP'|'ICMP'|'DNS'|'HTTP'|'DHCP', top:'link'|'inet'|'app', srcLbl,dstLbl, srcIp,dstIp, srcMac,dstMac, bcast, ttl,
   *       info (อังกฤษแบบ Wireshark) , th (ไทยสั้น) , layers:[{k,t}] (ทีละชั้น) , seen:[id จุดดักจับที่เห็นเฟรมนี้]}
   * ใครเห็น: PC/Server = เฟรมที่เข้า-ออกตัวเอง + broadcast ในวงเดียวกัน · สวิตช์ = เฉพาะตัวที่เปิด Port Mirror (n.mirror) เห็นทุกเฟรมที่ผ่าน
   * ข้ามเราเตอร์ = คนละช่วงสาย (MAC เปลี่ยน · TTL ลด 1) · สวิตช์/AP ไม่ลด TTL · ไม่ส่ง onPacket = ฟังก์ชันพวกนี้ไม่ทำอะไรเลย */
  var BC_MAC = 'ff:ff:ff:ff:ff:ff';
  var HTTP_TXT = { 200: 'OK', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 500: 'Internal Server Error', 503: 'Service Unavailable' };
  function capNode(n) { return !!n && (n.type === 'pc' || n.type === 'server' || (n.type === 'switch' && !!n.mirror)); }
  function hex4(s) { var h = hash32(s); return hex2(h >> 8) + hex2(h); }
  function xv(X, n) { return (X === null || X === undefined) ? 64 - (n - 1) : X; }   // TTL ของ reply ตอนถึงต้นทาง (ปลายทางในวง = 64 ลดตามเราเตอร์)
  function cntOf(opt) { var c = opt ? +opt.count : 0; return c >= 1 ? Math.min(Math.floor(c), 10) : 3; }
  function layersOf(e) {   // แกะทีละชั้น (ล่างขึ้นบน) เป็นข้อความไทย
    var L = [];
    L.push({ k: 'ชั้นเชื่อมต่อเครือข่าย (Ethernet)', t: 'ส่งจาก MAC ' + e.srcMac + ' ถึง ' + (e.bcast ? BC_MAC + ' (ทุกเครื่องในวง)' : e.dstMac) });
    if (e.proto === 'ARP') { L.push({ k: 'ARP (ถาม-ตอบหมายเลข MAC)', t: e.a }); return L; }
    L.push({ k: 'ชั้นอินเทอร์เน็ต (IP)', t: 'จาก IP ' + e.srcIp + ' ถึง IP ' + e.dstIp +
      ((e.ttl !== null && e.ttl !== undefined) ? ' · TTL = ' + e.ttl + ' (ลด 1 ทุกครั้งที่ผ่านเราเตอร์ · สวิตช์ไม่ลด)' : '') });
    if (e.l4) L.push({ k: 'ชั้นขนส่ง (' + e.l4 + ')', t: 'พอร์ตต้นทาง ' + e.sp + ' → พอร์ตปลายทาง ' + e.dp +
      (e.l4 === 'TCP' ? ' · TCP = จับมือก่อนส่ง รับประกันว่าถึง (สื่อนี้ย่อ ไม่แสดงแถวจับมือในตาราง)' : ' · UDP = ส่งเลย ไม่จับมือ เร็วแต่ไม่รับประกัน') });
    L.push({ k: e.proto === 'ICMP' ? 'ชั้นอินเทอร์เน็ต (ICMP · ข้อความควบคุมของ IP)' : 'ชั้นแอปพลิเคชัน (' + e.proto + ')', t: e.a });
    return L;
  }
  function emit(e) {
    if (!pktCb) return;
    e.n = ++pktN; e.layers = layersOf(e);
    try { pktCb(e); } catch (err) {}
  }
  // ใครเห็น broadcast ที่ออกจาก srcId: เครื่องปลายทางในวงเดียวกัน (เดินผ่านสวิตช์/AP ได้ · หยุดที่ router) + สวิตช์ที่เปิด mirror
  function l2Seen(srcId) {
    var adj = buildAdj(), seen = {}, out = [], q = [srcId];
    seen[srcId] = 1; if (capNode(nodeById(srcId))) out.push(srcId);
    while (q.length) {
      var cur = q.shift(), nb = adj[cur] || [];
      for (var i = 0; i < nb.length; i++) {
        var id = nb[i]; if (seen[id]) continue; seen[id] = 1;
        var nn = nodeById(id), t = nn ? nn.type : '';
        if (t === 'switch' || t === 'ap') q.push(id);
        if (capNode(nn)) out.push(id);
      }
    }
    return out;
  }
  // ตัดเส้นทางเป็นช่วงสาย: ปิดช่วงทุกครั้งที่เจออุปกรณ์ที่ไม่ใช่สวิตช์/AP (PC/Server/Router/ISP)
  function segsOf(path) {
    var segs = [], cur = { a: path[0], nodes: [path[0]] };
    for (var i = 1; i < path.length; i++) {
      var nn = nodeById(path[i]), t = nn ? nn.type : '';
      cur.nodes.push(path[i]);
      if (t !== 'switch' && t !== 'ap') { cur.b = path[i]; segs.push(cur); cur = { a: path[i], nodes: [path[i]] }; }
    }
    return segs;
  }
  function seenSeg(seg) {
    var o = [], i;
    for (i = 0; i < seg.nodes.length; i++) { var n = nodeById(seg.nodes[i]); if (capNode(n) && o.indexOf(n.id) < 0) o.push(n.id); }
    return o;
  }
  // ส่งเฟรม unicast ตามช่วงสาย (rev = ขากลับ) · ttl0 = TTL ในช่วงแรกที่เดิน ลดทีละ 1 ทุกช่วง
  function flow(segs, rev, b, ttl0) {
    var order = rev ? segs.slice().reverse() : segs, i, k;
    for (i = 0; i < order.length; i++) {
      var sg = order[i], e = {};
      for (k in b) e[k] = b[k];
      e.srcMac = macOf(rev ? sg.b : sg.a); e.dstMac = macOf(rev ? sg.a : sg.b);
      e.ttl = (ttl0 === null || ttl0 === undefined) ? null : ttl0 - i;
      if (typeof b.info === 'function') e.info = b.info(e.ttl);
      e.seen = seenSeg(sg); e.bcast = false;
      emit(e);
    }
  }
  /* --- ARP --- */
  function arpReq(srcId, ip) {
    var s = nodeById(srcId);
    emit({ proto: 'ARP', top: 'link', srcLbl: srcId, dstLbl: 'ทุกเครื่อง', srcIp: s.ip, dstIp: ip, srcMac: macOf(srcId), dstMac: BC_MAC, bcast: true, ttl: null,
      info: 'Who has ' + ip + '? Tell ' + s.ip, th: 'ถามทุกเครื่อง: ใครคือ ' + ip + ' ? บอก MAC หน่อย',
      a: 'ถามทุกเครื่องในวงว่า "' + ip + ' ใช้การ์ดเครือข่ายหมายเลข MAC อะไร" (ผู้ถามคือ ' + s.ip + ')', seen: l2Seen(srcId) });
  }
  function arpPair(srcId, tgtId, ip) {   // ถามครั้งแรก (ยังไม่มีใน ARP cache) → ได้คำตอบ
    var s = nodeById(srcId), t = nodeById(tgtId); if (!pktCb || !s || !t) return;
    arpReq(srcId, ip);
    var p = findShortestPathBFS(buildAdj(), srcId, tgtId) || [srcId, tgtId], sg = segsOf(p)[0] || { nodes: [srcId, tgtId] };
    emit({ proto: 'ARP', top: 'link', srcLbl: tgtId, dstLbl: srcId, srcIp: ip, dstIp: s.ip, srcMac: macOf(tgtId), dstMac: macOf(srcId), bcast: false, ttl: null,
      info: ip + ' is at ' + macOf(tgtId), th: 'ตอบเฉพาะคนถาม: ' + ip + ' ใช้ MAC ' + macOf(tgtId),
      a: 'ตอบกลับ "' + ip + ' คือการ์ดเครือข่ายหมายเลข MAC ' + macOf(tgtId) + '" (ส่งหาคนถามคนเดียว ไม่ใช่ broadcast = ประกาศหาทุกเครื่อง)', seen: seenSeg(sg) });
  }
  function arpMiss(srcId, ip, times) {   // ถามแล้วไม่มีใครตอบ (ปลายทางไม่มี/สายไม่ถึง)
    var s = nodeById(srcId); if (!pktCb || !s || !s.ip) return;
    for (var i = 0; i < times; i++) arpReq(srcId, ip);
  }
  /* --- ICMP: ping / traceroute --- */
  function echoReq(s, srcId, dstIp, dstLbl, idh, seq) {
    return { proto: 'ICMP', top: 'inet', srcLbl: srcId, dstLbl: dstLbl, srcIp: s.ip, dstIp: dstIp,
      info: function (t) { return 'Echo (ping) request  id=' + idh + ', seq=' + seq + ', ttl=' + t; },
      th: 'ping ถาม: ยังอยู่ไหม? (ครั้งที่ ' + seq + ')',
      a: 'ICMP Echo Request (ชนิด 8) = คำสั่ง ping ถามว่า "' + dstIp + ' ยังอยู่ไหม" · ลำดับที่ ' + seq };
  }
  function echoRep(s, srcId, dstIp, dstLbl, idh, seq) {
    return { proto: 'ICMP', top: 'inet', srcLbl: dstLbl, dstLbl: srcId, srcIp: dstIp, dstIp: s.ip,
      info: function (t) { return 'Echo (ping) reply    id=' + idh + ', seq=' + seq + ', ttl=' + t; },
      th: 'ตอบ: ยังอยู่ (ครั้งที่ ' + seq + ')',
      a: 'ICMP Echo Reply (ชนิด 0) = ตอบ ping ว่า "' + dstIp + ' ยังอยู่" · ลำดับที่ ' + seq };
  }
  function capEcho(srcId, dstIp, dstLbl, path, cnt, X, answered) {   // ping N ครั้ง · request/reply สลับกัน · answered=false → มีแต่ request
    var s = nodeById(srcId); if (!pktCb || !s || !path || path.length < 2) return;
    var segs = segsOf(path), n = segs.length, idh = '0x' + hex4(srcId), k;
    for (k = 1; k <= cnt; k++) {
      flow(segs, false, echoReq(s, srcId, dstIp, dstLbl, idh, k), 64);
      if (answered !== false) flow(segs, true, echoRep(s, srcId, dstIp, dstLbl, idh, k), xv(X, n) + n - 1);
    }
  }
  function capPing(srcId, targetIp, res, opt) { if (pktCb) capEcho(srcId, targetIp, res.target, res.path, cntOf(opt), null, true); }
  function capPingFail(srcId, targetIp, res, opt) {   // ping ไม่สำเร็จ: ดูว่าแพ็กเก็ตอะไรออกไปบนสายจริง ๆ
    var s = nodeById(srcId); if (!pktCb || !s || !s.ip) return;
    if (res.reason === 'firewall') {   // ARP ได้คำตอบ (ARP ไม่ถูกกัน) แต่ ping ไม่มีคำตอบ
      arpNote(srcId, res.target, res.path);
      capEcho(srcId, targetIp, res.target, res.path, cntOf(opt), null, false);
      return;
    }
    if ((res.reason === 'nohost' || res.reason === 'unwired') && sameNetwork(s.ip, targetIp)) arpMiss(srcId, targetIp, 3);
  }
  function traceHop(s, srcId, dstIp, dstLbl, idh, segs, t, hop) {   // ping ที่ TTL = t → เราเตอร์ตัวที่ t ทิ้งแล้วแจ้งกลับ
    flow(segs, false, echoReq(s, srcId, dstIp, dstLbl, idh, t), t);
    flow(segs, true, { proto: 'ICMP', top: 'inet', srcLbl: hop.id, dstLbl: srcId, srcIp: hop.ip || '-', dstIp: s.ip,
      info: 'Time-to-live exceeded (Time to live exceeded in transit)', th: hop.id + ' แจ้งกลับ: TTL หมดตรงนี้',
      a: 'ICMP Time Exceeded (ชนิด 11) = ' + hop.id + ' รับแพ็กเก็ตที่ TTL ลดเหลือ 0 จึงทิ้ง แล้วแจ้งต้นทางกลับ (traceroute/tracert รู้ว่าผ่านเราเตอร์ตัวไหนจากข้อความนี้)' }, 64);
  }
  function capTrace(srcId, kind, nodes, target) {
    var s = nodeById(srcId); if (!pktCb || !s || !s.ip || !nodes || nodes.length < 2) return;
    var last = nodeById(nodes[nodes.length - 1]);
    arpNote(srcId, kind === 'lan' ? last : null, nodes);
    var segs = segsOf(nodes), n = segs.length, routers = (kind === 'net') ? n : n - 1;
    var dstIp = target.ip, dstLbl = (kind === 'lan' && last) ? last.id : target.ip, idh = '0x' + hex4(srcId + '#tr'), i;
    for (i = 1; i <= routers; i++) traceHop(s, srcId, dstIp, dstLbl, idh, segs.slice(0, i), i, nodeById(segs[i - 1].b));
    var X = (kind === 'net' && target.ttl) ? target.ttl : null;
    flow(segs, false, echoReq(s, srcId, dstIp, dstLbl, idh, routers + 1), routers + 1);
    flow(segs, true, echoRep(s, srcId, dstIp, dstLbl, idh, routers + 1), xv(X, n) + n - 1);
  }
  /* --- HTTP (TCP 80) --- */
  function capHttp(srcId, dstIp, dstLbl, path, host, status, X) {
    var s = nodeById(srcId); if (!pktCb || !s || !path || path.length < 2) return;
    var segs = segsOf(path), n = segs.length, sp = 49152 + hash32(srcId + 'h' + pktN) % 10000, txt = HTTP_TXT[status] || '';
    flow(segs, false, { proto: 'HTTP', top: 'app', srcLbl: srcId, dstLbl: dstLbl, srcIp: s.ip, dstIp: dstIp, l4: 'TCP', sp: sp, dp: 80,
      info: 'GET / HTTP/1.1', th: 'เปิดเว็บ: ขอหน้าแรกของ ' + host,
      a: 'HTTP GET / = ขอหน้าแรกของเว็บ "' + host + '" (HTTP วิ่งบน TCP พอร์ต 80)' }, 64);
    flow(segs, true, { proto: 'HTTP', top: 'app', srcLbl: dstLbl, dstLbl: srcId, srcIp: dstIp, dstIp: s.ip, l4: 'TCP', sp: 80, dp: sp,
      info: 'HTTP/1.1 ' + status + ' ' + txt, th: 'เว็บเซิร์ฟเวอร์ตอบรหัส ' + status + (status < 400 ? ' (สำเร็จ)' : ' (มีปัญหา)'),
      a: 'HTTP Response รหัส ' + status + ' ' + txt + ' = เว็บเซิร์ฟเวอร์ตอบกลับสถานะของคำขอ' }, xv(X, n) + n - 1);
  }
  /* --- DNS (UDP 53) : ถามได้เฉพาะเมื่อเครื่องมี DNS Server ตั้งไว้ --- */
  function capDns(srcId, name, r) {
    var s = nodeById(srcId), nm = String(name || '').trim().toLowerCase().replace(/\.$/, '');
    if (!pktCb || !s || !s.ip || !r.dns || !parseIp(nm).bad) return;   // ไม่มี DNS / พิมพ์เป็นเลข IP = ไม่มีการถามชื่อ
    var dns = r.dns, sx = 49152 + hash32(srcId + nm) % 10000, xid = '0x' + hex4(srcId + nm);
    var dn = findNodeByIp(dns), path = null, up = (r.reason !== 'timeout');
    if (dn && dn.id === srcId) return;
    if (up) {
      if (dn) path = findShortestPathBFS(buildAdj(), srcId, dn.id);
      else { var ri = reachInternet(srcId); path = ri.ok ? ri.path : null; }
      if (!path || path.length < 2) return;
      arpNote(srcId, dn || null, path);
    } else if (sameNetwork(s.ip, dns)) {   // DNS อยู่ในวงเดียวกันแต่ไม่ตอบ (ไม่มีเครื่อง / ไม่ใช่ DNS)
      if (dn) path = findShortestPathBFS(buildAdj(), srcId, dn.id);
      if (!path || path.length < 2) { arpMiss(srcId, dns, 3); return; }
      arpNote(srcId, dn, path);
    } else {   // DNS อยู่นอกวง → ส่งไปที่ gateway
      if (!s.gw) return;
      var gn = findNodeByIp(s.gw);
      if (gn) path = findShortestPathBFS(buildAdj(), srcId, gn.id);
      if (!path || path.length < 2) { arpMiss(srcId, s.gw, 3); return; }
      arpNote(srcId, null, path);
    }
    var segs = segsOf(path), n = segs.length, tt = (!dn && PUBLIC_DNS[dns]) ? netTarget(dns) : null, dl = dn ? dn.id : dns, q;
    for (q = 0; q < (up ? 1 : 2); q++)
      flow(segs, false, { proto: 'DNS', top: 'app', srcLbl: srcId, dstLbl: dl, srcIp: s.ip, dstIp: dns, l4: 'UDP', sp: sx, dp: 53,
        info: 'Standard query ' + xid + ' A ' + nm, th: 'ถาม DNS: ' + nm + ' คือเลข IP อะไร?',
        a: 'DNS Query (ชนิด A) = ถามหาเลข IP ของชื่อ "' + nm + '" ไปที่ DNS Server ' + dns }, 64);
    if (!up) return;
    flow(segs, true, { proto: 'DNS', top: 'app', srcLbl: dl, dstLbl: srcId, srcIp: dns, dstIp: s.ip, l4: 'UDP', sp: 53, dp: sx,
      info: r.ok ? 'Standard query response ' + xid + ' A ' + nm + ' A ' + r.ip : 'Standard query response ' + xid + ' No such name A ' + nm,
      th: r.ok ? 'DNS ตอบ: ' + nm + ' = ' + r.ip : 'DNS ตอบ: ไม่มีชื่อ ' + nm,
      a: r.ok ? 'DNS Response = ตอบว่าชื่อ "' + nm + '" คือเลข IP ' + r.ip : 'DNS Response = ตอบว่า "ไม่มีชื่อนี้" (No such name / NXDOMAIN)' }, xv(tt ? tt.ttl : null, n) + n - 1);
  }
  /* --- DHCP (UDP 67/68) : ทั้ง 4 ขั้นเป็น broadcast ในวงของลูกข่าย --- */
  function capDhcp(cid, srv, ip) {   // srv = router ที่ตอบ (null = ไม่มีใครตอบ → Discover ซ้ำ 2 ครั้ง)
    var c = nodeById(cid); if (!pktCb || !c) return;
    var xid = '0x' + hex4(cid + '#x') + hex4(cid + pktN), seen = l2Seen(cid);
    function one(fromId, fromIp, what, th, a, sp, dp) {
      emit({ proto: 'DHCP', top: 'app', srcLbl: fromId, dstLbl: 'ทุกเครื่อง', srcIp: fromIp, dstIp: '255.255.255.255', srcMac: macOf(fromId), dstMac: BC_MAC,
        bcast: true, ttl: null, l4: 'UDP', sp: sp, dp: dp, info: 'DHCP ' + what + ' - Transaction ID ' + xid, th: th, a: a, seen: seen });
    }
    var disc = 'DHCP Discover = ลูกข่ายที่ยังไม่มี IP ตะโกนถามทุกเครื่องว่า "ใครเป็น DHCP Server ช่วยแจก IP ให้หน่อย"';
    one(cid, '0.0.0.0', 'Discover', 'ลูกข่ายตะโกนหา DHCP Server: ขอ IP หน่อย', disc, 68, 67);
    if (!srv) { one(cid, '0.0.0.0', 'Discover', 'ลูกข่ายตะโกนหา DHCP Server อีกรอบ', disc, 68, 67); return; }
    one(srv.id, srv.ip || '-', 'Offer', 'DHCP Server เสนอ IP ' + ip, 'DHCP Offer = เซิร์ฟเวอร์เสนอ IP ' + ip + ' ให้ลูกข่าย (เสนอเฉย ๆ ยังไม่ใช่การให้)', 67, 68);
    one(cid, '0.0.0.0', 'Request', 'ลูกข่ายตอบรับ: ขอใช้ IP ' + ip, 'DHCP Request = ลูกข่ายตอบรับข้อเสนอ "ขอใช้ IP ' + ip + ' นะ" (ส่งแบบ broadcast = ประกาศหาทุกเครื่อง ให้ DHCP Server ตัวอื่นรู้ด้วย)', 68, 67);
    one(srv.id, srv.ip || '-', 'ACK', 'Server ยืนยัน: ใช้ IP ' + ip + ' ได้', 'DHCP ACK = เซิร์ฟเวอร์ยืนยันว่า ' + ip + ' เป็นของลูกข่ายแล้ว (เริ่มใช้ได้)', 67, 68);
  }
  function setNodeMirror(id, on) {   // Port Mirror เฉพาะสวิตช์ (แบบ RB260GSP) · ปิด = เอาฟิลด์ออก ไฟล์ผังเก่าไม่เปลี่ยน
    var n = nodeById(id); if (!n || n.type !== 'switch') return;
    if (on) n.mirror = true; else delete n.mirror;
    save(); changed();
  }

  /* ================= public API ================= */
  global.NetSimEngine = {
    init: function (svgEl, opts) {
      svg = svgEl; fresh(); _edgeSeq = 0;
      svg.innerHTML = '';
      layers.tables = mk('g', { 'class': 'layer-tables' });
      layers.edges = mk('g', { 'class': 'layer-edges' });
      layers.nodes = mk('g', { 'class': 'layer-nodes' });
      layers.packets = mk('g', { 'class': 'layer-packets' });
      svg.appendChild(layers.tables); svg.appendChild(layers.edges); svg.appendChild(layers.nodes); svg.appendChild(layers.packets);
      attachCanvas();
      opts = opts || {};
      if (opts.storeKey) STORE_KEY = opts.storeKey;   // หน้า scenario เก็บ state แยกจาก builder กลาง
      dnsStrict = !!opts.dnsStrict;                   // โหมดเข้ม DNS (builder เท่านั้น) · ไม่ส่ง = เหมือนเดิม
      statusCb = opts.onStatus || null;
      changeCb = opts.onChange || null;
      toastCb = opts.onToast || null;
      configCb = opts.onConfig || null;
      wifiCb = opts.onWifi || null;
      settingsCb = opts.onSettings || null;
      pktCb = opts.onPacket || null;                  // ดักจับแพ็กเก็ต (builder เท่านั้น) · ไม่ส่ง = ไม่มีอะไรเปลี่ยน
      if (!(opts.restore !== false && load())) changed();
      return this;
    },
    setMode: function (m) {
      mode = m; clearSelClasses();
      sel = { connect: null, simSrc: null, delPending: null };
      if (svg) { svg.classList.toggle('cut-on', m === 'cutlink'); svg.classList.toggle('tb-place', m === 'place'); svg.classList.toggle('tb-del', m === 'delete'); }
    },
    getMode: function () { return mode; },
    setPlaceType: function (t) { placeType = t; },
    setMedia: function (m) { media = m; },
    getMedia: function () { return media; },
    clearAll: function () {
      fresh(); _edgeSeq = 0; renderAll(); save(); changed();
    },
    removeEdge: function (id) { removeEdge(id); },
    counts: function () { return { nodes: state.nodes.length, edges: state.edges.length }; },
    exportState: function () { return JSON.stringify(exportObj()); },
    tableCount: function () { return state.tables.length; },   // โต๊ะไม่นับใน counts()
    /* โหลดผัง (preset ภารกิจ / ไฟล์ผังที่เด็กเซฟไว้) · กรองของเสียจากไฟล์ทิ้ง กันกระดานพัง
     * opt.fit = ย่อเข้าจอนี้ · คืนจำนวนอุปกรณ์ที่โหลดได้ */
    loadState: function (obj, opt) {
      if (typeof obj === 'string') obj = JSON.parse(obj);
      obj = obj || {};
      fresh();
      var ids = {}, eids = {};
      state.nodes = (obj.nodes || []).filter(function (n) {
        if (!n || !TYPES[n.type] || !n.id || ids[n.id] || !isFinite(n.x) || !isFinite(n.y)) return false;
        ids[n.id] = 1; return true;
      });   // ไม่ใช้เพดาน MAX_NODES ที่นี่ — เพดานกันเด็กแตะรัว ไม่ใช่กันผังครู/preset
      state.edges = (obj.edges || []).filter(function (e) {
        return e && ids[e.a] && ids[e.b] && e.a !== e.b && MEDIA_SHORT[e.media];
      });
      _edgeSeq = 0;
      state.edges.forEach(function (e) {   // preset เก่าบางไฟล์ไม่มี id สาย / ไฟล์เสียมี id ซ้ำ → ออกให้ใหม่
        if (!e.id || eids[e.id]) e.id = nextEdgeId();
        eids[e.id] = 1;
      });
      state.tables = cleanTables(obj.tables);
      if (opt && opt.fit) fitToCanvas();
      renderAll(); save(); changed();
      return state.nodes.length;
    },
    /* ----- IP / Terminal API ----- */
    canHaveIP: canHaveIP,
    canHaveWifi: function (t) { return canHaveWifi(t); },
    mask: DEFAULT_MASK,
    typeLabel: function (t) { return typeLabel(t); },
    getNode: function (id) { var n = nodeById(id); return n ? { id: n.id, type: n.type, ip: n.ip || '', gw: n.gw || '', http: n.http || 200, wifi: n.wifi || '', fw: !!n.fw, fwAllow: !!n.fwAllow,
      ipmode: n.ipmode === 'dhcp' ? 'dhcp' : 'static', dns: n.dns || '', host: n.host || '', mirror: !!n.mirror } : null; },
    /* ----- DHCP / ARP / Linux terminal API ----- */
    canDhcpClient: canDhcpClient,
    requestDhcp: function (id) { return dhcpRequest(id); },        // ขอ IP อัตโนมัติ (renew) → {ok,ip,gw,dns,server,serverIp} หรือ {ok:false,reason,apipa,ip}
    releaseDhcp: function (id) { return dhcpRelease(id); },        // คืน IP → {ok,ip,lease}
    leaseOf: function (id) { return leaseOf(id); },                // {server, serverIp} | null
    setNodeDhcp: function (id, cfg) { setNodeDhcp(id, cfg); },     // router: {on,from,to,dns}
    getDhcp: function (id) { return getDhcp(id); },
    setNodeHttp: function (id, http) { setNodeHttp(id, http); },
    neighbors: function (id) { return arpList(id); },              // [{ip,id,mac}] — ip neigh
    macOf: function (id) { return macOf(id); },
    linkCount: function (id) { return linkCount(id); },            // 0 = ไม่มีสายเลย (NO-CARRIER)
    /* ----- 🛡️ Firewall API (reusable · wk10 1009) ----- */
    canHaveFirewall: canHaveFirewall,
    setFirewall: function (id, blocking) { setFirewall(id, blocking); },
    getFirewall: function (id) { return getFirewall(id); },
    setNodeWifi: function (id, pass) { setNodeWifi(id, pass); },
    connectAuth: function (a, b, m, pass) { return connectAuth(a, b, m, pass); },
    wifiChecks: function (p) { return wifiChecks(p); },
    wifiStrong: function (p) { return wifiStrong(p); },
    wifiSpeed: function (id) { return wifiSpeed(id); },
    apNodes: function () { return state.nodes.filter(function (n) { return canHaveWifi(n.type); }).map(function (n) { return n.id; }); },
    nodesWithIP: function () {
      // pc/server = ปลายทางเสมอ · router/isp โผล่ใน Terminal เฉพาะตั้ง IP แล้ว (กันหน้าเก่า dropdown เปลี่ยน)
      return state.nodes.filter(function (n) {
        if (n.type === 'router' || n.type === 'isp') return !!n.ip;
        return canHaveIP(n.type);
      }).map(function (n) { return { id: n.id, type: n.type, ip: n.ip || '', gw: n.gw || '' }; });
    },
    setNodeIP: function (id, ip, gw, http, dns) { setNodeIP(id, ip, gw, http, dns); },   // dns = DNS Server (Static · ไม่บังคับ)
    /* ----- DNS API (โหมดเข้มเฉพาะ builder: init {dnsStrict:true}) ----- */
    dnsStrict: function () { return dnsStrict; },
    isName: isName,                                                  // พิมพ์เป็นชื่อ (ไม่ใช่เลข IP) = ต้องแปลงก่อน
    resolve: function (srcId, name, dnsArg) { return resolveName(srcId, name, dnsArg); },   // → {ok,kind,key,ip,...} หรือ {ok:false,reason}
    setNodeHost: function (id, name) { setNodeHost(id, name); },     // ชื่อเครื่อง Server (เช่น shop.local)
    hostError: function (id, name) { return hostError(id, name); },
    /* ----- ดักจับแพ็กเก็ต (init {onPacket}) ----- */
    setNodeMirror: function (id, on) { setNodeMirror(id, on); },      // Port Mirror ของสวิตช์ (กระจกพอร์ต)
    captureSources: function () {                                     // จุดที่เลือกดักได้: PC/Server ทุกตัว + สวิตช์ที่เปิด mirror
      return state.nodes.filter(capNode).map(function (n) { return { id: n.id, type: n.type, mirror: !!n.mirror }; });
    },
    ipError: function (ip) { return ipError(ip); },
    ipConflict: function (id, ip) { return ipConflict(id, ip); },
    // ping: ส่ง onArrive(res, hops) เมื่อแพ็กเก็ตถึงปลายทาง · คืน res ทันทีสำหรับ pre-check
    /* ตรวจอย่างเดียว ไม่ยิงแพ็กเก็ต — หน้าภารกิจใช้เช็คเงื่อนไขผ่านซ้ำ ๆ ได้โดยจอไม่กระพริบ */
    canPing: function (srcId, targetIp) { return pingCheck(srcId, targetIp); },
    canReachNet: function (srcId) { return reachInternet(srcId); },
    ping: function (srcId, targetIp, onArrive, opt) {   // opt = {count} จำนวนครั้งที่ดักจับเห็น (ไม่ส่ง = 3)
      var res = pingCheck(srcId, targetIp);
      if (res.ok) { arpNote(srcId, res.target, res.path); capPing(srcId, targetIp, res, opt); animateAlong(res.path, function (hops) { if (onArrive) onArrive(res, hops); }); }
      else if (pktCb) capPingFail(srcId, targetIp, res, opt);
      return res;
    },
    // http: ส่ง onArrive(status, hops, targetId) เมื่อ packet ถึง server · คืน res ทันที (pre-check)
    http: function (srcId, targetIp, onArrive, opt) {   // opt = {host} ชื่อที่พิมพ์ (โชว์ใน Host: ของแพ็กเก็ต)
      var res = httpRequest(srcId, targetIp);
      if (res.ok) { arpNote(srcId, res.target, res.path); if (pktCb) capHttp(srcId, targetIp, res.target, res.path, (opt && opt.host) || targetIp, res.status, null); animateAlong(res.path, function (hops) { if (onArrive) onArrive(res.status, hops, res.target); }); }
      return res;
    },
    // ----- อินเทอร์เน็ตภายนอก (ping เว็บ/DNS · tracert) -----
    netTarget: function (host) { return netTarget(host); },       // รู้จัก host ไหม (เว็บ/8.8.8.8)
    hasISP: function () { return !!ispNode(); },
    pingNet: function (srcId, host, onArrive, opt) { return pingNet(srcId, host, onArrive, opt); },
    tracePath: function (srcId, host) { return tracePath(srcId, host); }
  };
})(window);
