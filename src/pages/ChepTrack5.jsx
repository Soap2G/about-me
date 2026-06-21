import { useEffect, useRef, useState } from 'react';
import { select } from 'd3-selection';
import { zoom as d3zoom, zoomIdentity } from 'd3-zoom';
import './ChepTrack5.css';

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

const PALETTE = {
  light: {
    edgeIsa: '#9a9a9a', edgeTag: '#cfcfcf',
    blobFill: '#efeaf2', blobStroke: '#7b6c91', blobLabel: '#4a3f5e',
    blobLabelHalo: '#ffffff',
    dotStroke: '#3a3a3a', talkLabel: '#222222', talkLabelHalo: '#ffffff',
  },
  dark: {
    edgeIsa: '#8a8a8a', edgeTag: '#5a5a5a',
    blobFill: '#2a2230', blobStroke: '#a899c1', blobLabel: '#d9cfe6',
    blobLabelHalo: '#16181d',
    dotStroke: '#c8c8c8', talkLabel: '#e8e6e1', talkLabelHalo: '#16181d',
  },
};

export default function ChepTrack5() {
  const theme = useBodyTheme();
  const colors = PALETTE[theme];

  const svgRef = useRef(null);
  const allLabelsRef = useRef(null);
  const resetRef = useRef(null);

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetch(`${process.env.PUBLIC_URL}/data/chep_track5.json`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setData)
      .catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const { nodes, edges, hulls, meta } = data;
    const W = meta.W;
    const H = meta.H;

    const byId = new Map(nodes.map((n) => [n.id, n]));
    const adj = {};
    edges.forEach((e) => {
      (adj[e.source] = adj[e.source] || []).push(e.target);
      (adj[e.target] = adj[e.target] || []).push(e.source);
    });

    const svg = select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${W} ${H}`);

    const root = svg.append('g');
    const gHull = root.append('g');
    const gEdge = root.append('g');
    const gBlob = root.append('g');
    const gDot = root.append('g');
    const gLabel = root.append('g');

    // hull regions
    gHull.selectAll('path').data(hulls).join('path')
      .attr('class', 'hull')
      .attr('d', (h) => 'M' + h.points.map((p) => p.join(',')).join('L') + 'Z')
      .attr('fill', (h) => h.color).attr('fill-opacity', 0.09)
      .attr('stroke', (h) => h.color).attr('stroke-opacity', 0.4).attr('stroke-width', 1.6);

    // edges
    gEdge.selectAll('line').data(edges).join('line')
      .attr('class', 'edge')
      .attr('x1', (e) => byId.get(e.source).x).attr('y1', (e) => byId.get(e.source).y)
      .attr('x2', (e) => byId.get(e.target).x).attr('y2', (e) => byId.get(e.target).y)
      .attr('stroke', (e) => e.rel === 'isa' ? colors.edgeIsa : colors.edgeTag)
      .attr('stroke-width', (e) => e.rel === 'isa' ? 1.5 : 0.8)
      .attr('stroke-dasharray', (e) => e.rel === 'isa' ? '4,3' : null)
      .style('opacity', (e) => e.rel === 'isa' ? 0.8 : 0.5);

    // keyword blobs (child + solo): circle + label
    const blobNodes = nodes.filter((n) => n.kind === 'child' || n.kind === 'solo');
    gBlob.selectAll('circle.blob').data(blobNodes).join('circle')
      .attr('class', 'blob').attr('cx', (d) => d.x).attr('cy', (d) => d.y).attr('r', (d) => d.r)
      .attr('fill', colors.blobFill).attr('stroke', colors.blobStroke).attr('stroke-width', 1.3)
      .style('cursor', 'pointer')
      .on('mouseover', (ev, d) => setHi(d.id)).on('mouseout', () => setHi(null))
      .on('click', (ev, d) => fitTo(d.id));
    gBlob.selectAll('text.blabel').data(blobNodes).join('text')
      .attr('class', 'blabel').attr('x', (d) => d.x).attr('y', (d) => d.y)
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
      .attr('font-size', 12.5).attr('font-weight', 'bold').attr('fill', colors.blobLabel)
      .style('paint-order', 'stroke').style('stroke', colors.blobLabelHalo).style('stroke-width', 3)
      .style('pointer-events', 'none').text((d) => d.label);

    // umbrella labels (the hull is the "blob")
    gBlob.selectAll('text.umb').data(nodes.filter((n) => n.kind === 'umbrella')).join('text')
      .attr('class', 'umb').attr('x', (d) => d.x).attr('y', (d) => d.y)
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
      .attr('font-size', 16).attr('font-weight', 'bold').attr('fill', (d) => d.umbColor)
      .style('paint-order', 'stroke').style('stroke', colors.blobLabelHalo).style('stroke-width', 4.5)
      .style('cursor', 'pointer')
      .on('mouseover', (ev, d) => setHi(d.id)).on('mouseout', () => setHi(null))
      .on('click', (ev, d) => fitTo(d.id))
      .text((d) => d.label);

    // talk dots, each an <a> link, with a tooltip
    const talkNodes = nodes.filter((n) => n.kind === 'talk');
    const aDot = gDot.selectAll('a').data(talkNodes).join('a')
      .attr('href', (d) => d.url).attr('target', '_blank').attr('rel', 'noopener');
    aDot.append('circle').attr('class', 'dot')
      .attr('cx', (d) => d.x).attr('cy', (d) => d.y).attr('r', (d) => d.r)
      .attr('fill', (d) => d.color).attr('stroke', colors.dotStroke).attr('stroke-width', 0.9)
      .on('mouseover', (ev, d) => setHi(d.id)).on('mouseout', () => setHi(null));
    aDot.append('title').text((d) => d.label + ' — ' + d.exp);

    // hidden talk labels (revealed on hover or via toggle)
    gLabel.selectAll('text.dlabel').data(talkNodes).join('text')
      .attr('class', 'dlabel').attr('x', (d) => d.x + 9).attr('y', (d) => d.y - 9)
      .attr('font-size', 10.5).attr('fill', colors.talkLabel)
      .style('paint-order', 'stroke').style('stroke', colors.talkLabelHalo).style('stroke-width', 2.5)
      .style('pointer-events', 'none').style('opacity', 0).text((d) => d.label);

    let showAllLocal = showAll;

    function setHi(id) {
      const keep = id ? new Set([id, ...(adj[id] || [])]) : null;
      gDot.selectAll('.dot').style('opacity', (d) => !keep || keep.has(d.id) ? 1 : 0.10);
      gBlob.selectAll('.blob').style('opacity', (d) => !keep || keep.has(d.id) ? 1 : 0.12);
      gBlob.selectAll('.blabel').style('opacity', (d) => !keep || keep.has(d.id) ? 1 : 0.12);
      gBlob.selectAll('.umb').style('opacity', (d) => !keep || keep.has(d.id) ? 1 : 0.12);
      gEdge.selectAll('.edge')
        .style('opacity', (e) =>
          !keep ? (e.rel === 'isa' ? 0.8 : 0.5) : ((e.source === id || e.target === id) ? 0.95 : 0.03))
        .attr('stroke-width', (e) => {
          const base = e.rel === 'isa' ? 1.5 : 0.8;
          return (keep && (e.source === id || e.target === id)) ? (e.rel === 'isa' ? 3.0 : 2.6) : base;
        });
      gLabel.selectAll('.dlabel').style('opacity', (d) =>
        (showAllLocal || (keep && keep.has(d.id))) ? 1 : 0);
    }

    const zoomBehavior = d3zoom()
      .scaleExtent([0.4, 8])
      .on('zoom', (ev) => root.attr('transform', ev.transform));
    svg.call(zoomBehavior).on('dblclick.zoom', null);

    function fitTo(id) {
      const keep = new Set([id, ...(adj[id] || [])]);
      const ns = nodes.filter((n) => keep.has(n.id));
      const pad = 50;
      const minx = Math.min(...ns.map((n) => n.x)) - pad;
      const maxx = Math.max(...ns.map((n) => n.x)) + pad;
      const miny = Math.min(...ns.map((n) => n.y)) - pad;
      const maxy = Math.max(...ns.map((n) => n.y)) + pad;
      const k = Math.min(W / (maxx - minx), H / (maxy - miny), 4) * 0.92;
      const tx = W / 2 - k * (minx + maxx) / 2;
      const ty = H / 2 - k * (miny + maxy) / 2;
      svg.transition().duration(600)
        .call(zoomBehavior.transform, zoomIdentity.translate(tx, ty).scale(k));
    }

    if (resetRef.current) {
      resetRef.current.onclick = () =>
        svg.transition().duration(500).call(zoomBehavior.transform, zoomIdentity);
    }
    if (allLabelsRef.current) {
      allLabelsRef.current.onchange = (e) => {
        showAllLocal = e.target.checked;
        setShowAll(e.target.checked);
        setHi(null);
      };
      allLabelsRef.current.checked = showAllLocal;
    }

    return () => {
      svg.on('.zoom', null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, theme]);

  if (error)
    return <div className="ct-page"><div className="ct-status">Couldn’t load the graph data: {error}</div></div>;

  const title = data?.meta?.title || 'CHEP 2026 — Track 5';
  const legend = data?.legend || [];
  const talkCount = data?.nodes?.filter((n) => n.kind === 'talk').length || 0;
  const hullCount = data?.hulls?.length || 0;

  return (
    <div className="ct-page">
      <header className="ct-head">
        <h1>{title}</h1>
        <p className="ct-sub">
          Hover a dot to trace its links · hover or click a category to isolate it · scroll to zoom · click a dot to open the talk.
        </p>
      </header>

      <div className="ct-stage">
        {!data && !error && <div className="ct-status">Loading…</div>}
        <svg ref={svgRef} className="ct-svg" />

        {data && (
          <div className="ct-legend">
            <h4>Experiment</h4>
            {legend.map((e) => (
              <div key={e.label} className="ct-lrow">
                <span className="ct-sw" style={{ background: e.color }} />
                <span>{e.label}</span>
              </div>
            ))}
          </div>
        )}

        {data && (
          <div className="ct-tools">
            <label>
              <input ref={allLabelsRef} type="checkbox" defaultChecked={showAll} />
              show all names
            </label>
            <button ref={resetRef} type="button">reset view</button>
          </div>
        )}
      </div>

      {data && (
        <p className="ct-hint">
          {talkCount} talks · {hullCount} category regions · built for CHEP 2026 Track 5
        </p>
      )}
    </div>
  );
}
