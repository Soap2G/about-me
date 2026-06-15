#!/usr/bin/env python3
"""Embed every CHEP 2026 talk with the CERN-served E5 model.

Reads  tools/cache/chep_raw.json     (produced by fetch_chep.py)
Writes tools/cache/chep_embeddings.json   (consumed by build_graph.py)

The endpoint is OpenAI-compatible (LiteLLM model `e5-large-v2`, mode=embedding),
so we talk to it with the openai SDK pointed at its api_base. Auth is a bearer
token read from the CERN_ML_TOKEN env var (put it in a gitignored `.env`).

E5 note: the model REQUIRES a task prefix on every input. For *symmetric*
similarity (talk<->talk, no query/document asymmetry) the convention is to use
the "query: " prefix on both sides -- skipping it measurably degrades vectors.

Vectors are cached keyed by talk id + a hash of the embedded text, so re-runs
only touch new/changed talks. The cache never enters the public JSON.
"""
import hashlib
import json
import os
import sys
import time

from openai import OpenAI

# reuse the builder's text cleaning + raw-cache path so ids/text stay identical
from build_graph import clean_text, RAW

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ENV_PATH = os.path.join(ROOT, ".env")
EMB_CACHE = os.path.join(HERE, "cache", "chep_embeddings.json")

API_BASE = os.environ.get("CERN_ML_API_BASE", "https://llmgw-litellm.web.cern.ch/v1")
MODEL = os.environ.get("CERN_ML_MODEL", "openai/embeddinggemma-300m")
TOKEN_VAR = "CERN_ML_TOKEN"

E5_PREFIX = "query: "   # symmetric-similarity prefix (both sides)
BATCH = 32
MAX_CHARS = 2000        # ~512-token E5 window; keeps title+abstract in range


def load_env(path):
    """Minimal .env loader (no dependency); does not override real env vars."""
    if not os.path.exists(path):
        return
    for raw in open(path):
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def _hash(s):
    return hashlib.sha1(s.encode("utf-8")).hexdigest()


def embed_batch(client, texts):
    for attempt in range(3):
        try:
            resp = client.embeddings.create(model=MODEL, input=texts)
            return [d.embedding for d in sorted(resp.data, key=lambda d: d.index)]
        except Exception as e:  # transient serving hiccups -> back off and retry
            if attempt == 2:
                raise
            print(f"  retry {attempt + 1} after error: {e}")
            time.sleep(2 * (attempt + 1))


def main():
    load_env(ENV_PATH)
    token = os.environ.get(TOKEN_VAR)
    if not token:
        sys.exit(f"Missing {TOKEN_VAR}: put it in {ENV_PATH} as `{TOKEN_VAR}=...` or export it.")

    raw = json.load(open(RAW))
    contribs = raw["results"][0].get("contributions", [])

    items = []
    for c in contribs:
        title = clean_text(c.get("title"))
        if not title:
            continue
        abstract = clean_text(c.get("description"))
        text = (E5_PREFIX + f"{title}\n{abstract}").strip()[:MAX_CHARS]
        items.append((f"c{c.get('id')}", text))

    cache = json.load(open(EMB_CACHE)) if os.path.exists(EMB_CACHE) else {}
    if cache.get("model") != MODEL:        # model changed -> stale vectors
        cache = {"model": MODEL, "items": {}}
    store = cache.setdefault("items", {})

    todo = [(cid, t) for cid, t in items if store.get(cid, {}).get("h") != _hash(t)]
    print(f"{len(items)} talks · {len(items) - len(todo)} cached · {len(todo)} to embed via {MODEL}")

    if todo:
        client = OpenAI(base_url=API_BASE, api_key=token)
        for s in range(0, len(todo), BATCH):
            chunk = todo[s:s + BATCH]
            vecs = embed_batch(client, [t for _, t in chunk])
            for (cid, t), v in zip(chunk, vecs):
                store[cid] = {"h": _hash(t), "v": v}
            print(f"  embedded {min(s + BATCH, len(todo))}/{len(todo)}")

    # drop ids that left the programme
    valid = {cid for cid, _ in items}
    for dead in [k for k in store if k not in valid]:
        del store[dead]

    cache["dim"] = len(next(iter(store.values()))["v"]) if store else 0
    os.makedirs(os.path.dirname(EMB_CACHE), exist_ok=True)
    json.dump(cache, open(EMB_CACHE, "w"))
    print(f"wrote {EMB_CACHE}  ({os.path.getsize(EMB_CACHE):,} bytes, dim={cache['dim']})")


if __name__ == "__main__":
    main()
