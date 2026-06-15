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
import re
import sys
from collections import defaultdict
from datetime import date

HERE = os.path.dirname(__file__)
RAW = os.path.join(HERE, "cache", "chep_raw.json")
OUT = os.path.join(HERE, "..", "public", "data", "chep_graph.json")
EVENT_ID = 1471803

MIN_HUB = 3          # a keyword needs >= this many talks to become a hub node

# talk<->talk "related" edges now come from embedding similarity (embed_talks.py)
EMB_CACHE = os.path.join(HERE, "cache", "chep_embeddings.json")
SIM_TOP_K = 15       # mutual k-nearest neighbours per talk
SIM_MODEL = "openai/embeddinggemma-300m"   # must match embed_talks.MODEL
SIM_MIN = 0.0        # extra cosine floor; tune from --report distribution

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


# ─────────────────────────────────────────────────────────────────────────────
# Embedding-based related edges
# ─────────────────────────────────────────────────────────────────────────────
def load_embeddings():
    if not os.path.exists(EMB_CACHE):
        return None
    data = json.load(open(EMB_CACHE))
    return {k: v["v"] for k, v in data.get("items", {}).items()}


def related_from_embeddings(ordered_ids):
    """Mutual top-k cosine neighbours between talks. Returns (edges, stats).

    edges: list of (id_a, id_b, cosine).  Symmetric layout is unaffected --
    these are overlay links (force strength 0 in the renderer).
    """
    emb = load_embeddings()
    if not emb:
        print(f"WARNING: no embeddings at {EMB_CACHE}\n"
              f"         run  python tools/embed_talks.py  first — emitting NO related edges.")
        return [], None

    import numpy as np
    ids = [i for i in ordered_ids if i in emb]
    if len(ids) < 2:
        return [], None

    M = np.asarray([emb[i] for i in ids], dtype=np.float32)
    M /= np.linalg.norm(M, axis=1, keepdims=True) + 1e-9
    S = M @ M.T
    np.fill_diagonal(S, -1.0)                      # never self-link

    k = min(SIM_TOP_K, len(ids) - 1)
    topk = np.argpartition(-S, kth=k - 1, axis=1)[:, :k]
    nbr = [set(row.tolist()) for row in topk]
    edges = {}
    for i in range(len(ids)):
        for j in topk[i]:
            if S[i, j] < SIM_MIN:
                continue
            if i in nbr[j]:                         # keep only mutual pairs
                a, b = (i, j) if i < j else (j, i)
                edges[(a, b)] = max(edges.get((a, b), 0.0), float(S[i, j]))

    out = [(ids[a], ids[b], s) for (a, b), s in edges.items()]
    top1 = S.max(axis=1)
    stats = {
        "n": len(ids),
        "edges": len(out),
        "top1": np.percentile(top1, [50, 75, 90, 99]).round(3).tolist(),
        "kept": np.percentile([s for *_, s in out], [50, 75, 90, 99]).round(3).tolist() if out else [],
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
    for c in contribs:
        title = clean_text(c.get("title"))
        abstract = clean_text(c.get("description"))
        if not title:
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

    # talk <-> talk "related" edges from embedding similarity (mutual top-k).
    # Keyword extraction above still powers the topic filter / tags / search.
    related, rel_stats = related_from_embeddings([n["id"] for n in nodes])
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

    if report:
        if rel_stats:
            deg = 2 * rel_stats["edges"] / rel_stats["n"]
            print(f"\nEmbedding related edges (mutual top-{SIM_TOP_K}, floor={SIM_MIN}):")
            print(f"  talks embedded: {rel_stats['n']}   edges: {rel_stats['edges']}   mean degree: {deg:.1f}")
            print(f"  per-talk top-1 cosine  p50/75/90/99: {rel_stats['top1']}")
            print(f"  kept-edge cosine       p50/75/90/99: {rel_stats['kept']}")
        print("\nTop topics (dropdown):")
        for k in topics[:30]:
            print(f"  {k['count']:3d}  {k['name']}")
        print(f"\n{len(no_topic)} talks matched NO topic:")
        for t in no_topic:
            print("  -", t)


if __name__ == "__main__":
    main()
