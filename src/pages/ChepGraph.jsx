import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { forceX, forceY } from 'd3-force';
import './ChepGraph.css';

/* ── canvas colour palettes (mirror App.css theme vars) ─────────────────── */
const PALETTE = {
  light: {
    bg: '#fbfaf7', text: '#1a1a1a', muted: '#6b6b6b', accent: '#3d7530',
    hub: '#ece7da', hubStroke: '#b9b09a',
    link: 'rgba(120,112,96,0.16)', linkDim: 'rgba(120,112,96,0.05)',
    related: 'rgba(168,95,122,0.28)', relatedHi: '#a85f7a', plenary: 'rgba(201, 181, 146, 0.55)',
  },
  dark: {
    bg: '#16181d', text: '#e8e6e1', muted: '#9a9a9a', accent: '#a8d09a',
    hub: '#272a31', hubStroke: '#454a57',
    link: 'rgba(180,176,166,0.13)', linkDim: 'rgba(180,176,166,0.04)',
    related: 'rgba(190,120,150,0.30)', relatedHi: '#d08bb0', plenary: 'rgba(181, 151, 75, 0.2)',
  },
};

const LABEL_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
const idOf = (e) => (typeof e === 'object' && e !== null ? e.id : e);
const trunc = (s, n) => (s && s.length > n ? s.slice(0, n - 1) + '…' : s || '');
const chipLabel = (t) => {
  const m = t.label && t.label.match(/^Track\s+\d+\s*[-–]\s*(.+)$/);
  return m ? `${t.short} · ${m[1]}` : (t.label || t.short);
};

// Okabe-Ito colorblind-safe palette (11 tracks + spare)
const CB_PALETTE = [
  '#E69F00', // orange
  '#56B4E9', // sky blue
  '#009E73', // bluish green
  '#C9A800', // amber (F0E442 yellow darkened for light-bg contrast)
  '#0072B2', // blue
  '#D55E00', // vermillion
  '#CC79A7', // reddish purple
  '#6A3D9A', // deep purple
  '#1B9E77', // teal
  '#A6761D', // brownish
  '#737373', // grey — Other (999 too faint on light bg)
];

/* ── hooks ──────────────────────────────────────────────────────────────── */
function useBodyTheme() {
  const [theme, setTheme] = useState(() => document.body.dataset.theme || 'light');
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setTheme(document.body.dataset.theme || 'light'));
    obs.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
  return theme;
}

function useElementSize(ref) {
  const [size, setSize] = useState({ width: 960, height: 600 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      if (el.clientWidth && el.clientHeight)
        setSize({ width: el.clientWidth, height: el.clientHeight });
    };
    measure(); // immediate — ResizeObserver alone is unreliable on first paint
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [ref]);
  return size;
}

/* ── component ──────────────────────────────────────────────────────────── */
export default function ChepGraph() {
  const theme = useBodyTheme();
  const colors = PALETTE[theme];
  const fgRef = useRef();
  const stageRef = useRef();
  const didFit = useRef(false);
  const { width, height } = useElementSize(stageRef);

  const [raw, setRaw] = useState(null);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [hiddenTracks, setHiddenTracks] = useState(() => new Set());
  const [activeTopic, setActiveTopic] = useState('');
  const [showRelated, setShowRelated] = useState(false);
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [showLabels, setShowLabels] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [pinTracks, setPinTracks] = useState(true);
  const [repel, setRepel] = useState(240);
  const [linkStrength, setLinkStrength] = useState(0.2);
  const [linkDistance, setLinkDistance] = useState(85);
  const [centerStrength, setCenterStrength] = useState(0.12);

  const focusId = hovered || selected;
  const searchLc = search.trim().toLowerCase();

  /* load data once */
  useEffect(() => {
    fetch(`${process.env.PUBLIC_URL}/data/chep_graph.json`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setRaw)
      .catch((e) => setError(String(e)));
  }, []);

  /* stable graph object (don't recreate on filter changes → layout persists) */
  const graphData = useMemo(
    () => (raw ? { nodes: raw.nodes, links: raw.links } : { nodes: [], links: [] }),
    [raw]
  );

  const meta = raw?.meta;
  // map tracks to an accessible palette (deterministic ordering from meta.tracks)
  const trackColor = useMemo(() => {
    const obj = {};
    (meta?.tracks || []).forEach((t, i) => {
      obj[t.key] = CB_PALETTE[i % CB_PALETTE.length];
    });
    return obj;
  }, [meta]);

  const nodeById = useMemo(() => {
    const m = new Map();
    (raw?.nodes || []).forEach((n) => m.set(n.id, n));
    return m;
  }, [raw]);

  const neighbors = useMemo(() => {
    const m = new Map();
    (raw?.links || []).forEach((l) => {
      const s = idOf(l.source), t = idOf(l.target);
      if (!m.has(s)) m.set(s, new Set());
      if (!m.has(t)) m.set(t, new Set());
      m.get(s).add(t);
      m.get(t).add(s);
    });
    return m;
  }, [raw]);

  /* configure forces — re-applied live whenever the sliders change */
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg || !raw) return;
    const tracks = raw.nodes.filter((n) => n.type === 'track');
    if (pinTracks) {
      const R = 270;
      tracks.forEach((n, i) => {
        const a = (2 * Math.PI * i) / tracks.length - Math.PI / 2;
        n.fx = R * Math.cos(a);
        n.fy = R * Math.sin(a);
      });
    } else {
      tracks.forEach((n) => { n.fx = null; n.fy = null; });
    }
    fg.d3Force('link')
      .distance((l) => (l.type === 'member' ? linkDistance : linkDistance * 3.5))
      .strength((l) => (l.type === 'member' ? linkStrength : 0));
    fg.d3Force('charge').strength(-repel).distanceMax(240);
    fg.d3Force('x', forceX(0).strength(centerStrength));
    fg.d3Force('y', forceY(0).strength(centerStrength));
    fg.d3ReheatSimulation();
  }, [raw, repel, linkStrength, linkDistance, centerStrength, pinTracks]);

  /* redraw when interaction / filter state changes (after sim cooldown) */
  useEffect(() => {
    fgRef.current?.refresh?.();
  }, [focusId, selected, search, activeTopic, showRelated, theme, hiddenTracks]);

  /* filter predicate */
  const passes = useCallback((node) => {
    if (node.type === 'track') return true; // track hubs are structure, always shown
    if (hiddenTracks.has(node.trackKey)) return false;
    if (activeTopic && !(node.keywords || []).includes(activeTopic)) return false;
    if (searchLc) {
      if (!node._s)
        node._s = (
          node.title + ' ' + (node.abstract || '') + ' ' +
          (node.keywords || []).join(' ') + ' ' +
          (node.speakers || []).map((s) => s.name).join(' ')
        ).toLowerCase();
      if (!node._s.includes(searchLc)) return false;
    }
    return true;
  }, [hiddenTracks, activeTopic, searchLc]);

  /* ── node painter ── */
  const paintNode = useCallback((node, ctx, scale) => {
    const inFilter = passes(node);
    const inFocus = !focusId || node.id === focusId || neighbors.get(focusId)?.has(node.id);
    ctx.globalAlpha = !inFilter ? 0.05 : inFocus ? 1 : 0.12;

    if (node.type === 'track') {
      const r = 4 + Math.sqrt(node.count) * 0.7;
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
      ctx.fillStyle = trackColor[node.key] || node.color;
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = colors.bg;
      ctx.stroke();
      const fs = Math.max(5, 13 / scale);
      ctx.font = `700 ${fs}px ${LABEL_FONT}`;
      ctx.fillStyle = trackColor[node.key] || node.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(node.short, node.x, node.y + r + 1.5);
    } else {
      const own = node.own;
      const r = own ? 3.6 : 2.3;
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
      ctx.fillStyle = trackColor[node.trackKey] || colors.muted;
      ctx.fill();
      if (own) {
        ctx.lineWidth = 1.3;
        ctx.strokeStyle = colors.accent;
        ctx.stroke();
      }
      if (node.id === selected) {
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = colors.text;
        ctx.stroke();
      }
      if (node.id === focusId || node.id === selected || (showLabels && scale > 1.8)) {
        const fs = Math.max(3, 9.5 / scale);
        ctx.font = `${fs}px ${LABEL_FONT}`;
        ctx.fillStyle = colors.text;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(trunc(node.title, 46), node.x + r + 1.4, node.y);
      }
    }
    ctx.globalAlpha = 1;
  }, [passes, focusId, neighbors, colors, trackColor, selected, showLabels]);

  const paintPointer = useCallback((node, color, ctx) => {
    const r = node.type === 'track'
      ? 4 + Math.sqrt(node.count) * 0.7
      : node.own ? 3.6 : 2.3;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(node.x, node.y, r + 1.5, 0, 2 * Math.PI);
    ctx.fill();
  }, []);

  /* ── link accessors ── */
  const linkVisible = useCallback((l) => {
    if (l.type === 'related') {
      if (!showRelated) return false;
      return passes(nodeById.get(idOf(l.source))) && passes(nodeById.get(idOf(l.target)));
    }
    return true;
  }, [showRelated, passes, nodeById]);

  const linkColor = useCallback((l) => {
    const touches = focusId && (idOf(l.source) === focusId || idOf(l.target) === focusId);
    if (touches) return l.type === 'related' ? colors.relatedHi : colors.accent;
    if (focusId) return colors.linkDim;
    return l.type === 'related' ? colors.related : colors.link;
  }, [focusId, colors]);

  const linkWidth = useCallback((l) => {
    const touches = focusId && (idOf(l.source) === focusId || idOf(l.target) === focusId);
    if (touches) return l.type === 'related' ? 1.6 : 1.1;
    return 0.4;
  }, [focusId]);

  /* dashed grey painter for plenary→track edges */
  const linkCanvasObject = useCallback((l, ctx) => {
    const s = l.source, t = l.target;
    if (s?.x == null || t?.x == null) return;
    const touches = focusId && (idOf(l.source) === focusId || idOf(l.target) === focusId);
    const alpha = focusId ? (touches ? 0.65 : 0.07) : 0.38;
    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([3, 5]);
    ctx.strokeStyle = `rgba(150,150,150,${alpha})`;
    ctx.lineWidth = touches ? 1.2 : 0.8;
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(t.x, t.y);
    ctx.stroke();
    ctx.restore();
  }, [focusId]);

  /* ── handlers ── */
  const onNodeClick = useCallback((node) => {
    if (node.type === 'track') {
      // isolate this track (hide the others); click again to clear
      setSelected(null);
      setHiddenTracks((prev) => {
        const others = (meta?.tracks || []).map((t) => t.key).filter((k) => k !== node.key);
        const isolated = prev.size === others.length && others.every((k) => prev.has(k));
        return isolated ? new Set() : new Set(others);
      });
    } else {
      setSelected(node.id);
      fgRef.current?.centerAt(node.x, node.y, 600);
    }
  }, [meta]);

  const toggleTrack = (key) =>
    setHiddenTracks((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const resetFilters = () => {
    setSearch('');
    setHiddenTracks(new Set());
    setActiveTopic('');
    setSelected(null);
  };

  const nodeLabel = useCallback((n) =>
    n.type === 'track'
      ? `${n.label} · ${n.count} talks`
      : `<b>${trunc(n.title, 90)}</b>`, []);

  const selectedNode = selected ? nodeById.get(selected) : null;
  const counts = meta?.counts;

  if (error)
    return <div className="cg-page"><div className="cg-status">Couldn’t load the graph data: {error}</div></div>;

  return (
    <div className="cg-page">
      <header className="cg-head">
        <h1>CHEP 2026 — talk graph</h1>
        <p className="cg-sub">
          {counts ? `${counts.talks} contributions, clustered around their parallel track. ` : 'Loading… '}
          Click a <strong>talk</strong> for its abstract, a <strong>track</strong> to isolate it. Filter by topic or track; scroll to zoom.{' '}
          <a href={meta?.url || 'https://indico.cern.ch/event/1471803/'} target="_blank" rel="noreferrer">Indico ↗</a>
        </p>
      </header>

      <div className="cg-toolbar">
        <input
          className="cg-search"
          type="search"
          placeholder="Search titles, abstracts, speakers, topics…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="cg-select" value={activeTopic} onChange={(e) => setActiveTopic(e.target.value)}>
          <option value="">All topics</option>
          {(meta?.topics || []).map((t) => (
            <option key={t.name} value={t.name}>{t.name} ({t.count})</option>
          ))}
        </select>
        <label className="cg-toggle">
          <input type="checkbox" checked={showRelated} onChange={(e) => setShowRelated(e.target.checked)} />
          cross-track links
        </label>
        <label className="cg-toggle">
          <input type="checkbox" checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} />
          talk labels
        </label>
        <label className="cg-toggle">
          <input type="checkbox" checked={pinTracks} onChange={(e) => setPinTracks(e.target.checked)} />
          pin tracks
        </label>
        <button className="cg-reset" onClick={resetFilters}>Reset</button>
      </div>

      <div className="cg-main">
      <div className="cg-tracks">
        {(meta?.tracks || []).map((t) => (
          <button
            key={t.key}
            className={`cg-chip${hiddenTracks.has(t.key) ? ' off' : ''}`}
            style={{ '--c': trackColor[t.key] || t.color }}
            title={t.label}
            onClick={() => toggleTrack(t.key)}
          >
            <span className="cg-dot" /> {chipLabel(t)} <span className="cg-n">{t.count}</span>
          </button>
        ))}
        <span className="cg-chip own static"><span className="cg-dot ring" /> my talks</span>
      </div>

      <div className="cg-stage" ref={stageRef}>
        {!raw && !error && <div className="cg-status">Loading {`>`}500 talks…</div>}
        {raw && (
          <ForceGraph2D
            ref={fgRef}
            graphData={graphData}
            width={width}
            height={height}
            backgroundColor={colors.bg}
            nodeId="id"
            nodeLabel={nodeLabel}
            nodeCanvasObject={paintNode}
            nodeCanvasObjectMode={() => 'replace'}
            nodePointerAreaPaint={paintPointer}
            linkColor={linkColor}
            linkWidth={linkWidth}
            linkVisibility={linkVisible}
            linkCanvasObjectMode={(l) => l.type === 'plenary' ? 'replace' : undefined}
            linkCanvasObject={linkCanvasObject}
            onNodeClick={onNodeClick}
            onNodeHover={(n) => setHovered(n ? n.id : null)}
            onBackgroundClick={() => setSelected(null)}
            cooldownTime={4000}
            onEngineStop={() => {
              if (!didFit.current && fgRef.current) {
                fgRef.current.zoomToFit(500, 60);
                didFit.current = true;
              }
            }}
          />
        )}

        {raw && (
          <div className="cg-forces">
            <button className="cg-forces-toggle" onClick={() => setShowControls((v) => !v)}>
              Forces {showControls ? '▾' : '▸'}
            </button>
            {showControls && (
              <div className="cg-forces-body">
                <label>Centre force
                  <input type="range" min="0" max="0.5" step="0.01" value={centerStrength}
                    onChange={(e) => setCenterStrength(+e.target.value)} /></label>
                <label>Repel force
                  <input type="range" min="0" max="500" step="10" value={repel}
                    onChange={(e) => setRepel(+e.target.value)} /></label>
                <label>Link force
                  <input type="range" min="0" max="0.5" step="0.02" value={linkStrength}
                    onChange={(e) => setLinkStrength(+e.target.value)} /></label>
                <label>Link distance
                  <input type="range" min="10" max="160" step="2" value={linkDistance}
                    onChange={(e) => setLinkDistance(+e.target.value)} /></label>
              </div>
            )}
          </div>
        )}

        {selectedNode && (
          <aside className="cg-panel">
            <button className="cg-close" onClick={() => setSelected(null)} aria-label="Close">×</button>
            <div className="cg-panel-track" style={{ color: trackColor[selectedNode.trackKey] }}>
              {selectedNode.corrTrack
                ? `Plenary → ${selectedNode.track}`
                : (selectedNode.track || selectedNode.session)}
              {selectedNode.own && <span className="cg-own-badge"> · my talk</span>}
            </div>
            <h2 className="cg-panel-title">
              <a href={selectedNode.url} target="_blank" rel="noreferrer">{selectedNode.title}</a>
            </h2>
            <div className="cg-panel-meta">
              {selectedNode.day && <span>{selectedNode.day} · {selectedNode.start}–{selectedNode.end}</span>}
              {selectedNode.room && <span>{selectedNode.room}</span>}
            </div>
            {selectedNode.speakers?.length > 0 && (
              <div className="cg-panel-speakers">
                {selectedNode.speakers.map((s, i) => (
                  <span key={i}>{s.name}{s.affiliation ? ` (${s.affiliation})` : ''}</span>
                ))}
              </div>
            )}
            {selectedNode.keywords?.length > 0 && (
              <div className="cg-tags">
                {selectedNode.keywords.map((k) => (
                  <button key={k} className="cg-tag" onClick={() => setActiveTopic(k)}>{k}</button>
                ))}
              </div>
            )}
            {selectedNode.abstract && <p className="cg-abstract">{selectedNode.abstract}</p>}
          </aside>
        )}
      </div>
      </div>
    </div>
  );
}
