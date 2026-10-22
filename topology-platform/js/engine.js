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

  function fresh() {
    state = { nodes: [], edges: [] };
    seq = {}; els = { node: {}, edge: {}, edgeHit: {} };
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
      if (sel.delPending) els.node[sel.delPending].classList.remove('sel-del');
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
  function canHaveIP(type) { return type === 'pc' || type === 'server' || type === 'isp' || type === 'router'; }  // ปลายทาง + ISP + Router (ขา Gateway)
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
  function canDhcpClient(type) { return type === 'pc' || type === 'server'; }
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
      paintNode(id); changed();
      return { ok: true, ip: ip, gw: c.gw, dns: c.dns, server: srv.id, serverIp: srv.ip };
    }
    n.ip = apipaFor(id); n.gw = ''; n.dns = ''; n.ipmode = 'dhcp'; delete n.lease;
    if (oldIp !== n.ip) delete arp[id];
    paintNode(id); changed();
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
    for (var i = 0; i < l.length; i++) if (l[i].ip === ip) { l[i].id = id; return; }
    l.push({ id: id, ip: ip, gw: !!isGw });
  }
  function arpNote(srcId, targetId, path) {   // เรียกเมื่อ ping/http/ping เน็ต "สำเร็จ"
    var s = nodeById(srcId); if (!s || !s.ip) return;
    var t = targetId ? nodeById(targetId) : null;
    if (t && t.ip && sameNetwork(s.ip, t.ip)) { arpAdd(srcId, t.id, t.ip, false); return; }
    if (!s.gw) return;
    var gn = findNodeByIp(s.gw), gid = gn ? gn.id : null;
    if (!gid) for (var i = 0; i < (path || []).length; i++) { if ((nodeById(path[i]) || {}).type === 'router') { gid = path[i]; break; } }
    if (gid) arpAdd(srcId, gid, s.gw, true);
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
        addNode(placeType, p.x, p.y);
      } else if (mode === 'delete' && sel.delPending) {
        els.node[sel.delPending].classList.remove('sel-del'); sel.delPending = null;
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
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ nodes: state.nodes, edges: state.edges, seq: seq })); }
    catch (err) {}
  }
  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return false;
      var s = JSON.parse(raw);
      if (!s || !s.nodes || !s.nodes.length) return false;
      state.nodes = s.nodes; state.edges = s.edges || []; seq = s.seq || {};
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
    if (x0 >= M && y0 >= M && x1 <= r.width - M && y1 <= r.height - M - B) return;
    var k = Math.min(1, (r.width - 2 * M) / ((x1 - x0) || 1), (r.height - 2 * M - B) / ((y1 - y0) || 1));
    state.nodes.forEach(function (n) {
      n.x = Math.round(M + (n.x - x0) * k);
      n.y = Math.round(M + (n.y - y0) * k);
    });
  }
  function renderAll() {
    layers.edges.innerHTML = ''; layers.nodes.innerHTML = ''; layers.packets.innerHTML = '';
    els = { node: {}, edge: {}, edgeHit: {} };
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
  function pingNet(srcId, host, onArrive) {
    var t = netTarget(host);
    if (!t) return { ok: false, reason: 'dns' };
    var r = reachInternet(srcId);
    if (!r.ok) return { ok: false, reason: r.reason, target: t };
    arpNote(srcId, null, r.path);   // ออกนอกวงสำเร็จ → gateway เข้า ip neigh
    animateAlong(r.path, function (hops) { if (onArrive) onArrive(t, hops); });
    return { ok: true, target: t, path: r.path };
  }
  // ข้อมูลเส้นทาง tracert (ไม่ animate) — internet: path→ISP+ปลายทาง · LAN: path ถึงเครื่อง
  function tracePath(srcId, host) {
    var t = netTarget(host);
    if (t) {
      var r = reachInternet(srcId);
      if (!r.ok) return { ok: false, reason: r.reason, target: t };
      return { ok: true, kind: 'net', nodes: r.path, target: t };
    }
    var pc = pingCheck(srcId, host);
    if (!pc.ok) return { ok: false, reason: pc.reason };
    return { ok: true, kind: 'lan', nodes: pc.path, target: { ip: host } };
  }

  /* ================= DNS (wk13-14 · แปลงชื่อ → เลข IP) =================
   * โหมดเข้ม (dnsStrict · builder เท่านั้น): ชื่อต้องถาม "DNS ของเครื่องต้นทาง" ก่อน
   *   ไม่มี DNS = nodns · DNS ไปไม่ถึง/ไม่ใช่ DNS = timeout · ถึงแต่ไม่รู้จักชื่อ = nxdomain
   *   DNS สาธารณะ (8.8.8.8 …) ตอบเมื่อเครื่องออกเน็ตได้จริง · DNS = IP router ที่เปิด DHCP (แบบ MikroTik) ตอบเมื่อ ping ถึง router
   *   ชื่อเว็บนอกต้องให้ router ถึง ISP ด้วย ไม่งั้นหาไม่เจอ · ชื่อในร้าน = n.host ของ Server (DNS ที่ทำงานได้ตัวไหนก็ตอบ ไม่มีตาราง record)
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
      var ln = hostNode(nm);
      if (ln && ln.ip) return { ok: true, kind: 'lan', key: ln.ip, ip: ln.ip, name: nm, dns: dns, dnsName: srv.name };
    }
    return { ok: false, reason: 'nxdomain', dns: dns, dnsName: srv.name };
  }

  /* ================= public API ================= */
  global.NetSimEngine = {
    init: function (svgEl, opts) {
      svg = svgEl; fresh(); _edgeSeq = 0;
      svg.innerHTML = '';
      layers.edges = mk('g', { 'class': 'layer-edges' });
      layers.nodes = mk('g', { 'class': 'layer-nodes' });
      layers.packets = mk('g', { 'class': 'layer-packets' });
      svg.appendChild(layers.edges); svg.appendChild(layers.nodes); svg.appendChild(layers.packets);
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
      if (!(opts.restore !== false && load())) changed();
      return this;
    },
    setMode: function (m) {
      mode = m; clearSelClasses();
      sel = { connect: null, simSrc: null, delPending: null };
      if (svg) svg.classList.toggle('cut-on', m === 'cutlink');
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
    exportState: function () { return JSON.stringify(state); },
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
      ipmode: n.ipmode === 'dhcp' ? 'dhcp' : 'static', dns: n.dns || '', host: n.host || '' } : null; },
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
    ipError: function (ip) { return ipError(ip); },
    ipConflict: function (id, ip) { return ipConflict(id, ip); },
    // ping: ส่ง onArrive(res, hops) เมื่อแพ็กเก็ตถึงปลายทาง · คืน res ทันทีสำหรับ pre-check
    /* ตรวจอย่างเดียว ไม่ยิงแพ็กเก็ต — หน้าภารกิจใช้เช็คเงื่อนไขผ่านซ้ำ ๆ ได้โดยจอไม่กระพริบ */
    canPing: function (srcId, targetIp) { return pingCheck(srcId, targetIp); },
    canReachNet: function (srcId) { return reachInternet(srcId); },
    ping: function (srcId, targetIp, onArrive) {
      var res = pingCheck(srcId, targetIp);
      if (res.ok) { arpNote(srcId, res.target, res.path); animateAlong(res.path, function (hops) { if (onArrive) onArrive(res, hops); }); }
      return res;
    },
    // http: ส่ง onArrive(status, hops, targetId) เมื่อ packet ถึง server · คืน res ทันที (pre-check)
    http: function (srcId, targetIp, onArrive) {
      var res = httpRequest(srcId, targetIp);
      if (res.ok) { arpNote(srcId, res.target, res.path); animateAlong(res.path, function (hops) { if (onArrive) onArrive(res.status, hops, res.target); }); }
      return res;
    },
    // ----- อินเทอร์เน็ตภายนอก (ping เว็บ/DNS · tracert) -----
    netTarget: function (host) { return netTarget(host); },       // รู้จัก host ไหม (เว็บ/8.8.8.8)
    hasISP: function () { return !!ispNode(); },
    pingNet: function (srcId, host, onArrive) { return pingNet(srcId, host, onArrive); },
    tracePath: function (srcId, host) { return tracePath(srcId, host); }
  };
})(window);
