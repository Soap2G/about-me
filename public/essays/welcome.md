I have wanted a personal website for some time and never quite got around to
building one. 
I don't want to get too fancy, so I went for the boring option, stealing from folks like Dario Amodei,
and keeping the structure minimal to a single page, a stupid blog with random thoughts, plain
markdown, and the smallest possible amount of plumbing in between.

## What I plan to write here

Mostly short notes for myself, made public on the assumption that someone
else might find them useful. The topics will likely orbit around three
things I think about often:

- **Open Science in practice.** Open Data and Open Software are easy to
  agree with in principle. Most of my work is about the unglamorous parts
  underneath: the data management systems, analysis platforms, federated
  identities, and policies that have to exist for "open" to mean anything
  on a Tuesday afternoon.
- **Computing for big experiments.** ATLAS, the LHC, Rucio, the WLCG, and
  the various European efforts (ESCAPE, EOSC, OSCARS) that are slowly (but hopfully surely)
  reshaping how research infrastructures are built and shared.
- **Tools and tinkering.** Bits of code, infrastructure, and sometimes
  things from outside work.

## How this site is built

The blog itself is intentionally boring. Posts are markdown files in
`public/essays/`, registered in a tiny manifest, and rendered at request
time with `marked` and `dompurify`. 


