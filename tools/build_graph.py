#!/usr/bin/env python3
"""Build the CHEP 2026 knowledge graph from the cached Indico export.

Reads  tools/cache/chep_raw.json   (produced by fetch_chep.py)
Writes src/data/chep_graph.json    (consumed by the /chep2026 React page)

Approach: METADATA + KEYWORDS only -- no ML / embeddings.
  * Each contribution becomes a "talk" node.
  * Keywords are extracted by matching titles+abstracts against a controlled
    HEP-computing vocabulary (TOPICS below). Indico's own keyword field is
    empty for every contribution, so this extractor does all the work.
  * Frequent keywords become "keyword" hub nodes (the Obsidian-style tags);
    talks link to their hubs (talk->keyword "member" edges) -- this is the
    backbone of the force graph.
  * talk<->talk "related" edges connect contributions that share >=2 topics
    (or a topic + the same experiment), pruned to the top few per talk. These
    are the cross-track "strings" we'll lean on for the Board view later.

The TOPICS and EXPERIMENTS dicts are meant to be edited by a domain expert --
add aliases, split/merge hubs, prune noise. Run with --report to see coverage
and the talks that matched nothing.
"""
import html
import json
import os
import random
import re
import sys
from collections import defaultdict
from datetime import date

HERE = os.path.dirname(__file__)
RAW = os.path.join(HERE, "cache", "chep_raw.json")
OUT = os.path.join(HERE, "..", "public", "data", "chep_graph.json")
EVENT_ID = 1471803

MIN_HUB = 3          # a keyword needs >= this many talks to become a hub node

# talk<->talk "related" edges: hybrid of embedding similarity + keyword overlap
EMB_CACHE = os.path.join(HERE, "cache", "chep_embeddings.json")
SIM_TOP_K = 6        # related neighbours kept per talk (top-k union, not mutual)
SIM_ALPHA = 0.6      # weight: 1.0 = pure embedding, 0.0 = pure keyword overlap
SIM_MIN = 0.0        # floor on the combined score (tune from --report)
SIM_MAX_DEGREE = 12  # cap edges per talk to tame hubs (0 = uncapped)

# ─────────────────────────────────────────────────────────────────────────────
# Controlled vocabulary.  topic label -> list of aliases.
# Short ALL-CAPS aliases (<=6 chars, e.g. GNN, FPGA, ET) match case-sensitively
# to avoid false hits ("ET" vs "et al."); everything else is case-insensitive.
# ─────────────────────────────────────────────────────────────────────────────
TOPICS = {
    # ── Machine learning methods ──
    "GNN": ["graph neural network", "graph neural networks", "GNN", "GNNs", "GNN4ITk", "message passing"],
    "Transformers": ["transformer", "transformers", "attention mechanism", "foundation model", "self-supervised", "self-distillation"],
    "Generative models": ["generative", "GAN", "GANs", "diffusion model", "flow-matching", "normalizing flow", "WGAN", "variational autoencoder", "DiT-based"],
    "Anomaly detection": ["anomaly detection", "autoencoder", "autoencoders"],
    "LLM / agents": ["large language model", "LLM", "LLMs", "ChatGPT", "agentic", "AI assistant", "AI agent", "retrieval-augmented", "RAG", "chatbot", "copilot", "MCP server"],
    "Reinforcement learning": ["reinforcement learning"],
    "Simulation-based inference": ["simulation-based inference", "simulation based inference", "SBI", "likelihood-free", "neural simulation"],
    "Differentiable / autodiff": ["differentiable", "automatic differentiation", "autodiff", "gradient-based", "JAX"],
    "Active learning": ["active learning"],
    "ML inference serving": ["inference as a service", "inference-as-a-service", "inference server", "as a service", "SOFIE", "Triton", "ONNX"],
    # ── Reconstruction / detector ──
    "Track reconstruction": ["track reconstruction", "tracking", "ACTS", "traccc", "vertexing", "vertex reconstruction", "track finding", "Kalman", "Hough transform", "seed finding"],
    "Event reconstruction": ["particle flow", "flavour tagging", "flavor tagging", "jet tagging", "particle identification", "RICH ring", "cluster finding", "calorimeter clustering"],
    "Calorimeter": ["calorimeter", "calorimeters", "shower", "HGCal", "high-granularity"],
    "Detector design": ["detector design", "detector optimization", "detector optimisation"],
    "Calibration / alignment": ["calibration", "alignment", "conditions data", "conditions database"],
    "Data quality": ["data quality", "DQM", "quality monitoring", "certification"],
    # ── Trigger / DAQ / online ──
    "Trigger": ["trigger", "triggers", "L0", "L1 trigger", "level-0", "level-1", "high-level trigger", "HLT", "data scouting"],
    "Real-time / online": ["real-time", "real time", "online processing", "online computing", "40 MHz", "low-latency", "low latency", "streaming readout"],
    "FPGA": ["FPGA", "FPGAs", "hls4ml", "Versal", "AI engine", "firmware"],
    "DAQ": ["data acquisition", "DAQ", "readout"],
    # ── Simulation / generation ──
    "Fast simulation": ["fast simulation", "fast sim", "FastSim", "FlashSim", "fast calorimeter", "fast and flash"],
    "Geant4 / transport": ["Geant4", "AdePT", "Opticks", "detector simulation", "VecGeom", "transport code", "optical photon"],
    "Event generation": ["event generation", "MadGraph", "Sherpa", "Pythia", "matrix element", "MC@NLO", "Powheg", "negative weight", "PEPPER", "Rivet"],
    "Geometry": ["geometry", "DD4hep", "detector geometry"],
    # ── Data management / storage ──
    "Rucio": ["Rucio", "data lake", "datalake", "MADDEN"],
    "Data transfer": ["FTS", "FTS3", "FTS4", "third-party copy", "data movement", "transfer service", "data challenge", "DC27", "DC24", "SENSE", "Globus"],
    "XRootD": ["XRootD", "redirector", "data federation", "Pelican", "OSDF"],
    "Storage systems": ["EOS", "dCache", "CTA", "tape", "StoRM", "object storage", "Ceph", "CERNBox", "CernVM-FS", "CVMFS"],
    "RNTuple / ROOT I/O": ["RNTuple", "ROOT I/O", "ROOT file", "TTree", "persistency", "columnar", "data format"],
    "Conditions / metadata DB": ["EventIndex", "CREST", "conditions database", "metadata", "metadata management"],
    "Compression": ["compression", "lossy", "lossless", "compressor"],
    # ── Distributed computing / workflow ──
    "Workflow management": ["workflow management", "workflow manager", "workflow orchestration", "PanDA", "DIRAC", "DiracX", "Harvester", "JustIN", "CWL", "production system", "luigi", "Snakemake", "REANA"],
    "Grid / WLCG": ["WLCG", "grid site", "the grid", "EGI", "Tier-1", "Tier-2", "Tier-0", "Tier 1", "Tier 2", "CRIC", "GGUS"],
    "Batch / scheduling": ["HTCondor", "batch system", "scheduling", "fair-share", "job slot", "whole-node", "Slurm"],
    "Kubernetes / cloud": ["Kubernetes", "k8s", "cloud-native", "container", "OKD", "OpenShift", "cloud computing"],
    "HPC": ["HPC", "supercomputer", "exascale", "superfacility", "NERSC", "high-performance computing", "high performance computing"],
    "GPU / heterogeneous": ["GPU", "GPUs", "CUDA", "ROCm", "HIP", "alpaka", "SYCL", "heterogeneous", "accelerator", "portability", "GPU kernel"],
    # ── Analysis ──
    "RDataFrame": ["RDataFrame"],
    "Columnar (Coffea/Awkward)": ["Coffea", "Awkward Array", "awkward", "uproot", "scikit-hep", "columnar analysis"],
    "Analysis facility": ["analysis facility", "analysis facilities", "Coffea-Casa", "virtual research environment", "VRE", "JupyterHub", "BinderHub", "SWAN"],
    "ServiceX": ["ServiceX"],
    "Statistics / fitting": ["RooFit", "Combine tool", "statistical inference", "likelihood", "pyhf", "limit setting", "hypothesis test", "EFT"],
    "Histogramming": ["histogram", "histograms", "histogramming", "boost-histogram"],
    "Reproducibility": ["reproducib", "reproducible analysis", "analysis preservation", "preservation"],
    # ── Software environment ──
    "C++ / language": ["C++", "C++26", "C++20", "std::simd", "metaprogramming", "compile-time"],
    "Python interop": ["PyROOT", "cppyy", "CppInterOp", "pybind", "Python bindings", "Python interface"],
    "Other languages": ["Julia", "Rust", "Mojo"],
    "Frameworks": ["Gaudi", "Key4hep", "Athena", "CMSSW", "FairRoot", "Gaussino", "Marlin"],
    "Testing / CI": ["unit test", "unit testing", "property-based", "continuous integration", "static analysis", "static checker"],
    "Packaging": ["conda-forge", "Spack", "packaging", "package manager", "distribution"],
    # ── Infrastructure / ops ──
    "Networking": ["networking", "IPv6", "IPv4", "WAN", "wide-area network", "wide area network", "packet marking", "scitags", "SciTags", "routing", "perfSONAR", "bandwidth", "terabit", "Gbps", "network traffic", "network link", "LHCOPN", "LHCONE"],
    "Sustainability / energy": ["sustainability", "energy efficiency", "carbon", "power consumption", "CO2", "CO₂", "cooling", "heat reuse", "watt", "low power"],
    "Monitoring": ["monitoring", "observability", "Grafana", "alarms", "accounting", "MONIT", "dashboard", "AUDITOR"],
    "Security / auth": ["authentication", "authorisation", "authorization", "IAM", "OAuth", "token-based", "tokens", "vulnerability", "SBOM", "federated identit"],
    "Benchmarking": ["benchmark", "HEPScore", "HEPScore23"],
    "Quantum computing": ["quantum computing", "quantum algorithm", "QSVM", "quantum support vector", "quantum machine learning", "entanglement"],
    # ── Programmes / outreach ──
    "Open data / FAIR": ["open data", "FAIR data", "FAIR ", "open science"],
    "Training / education": ["training", "tutorial", "education", "teaching", "pedagogical", "hackathon"],
    "Visualization": ["visualization", "visualisation", "event display", "Phoenix", "Fireworks"],
    # ── Era / programme tags ──
    "HL-LHC": ["HL-LHC", "high-luminosity", "high luminosity", "Run 4", "Run-4", "Phase-2", "Phase II"],
    "Run 3": ["Run 3", "Run-3"],
}

# Experiments / facilities -> aliases.  Used as a coloring/filter facet (not hubs).
EXPERIMENTS = {
    "ATLAS": ["ATLAS", "Atlas"],
    "CMS": ["CMS"],
    "LHCb": ["LHCb"],
    "ALICE": ["ALICE"],
    "Belle II": ["Belle II", "Belle-II", "Belle 2"],
    "BESIII": ["BESIII", "BES III"],
    "JUNO": ["JUNO"],
    "DUNE": ["DUNE"],
    "IceCube": ["IceCube"],
    "sPHENIX": ["sPHENIX"],
    "STAR / RHIC": ["RHIC", "STAR experiment"],
    "ePIC / EIC": ["ePIC", "EIC"],
    "SKA / SRCNet": ["SKA", "SRCNet", "SRC Net"],
    "Rubin / LSST": ["Rubin", "LSST"],
    "Einstein Telescope": ["Einstein Telescope"],
    "CTA": ["CTAO", "CTLearn", "IACT"],
    "FCC": ["FCC", "FCCAnalyses"],
    "CEPC": ["CEPC"],
    "KM3NeT": ["KM3NeT"],
    "CBM": ["CBM experiment"],
    "COMET": ["COMET"],
    "LZ": ["LZ Dark Matter", "LZ experiment"],
    "Daya Bay": ["Daya Bay"],
    "JLab": ["Jefferson Lab", "JLab"],
    "Gravitational waves": ["gravitational wave", "gravitational-wave", "LIGO", "Virgo"],
}

OWN_SURNAME = "Guerrieri"   # talks (co)authored/presented by the site owner

TRACK_META = {
    # short, color  -- T1/T4/T7/T8/Plenary keep the owner's original palette
    "Plenary": ("Plenary", "#3a4858"),
    "T1": ("T1", "#8c6030"),
    "T2": ("T2", "#b1554c"),
    "T3": ("T3", "#45748f"),
    "T4": ("T4", "#3a7082"),
    "T5": ("T5", "#a8862f"),
    "T6": ("T6", "#565b9e"),
    "T7": ("T7", "#3d7530"),
    "T8": ("T8", "#6a5090"),
    "T9": ("T9", "#a85f7a"),
    "Other": ("Other", "#6b7280"),
}

# ─────────────────────────────────────────────────────────────────────────────
# Matching engine
# ─────────────────────────────────────────────────────────────────────────────
def _is_acronym(a):
    return a == a.upper() and any(c.isalpha() for c in a) and len(a) <= 6


def _boundary_regex(aliases, flags):
    if not aliases:
        return None
    body = "|".join(re.escape(a) for a in sorted(set(aliases), key=len, reverse=True))
    return re.compile(r"(?<![A-Za-z0-9])(?:" + body + r")(?![A-Za-z0-9])", flags)


class Matcher:
    def __init__(self, vocab):
        self.compiled = {}
        for label, aliases in vocab.items():
            cs = [a for a in aliases if _is_acronym(a)]
            ci = [a for a in aliases if not _is_acronym(a)]
            self.compiled[label] = (_boundary_regex(cs, 0), _boundary_regex(ci, re.IGNORECASE))

    def match(self, text):
        out = []
        for label, (csr, cir) in self.compiled.items():
            if (csr and csr.search(text)) or (cir and cir.search(text)):
                out.append(label)
        return out


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────
TAG_RE = re.compile(r"<[^>]+>")
WS_RE = re.compile(r"\s+")


def clean_text(s):
    if not s:
        return ""
    s = TAG_RE.sub(" ", s)
    s = html.unescape(s)
    return WS_RE.sub(" ", s).strip()


def person(p):
    full = p.get("fullName") or ""
    if ", " in full:
        last, first = full.split(", ", 1)
        name = f"{first} {last}".strip()
    else:
        name = full or f"{p.get('first_name','')} {p.get('last_name','')}".strip()
    return {"name": name, "affiliation": p.get("affiliation") or ""}


def day_label(d):
    try:
        y, m, dd = (int(x) for x in d.split("-"))
        return date(y, m, dd).strftime("%a %d")
    except Exception:
        return d or ""


def hhmm(t):
    return (t or "")[:5]


def track_key(track, session):
    src = track or session or ""
    m = re.search(r"Track\s+(\d+)", src)
    if m:
        return f"T{m.group(1)}"
    label = (session or track or "").strip().lower()
    if "plenary" in label or "opening" in label or "closing" in label:
        return "Plenary"
    return "Other"


def track_num_key(track):
    """The 'T<n>' key embedded in a track string (e.g. 'Track 4 - ...'), or None."""
    m = re.search(r"Track\s+(\d+)", track or "")
    return f"T{m.group(1)}" if m else None


def talk_type(type_str, session):
    t = (type_str or "").lower()
    s = (session or "").lower()
    if "poster" in t or s == "poster":
        return "poster"
    if "plenary" in t or s == "plenary":
        return "plenary"
    return "talk"


# Non-talk logistics entries (ceremonies, social, admin) — kept out of the graph.
# Titles are anchored at the start so generic words ("lunch", "registration") can't
# false-match a real talk mid-title. Conference Summaries are intentionally kept.
SKIP_TITLE_RE = re.compile(
    r"^(?:"
    r"welcome|announcement|closing ceremon|opening ceremon|closing remarks|"
    r"conference (?:dinner|photo|excursion)|how to go there|your survival guide|"
    r"group photo|poster session awards|registration|coffee break|lunch|excursion|"
    r"q\s*[/&]\s*a\b|29th conference on computing|welcome reception|"
    r"social (?:event|programme|dinner)|wrap[- ]?up|group picture"
    r")",
    re.IGNORECASE,
)


def is_logistics(title):
    return bool(SKIP_TITLE_RE.match((title or "").strip()))


# ─────────────────────────────────────────────────────────────────────────────
# Embedding-based related edges
# ─────────────────────────────────────────────────────────────────────────────
def load_embeddings():
    if not os.path.exists(EMB_CACHE):
        return None
    data = json.load(open(EMB_CACHE))
    return {k: v["v"] for k, v in data.get("items", {}).items()}


def _keyword_sim(ka, kb):
    """Jaccard overlap of two keyword lists, in [0, 1]."""
    if not ka or not kb:
        return 0.0
    sa, sb = set(ka), set(kb)
    inter = len(sa & sb)
    return inter / len(sa | sb) if inter else 0.0


def related_from_embeddings(talk_nodes):
    """Hybrid (embedding + keyword) related edges. Returns (edges, stats).

    Pipeline: centre the vectors (de-anisotropy spreads the squished cosines),
    then score EVERY pair by α·semantic + (1-α)·keyword-overlap and keep each
    talk's top-k (UNION, so nothing is orphaned), then cap degree to tame hubs.
    Scoring all pairs (not just an embedding-nearest pool) is deliberate: it
    lets keyword-strong but embedding-distant pairs link — e.g. two MadGraph-GPU
    talks the small model ranks 100+ apart but that share Event-generation+GPU.
    Edges are layout-neutral overlay links.
    """
    emb = load_embeddings()
    if not emb:
        print(f"WARNING: no embeddings at {EMB_CACHE}\n"
              f"         run  python tools/embed_talks.py  first — emitting NO related edges.")
        return [], None

    import numpy as np
    nodes = [n for n in talk_nodes if n["id"] in emb]
    if len(nodes) < 2:
        return [], None
    ids = [n["id"] for n in nodes]
    kws = [n.get("keywords") or [] for n in nodes]
    n = len(ids)

    M = np.asarray([emb[i] for i in ids], dtype=np.float32)
    M -= M.mean(axis=0, keepdims=True)             # centre: kill the common component
    M /= np.linalg.norm(M, axis=1, keepdims=True) + 1e-9
    S = M @ M.T
    np.fill_diagonal(S, -2.0)                       # never self-link
    lo, hi = float(S[S > -2].min()), float(S.max())
    Snorm = (S - lo) / (hi - lo + 1e-9)            # semantic term -> [0, 1]

    # keyword Jaccard over all pairs, vectorised (binary talk x vocab matrix)
    vocab = {}
    for kk in kws:
        for k in kk:
            vocab.setdefault(k, len(vocab))
    K = np.zeros((n, len(vocab) or 1), dtype=np.float32)
    for i, kk in enumerate(kws):
        for k in kk:
            K[i, vocab[k]] = 1.0
    inter = K @ K.T
    ksum = K.sum(axis=1)
    union = ksum[:, None] + ksum[None, :] - inter
    with np.errstate(divide="ignore", invalid="ignore"):
        J = np.where(union > 0, inter / union, 0.0)   # keyword term -> [0, 1]

    C = SIM_ALPHA * Snorm + (1 - SIM_ALPHA) * J       # combined score, all pairs
    np.fill_diagonal(C, -1.0)

    # each talk's top-k by combined score
    k = min(SIM_TOP_K, n - 1)
    topk = np.argpartition(-C, kth=k - 1, axis=1)[:, :k]
    edges = {}
    for i in range(n):
        for j in topk[i]:
            c = float(C[i, j])
            if c < SIM_MIN:
                continue
            a, b = (i, int(j)) if i < j else (int(j), i)
            edges[(a, b)] = max(edges.get((a, b), 0.0), c)

    # greedy degree cap: add strongest edges first, skip if either end is saturated
    if SIM_MAX_DEGREE:
        deg = defaultdict(int)
        capped = {}
        for (a, b), c in sorted(edges.items(), key=lambda kv: -kv[1]):
            if deg[a] < SIM_MAX_DEGREE and deg[b] < SIM_MAX_DEGREE:
                capped[(a, b)] = c
                deg[a] += 1
                deg[b] += 1
        edges = capped

    out = [(ids[a], ids[b], c) for (a, b), c in edges.items()]
    orphans = len(ids) - len({x for a, b, _ in out for x in (a, b)})
    stats = {
        "n": len(ids),
        "edges": len(out),
        "orphans": orphans,
        "score": np.percentile([c for *_, c in out], [50, 75, 90, 99]).round(3).tolist() if out else [],
    }
    return out, stats


# ─────────────────────────────────────────────────────────────────────────────
# Build
# ─────────────────────────────────────────────────────────────────────────────
def main():
    report = "--report" in sys.argv
    raw = json.load(open(RAW))
    event = raw["results"][0]
    contribs = event.get("contributions", [])

    topics = Matcher(TOPICS)
    exps = Matcher(EXPERIMENTS)

    nodes = []
    no_topic = []
    skipped = []
    for c in contribs:
        title = clean_text(c.get("title"))
        abstract = clean_text(c.get("description"))
        if not title:
            continue
        if is_logistics(title):           # ceremonies / social / admin, not a talk
            skipped.append(title)
            continue
        haystack = f"{title}\n{abstract}"
        kw = topics.match(haystack)
        ex = exps.match(haystack)

        people = [person(p) for p in (c.get("speakers") or [])]
        all_people = (c.get("speakers") or []) + (c.get("primaryauthors") or []) + (c.get("coauthors") or [])
        own = any((p.get("last_name") or "") == OWN_SURNAME for p in all_people)

        sd, ed = c.get("startDate") or {}, c.get("endDate") or {}
        # plenary presentations are filed under the Plenary hub but keep a link
        # to their "corresponding" track (the track Indico assigns them)
        is_plenary = (c.get("type") or "") == "Plenary Presentation"
        tkey = "Plenary" if is_plenary else track_key(c.get("track"), c.get("session"))
        corr = track_num_key(c.get("track")) if is_plenary else None
        node = {
            "id": f"c{c.get('id')}",
            "type": "talk",
            "fid": c.get("friendly_id"),
            "title": title,
            "abstract": abstract,
            "speakers": people,
            "track": c.get("track") or c.get("session") or "",
            "trackKey": tkey,
            "corrTrack": corr,
            "session": c.get("session") or "",
            "talkType": talk_type(c.get("type"), c.get("session")),
            "day": day_label(sd.get("date", "")),
            "date": sd.get("date", ""),
            "start": hhmm(sd.get("time")),
            "end": hhmm(ed.get("time")),
            "room": c.get("room") or "",
            "url": c.get("url") or "",
            "keywords": kw,
            "experiments": ex,
            "own": own,
        }
        nodes.append(node)
        if not kw:
            no_topic.append(title)

    # topic list (keywords shared by >= MIN_HUB talks) -> dropdown filter in the UI
    topic_index = defaultdict(list)
    for n in nodes:
        for t in n["keywords"]:
            topic_index[t].append(n["id"])
    topics = sorted(
        ({"name": t, "count": len(ids)} for t, ids in topic_index.items() if len(ids) >= MIN_HUB),
        key=lambda d: -d["count"],
    )

    # track metadata actually present
    present = []
    for key in TRACK_META:
        short, color = TRACK_META[key]
        # numbered tracks share one canonical title; Plenary/Other are fixed
        if key.startswith("T"):
            full = next((n["track"] for n in nodes if n["trackKey"] == key and n["track"]), short)
        else:
            full = short
        count = sum(1 for n in nodes if n["trackKey"] == key)
        if count:
            present.append({"key": key, "short": short, "color": color, "label": full, "count": count})

    # track hub nodes — the structural centres of the graph; talks orbit their track
    track_nodes = [
        {"id": f"trk:{t['key']}", "type": "track", "key": t["key"], "short": t["short"],
         "label": t["label"], "color": t["color"], "count": t["count"]}
        for t in present
    ]

    # talk -> track membership edges (define the layout: clusters per track)
    links = [{"source": n["id"], "target": f"trk:{n['trackKey']}", "type": "member"} for n in nodes]

    # plenary talks -> their corresponding track hub (special highlighted cross-links)
    for n in nodes:
        if n.get("corrTrack"):
            links.append({"source": n["id"], "target": f"trk:{n['corrTrack']}", "type": "plenary"})

    # talk <-> talk "related" edges: hybrid embedding + keyword (related_from_embeddings).
    # Keyword extraction above still powers the topic filter / tags / search.
    related, rel_stats = related_from_embeddings(nodes)
    for a, b, sim in related:
        links.append({"source": a, "target": b, "type": "related", "weight": round(sim, 4)})

    graph = {
        "meta": {
            "event": "CHEP 2026",
            "url": f"https://indico.cern.ch/event/{EVENT_ID}/",
            "generated": raw.get("ts"),
            "tracks": present,
            "topics": topics,
            "counts": {
                "talks": len(nodes),
                "trackHubs": len(track_nodes),
                "topics": len(topics),
                "memberEdges": sum(1 for l in links if l["type"] == "member"),
                "relatedEdges": sum(1 for l in links if l["type"] == "related"),
                "plenaryEdges": sum(1 for l in links if l["type"] == "plenary"),
            },
        },
        "nodes": nodes + track_nodes,
        "links": links,
    }

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(graph, open(OUT, "w"), ensure_ascii=False, indent=None)
    size = os.path.getsize(OUT)

    print(f"talks={len(nodes)}  track-hubs={len(track_nodes)}  topics={len(topics)}  "
          f"member-edges={graph['meta']['counts']['memberEdges']}  "
          f"related-edges={graph['meta']['counts']['relatedEdges']}  "
          f"plenary-edges={graph['meta']['counts']['plenaryEdges']}")
    print(f"wrote {OUT}  ({size:,} bytes)")
    print(f"topic coverage: {len(nodes) - len(no_topic)}/{len(nodes)} talks matched >=1 topic")
    print(f"skipped {len(skipped)} non-talk logistics entries")

    if report:
        byid = {n["id"]: n for n in nodes}
        radj = defaultdict(list)
        for l in links:
            if l["type"] == "related":
                radj[l["source"]].append((l["target"], l["weight"]))
                radj[l["target"]].append((l["source"], l["weight"]))

        def show(node_list, label, topn=6):
            print(f"\n{label}:")
            for n in node_list:
                nb = sorted(radj.get(n["id"], []), key=lambda x: -x[1])
                print(f"  • [{len(nb)}] ({n.get('trackKey')}) {n['title'][:56]}")
                for tid, w in nb[:topn]:
                    o = byid[tid]
                    x = "*" if o.get("trackKey") != n.get("trackKey") else " "  # * = cross-track
                    print(f"      {w:.3f} {x}({o.get('trackKey'):>7}) {o['title'][:46]}")

        if rel_stats:
            related_edges = [l for l in links if l["type"] == "related"]
            ne = len(related_edges)
            cross = sum(1 for l in related_edges
                        if byid[l["source"]]["trackKey"] != byid[l["target"]]["trackKey"])
            kwshare = sum(1 for l in related_edges
                          if set(byid[l["source"]].get("keywords") or [])
                          & set(byid[l["target"]].get("keywords") or []))
            degs = sorted(len(radj.get(n["id"], [])) for n in nodes)
            print(f"\nRelated edges (hybrid α={SIM_ALPHA}, top-{SIM_TOP_K} union, cap={SIM_MAX_DEGREE}):")
            print(f"  talks {rel_stats['n']}  edges {ne}  mean-deg {2 * ne / rel_stats['n']:.1f}  "
                  f"deg min/med/max {degs[0]}/{degs[len(degs) // 2]}/{degs[-1]}  orphans {rel_stats['orphans']}")
            print(f"  cross-track {cross / ne:.0%}  share>=1 keyword {kwshare / ne:.0%}  "
                  f"(semantic-only {1 - kwshare / ne:.0%})  score p50/75/90/99 {rel_stats['score']}")

            show([n for n in nodes if n.get("own")], "Own talks")

            # whole-graph spot check: one random talk per track (* marks cross-track links)
            rng = random.Random(20260615)
            by_track = defaultdict(list)
            for n in nodes:
                by_track[n.get("trackKey")].append(n)
            show([rng.choice(v) for _, v in sorted(by_track.items())], "Random spread (1 per track)", topn=5)

            # stress test: no-keyword talks rely purely on the embedding signal
            nokw = [n for n in nodes if not n.get("keywords")]
            if nokw:
                show(rng.sample(nokw, min(6, len(nokw))), "No-keyword talks (semantic-only)", topn=5)

        # targeted lookup:  python tools/build_graph.py --report --talk=rucio
        q = next((a.split("=", 1)[1].lower() for a in sys.argv if a.startswith("--talk=")), None)
        if q:
            show([n for n in nodes if q in n["title"].lower()], f"--talk match: '{q}'", topn=8)

        print("\nTop topics (dropdown):")
        for k in topics[:30]:
            print(f"  {k['count']:3d}  {k['name']}")
        print(f"\n{len(no_topic)} talks matched NO topic:")
        for t in no_topic:
            print("  -", t)
        print(f"\n{len(skipped)} skipped as non-talk logistics:")
        for t in skipped:
            print("  -", t)


if __name__ == "__main__":
    main()
