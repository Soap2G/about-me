
Physicists are lazy, and very picky.

When one creates a service or a resource, they usually should bear in mind that it's either success or failure. 
If it's a success, then physicists will jump on board, and they will expect it to work. If for any reason it doesn't work anymore, there's very little wiggle room before they look for alternatives.
If it's a failure, then physicists won't use it, they will move on, and they won't come back unless forced to.

Physicists are not computer scientists, nor do they want to be. They want to do physics, *fast*.

Before I start ranting, I'm not going to talk about AI assistants to do research, I'm going to talk about AI assistants to help physicists navigate the operational landscape of CERN's computing services.

I've seen about 80 attempts at building an AI assistant for CERN in the last two years. We're close to 90 now.

About a third of them are the same idea in a different box: ingest the team's docs into a vector store, put a chat UI on top, ask IT for a GPU quota. A few of those converged into shared platforms, which is the right outcome.

I have kind of a strong opinion on RAG. It's very powerful, but it is expensive. You have to build a vector store, you have to build an embedding pipeline, and you have to scrape the knowledge base and keep it up to date.

I want to step down a second, try to reply to this question:
> **Can we just limit ourselves to writing good documentation and have something that reads it like a human would?**

That would relieve us from a bunch of engineering overhead, that we cannot afford because we're mostly doing it on a best effort basis. In the end, an AI assistant should be like a person, but not lazy.

Another way to read the question could be: do we need RAG, or fancy frameworks to have a useful assistant? Where is the threshold of "good enough for a physicist"?

### Constants and variables

Since we're dealing with a technology that evolves way faster than I can keep up with, I think it is important to start by figuring out what in the development is worth considering as a constant, and what a variable. 
A constant is something that will likely stay around for a while, like the MCP server idea, or markdown-based skills.
A variable is something that is undergoing the "real world" hype, like LLM providers, models available, UI frontends, etc.

I would like to stay away from variables. After a while it feels like playing whack-a-mole. 

So let's try to focus on the constants. Also, how can I be as lazy as possible? (in the end, we are physicists)

Something that I personally believe *can* be sustainable is:
> a wrapper around an LLM provider (which is a variable), with a skill system on top that allows teams to write skills describing how to use their service, and the assistant can read those files and answer questions about it based on the documentation that needs to be written anyway.

Lumi is built around [OpenCode](https://github.com/anomalyco/opencode); I picked OpenCode, but it can actually be anything that accepts an agentic structure like the one that Claude Code proposes, which is the following: 
```
lumi-assistant/
├── config/
│   ├── AGENTS.md          ← top-level persona and routing rules
│   ├── opencode.json      ← LLM providers, MCP servers, permissions
│   └── skills/
│       ├── access/        ← rucio, physlite-basics
│       ├── compute/       ← reana, reana-workflows
│       ├── discover/      ← atlas-opendata, cern-opendata
│       └── infra-advisor/ ← cross-category routing
└── bin/
    └── setup.sh
```

To make lumi work, one needs an endpoint connected to a bunch of LLMs, and an API key.
It's not my business to manage which models are behind it, and I can switch to something else if needed.

I've put it in CVMFS, because that's the laziest way to deploy a CLI tool to every CERN user.
To use it on lxplus, SWAN, or your own machine:

```bash
source /cvmfs/sw.escape.eu/lumi/latest/bin/setup.sh
lumi
```

If one knows about `.bashrc`, it's even lazier; less than this is not possible I think.

It also works with Claude Code CLI if you prefer that interface, just clone [lumi-assistant](https://github.com/Soap2G/lumi-assistant/).

### It's always a skill issue

What I like about skills is that there's not too much complexity. 
A skill is a markdown file that tells Lumi how to behave in a specific context: which tools to use, how to reason about a domain, what to prioritise. 
There's no RAG, no vector store, no embedding pipeline.
You write good documentation, and instruct the assistant where to read, like a human would do.

What makes a skill credible is its reproducibility. Next to skills, one needs ways to make sure that the "chain of thought" of the model is guarded by: 
1. Good documentation that the model can read
2. Operative checks (if possible), such as a CLI command that the model can run to check if the hypothesis it has in "mind" is right.

These two points are taken care of by MCP servers and CLI tools.

Should I build a RAG store if I have an MCP server like [cern-mkdocs-mcp](https://github.com/Soap2G/cern-mkdocs-mcp)? <br>
Is it good enough to search a few keywords on well written documentation instead of searching against a RAG store? <br>
At the end of the day, we're talking about semantic search in both cases.

Should I build an MCP server to answer questions about a tool that has a CLI? Nope. Just make sure that the model has access to the CLI, write a skill on how to use it, and put guardrails against destructive operations.

### Where do we stand

Lumi was born to assist users with the ATLAS Open Data.
We built an [atlasopenmagic MCP server](https://github.com/atlas-outreach-data-tools/atlasopenmagic-mcp), a [CERN Open Data Portal MCP server](https://github.com/Soap2G/cernopendata-mcp), and a bunch of skills to help users navigate the data, the documentation, and the tools to process it.

Then we started thinking about this: what if the question goes from: 

> *"I want to look for a Higgs to gamma gamma bump in the ATLAS Open Data 13 TeV release. I want to start interactively and then scale to batch. Where do I start?"*

To: 
> *"I want to look for di-Higgs production in the ATLAS mc23 campaign. I want to start interactively and then scale to batch. Where do I start?"*

That's a real ATLAS analysis. The gap between the two is not that wide, we just need the ATLAS Metadata system to figure out what datasets I need for the analysis, and a way to understand how the CERN Analysis Facility works.

Turns out there is an MCP server for the ATLAS Metadata system: [ami-mcp](https://github.com/kratsg/ami-mcp).
Not very difficult to add it to Lumi. Then, create a few skills to inform the model about the ATLAS analysis workflow, do some testing, and bon appétit.

### The economies of scale part

Each skill is a small, self-contained contribution. A team writes one skill for their service, and every Lumi user benefits from it. We don't care about the LLM infrastructure below, each one can use whatever they want.

Do you have a skill that is cool? Add it!

What is valuable to me is that each team of experts adds to the domain knowledge layer on top, and that part is just markdown.

### Not everything is roses in Lumi's garden

Every skill you load goes into the context window. Load too many, or point to documentation that's too long, and you burn through tokens *fast*. The model's attention degrades at the edges of a long context, and at some point you just hit a wall. 
The skill router helps (it picks the most relevant skill for a query, not all of them) but it's still something to keep an eye on.

The approach also has a natural ceiling. Skills work well when the knowledge base is structured and reasonably sized: "how do I submit a REANA workflow", "which queue do I use on lxbatch". They start to break down when you're searching through thousands of pages of unstructured documentation, like EDMS. <br>
At that point, one **needs** semantic retrieval. RAG is not dead, it's just not always necessary.

LLMs are stateless machines. Each session, hell, each message starts from scratch: Lumi doesn't remember what you asked last week, or that you prefer REANA over HTCondor for your specific workflow. For now, that's the trade-off.

Will Lumi drown in the endless list of use cases? Maybe :) <br>
At least I had fun writing this bit.
