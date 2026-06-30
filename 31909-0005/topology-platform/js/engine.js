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

  /* ---------- สถานะ engine ---------- */
  var svg, layers = {}, state, seq, els;
  var mode = 'idle';          // place | connect | delete | simulate | idle
  var placeType = 'pc';
  var media = 'utp';
  var sel = { connect: null, simSrc: null, delPending: null };
  var statusCb = null, changeCb = null, toastCb = null, configCb = null;
  var STORE_KEY = 'netsim_builder_v1';

  function fresh() {
    state = { nodes: [], edges: [] };
    seq = {}; els = { node: {}, edge: {}, edgeHit: {} };
    sel = { connect: null, simSrc: null, delPending: null };
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
  function nextId(type) {
    seq[type] = (seq[type] || 0) + 1;
    return TYPES[type].prefix + seq[type];
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
    var hit = mk('circle', { 'class': 'node-hit', cx: 0, cy: 0, r: 26 });
    g.appendChild(hit);
    layers.nodes.appendChild(g);
    els.node[n.id] = g;
    attachNode(hit, g, n);
  }

  function addNode(type, x, y) {
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
    var e = { id: 'e' + (++_edgeSeq), a: a, b: b, media: m };
    state.edges.push(e);
    renderEdge(e);
    changed();
    return { ok: true };
  }
  var _edgeSeq = 0;
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
        toast('เชื่อม ' + first + ' ↔ ' + id + ' (' + MEDIA_LABEL[media] + ')', 'ok');
        status('เชื่อมสำเร็จ — แตะอุปกรณ์ตัวแรกเพื่อเชื่อมเส้นต่อไป');
      } else if (res.reason === 'media') {
        var nd = res.node;
        toast('🚫 ' + typeLabel(nd.type) + ' ต่อ "' + MEDIA_LABEL[media] + '" ไม่ได้ — รองรับ: ' + supportedText(nd.type), 'bad');
        status('สื่อไม่ตรงชนิดอุปกรณ์ — ดู "รองรับ" ใต้ปุ่มอุปกรณ์ แล้วเลือกสื่อใหม่');
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
        if (!visited[nb[i]]) { visited[nb[i]] = true; parent[nb[i]] = cur; queue.push(nb[i]); }
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
      status('ส่งไม่ถึง: ลองสลับไปโหมด "เชื่อม" ต่อสายให้ครบเส้นทางก่อน');
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

  function animatePacketAlongPath(pathEl, packetEl, durationMs, onComplete) {
    var total = pathEl.getTotalLength(), start = null;
    function step(ts) {
      if (start === null) start = ts;
      var t = (ts - start) / durationMs; if (t > 1) t = 1;
      var pt = pathEl.getPointAtLength(t * total);
      packetEl.setAttribute('cx', pt.x); packetEl.setAttribute('cy', pt.y);
      if (t < 1) requestAnimationFrame(step);
      else if (typeof onComplete === 'function') onComplete();
    }
    requestAnimationFrame(step);
  }

  /* ================= IP / Terminal subsystem (ปวช.1/ปวส.1 เบื้องต้น) ================= */
  var DEFAULT_MASK = '255.255.255.0';
  function canHaveIP(type) { return type === 'pc' || type === 'server' || type === 'isp'; }  // ปลายทาง + ISP (8.8.8.8)
  function parseIp(s) {
    var a = (s || '').trim().split('.');
    if (a.length !== 4) return { bad: 1 };
    for (var i = 0; i < 4; i++) { if (!/^\d+$/.test(a[i]) || +a[i] < 0 || +a[i] > 255) return { bad: 1 }; }
    return { net: a[0] + '.' + a[1] + '.' + a[2], host: +a[3] };
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
  function setNodeIP(id, ip, gw, http) {
    var n = nodeById(id); if (!n) return;
    n.ip = (ip || '').trim(); n.gw = (gw || '').trim();
    if (http !== undefined && http !== null && http !== '') n.http = +http;
    var g = els.node[id];
    if (g) { var t = g.querySelector('.node-ip'); if (t) t.textContent = n.ip; }
    save(); changed();
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
    var sameNet = (sp.net === tr.net);
    var path = findShortestPathBFS(buildAdj(), srcId, target.id);
    if (!path) return { ok: false, reason: 'unwired', sameNet: sameNet, target: target.id };
    if (sameNet) return { ok: true, path: path, target: target.id, sameNet: true };
    var hasRouter = path.some(function (id) { return nodeById(id).type === 'router'; });
    if (hasRouter && src.gw) return { ok: true, path: path, target: target.id, sameNet: false, routed: true };
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
  function tapConfig(id) {
    var n = nodeById(id); if (!n) return;
    if (!canHaveIP(n.type)) { toast('อุปกรณ์นี้ตั้ง IP ไม่ได้ — ได้เฉพาะ พีซี (PC) + เซิร์ฟเวอร์ (Server)', 'bad'); return; }
    if (configCb) configCb(id);
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
  function renderAll() {
    layers.edges.innerHTML = ''; layers.nodes.innerHTML = ''; layers.packets.innerHTML = '';
    els = { node: {}, edge: {}, edgeHit: {} };
    state.edges.forEach(renderEdge);
    state.nodes.forEach(renderNode);
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
      statusCb = opts.onStatus || null;
      changeCb = opts.onChange || null;
      toastCb = opts.onToast || null;
      configCb = opts.onConfig || null;
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
    loadState: function (obj) {
      if (typeof obj === 'string') obj = JSON.parse(obj);
      fresh(); state.nodes = obj.nodes || []; state.edges = obj.edges || [];
      renderAll(); save(); changed();
    },
    /* ----- IP / Terminal API ----- */
    canHaveIP: canHaveIP,
    mask: DEFAULT_MASK,
    typeLabel: function (t) { return typeLabel(t); },
    getNode: function (id) { var n = nodeById(id); return n ? { id: n.id, type: n.type, ip: n.ip || '', gw: n.gw || '', http: n.http || 200 } : null; },
    nodesWithIP: function () {
      return state.nodes.filter(function (n) { return canHaveIP(n.type); })
        .map(function (n) { return { id: n.id, type: n.type, ip: n.ip || '', gw: n.gw || '' }; });
    },
    setNodeIP: function (id, ip, gw, http) { setNodeIP(id, ip, gw, http); },
    ipError: function (ip) { return ipError(ip); },
    ipConflict: function (id, ip) { return ipConflict(id, ip); },
    // ping: ส่ง onArrive(res, hops) เมื่อแพ็กเก็ตถึงปลายทาง · คืน res ทันทีสำหรับ pre-check
    ping: function (srcId, targetIp, onArrive) {
      var res = pingCheck(srcId, targetIp);
      if (res.ok) animateAlong(res.path, function (hops) { if (onArrive) onArrive(res, hops); });
      return res;
    },
    // http: ส่ง onArrive(status, hops, targetId) เมื่อ packet ถึง server · คืน res ทันที (pre-check)
    http: function (srcId, targetIp, onArrive) {
      var res = httpRequest(srcId, targetIp);
      if (res.ok) animateAlong(res.path, function (hops) { if (onArrive) onArrive(res.status, hops, res.target); });
      return res;
    }
  };
})(window);
