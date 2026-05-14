
I recently worked on a community paper written as part of the LHC Re-Interpretation Working Group, which is now on ArXiv: [arXiv:2605.12229v1](https://arxiv.org/abs/2605.12229v1).

### The cost of not sharing

Turns out that science is expensive. Not just in the usual sense, such as in salaries, equipment, or facilities; science is more expensive the less resources one has. Folks in corporate call this "economies of scale".
LHC experiments have about 1.3 million CPU cores in WLCG, so 10 billion events more is significant, but not a party-killer. For a phenomenologist (or a group of theorists) at a university, it is quite the challenge.
Compute, storage, configurations, MC Generators setups, all done to replicate what LHC experiments produce, but do not share (yet).

We tried to quantify the impact of non-sharing. We only considered the financial and environmental costs, we didn't consider the time and effort that goes into researching, tuning and setting up the infrastructure to match what experiments do.
The ATLAS Open Event Generation release alone, which is about 12.8 billion events, or ~900 TB,  cost roughly CHF 275k to produce and store at the CERN Tier 0. 
Running the same campaign on Google Cloud without a negotiated agreement would cost over CHF 2.4M.
I should say that there are *ad-hoc* contracts that allow to mitigate the costs, but they are to be agreed *ad-hoc*, and they are not guaranteed to be available for everyone.

The environmental case is equally interesting. 
Each simulated event costs about 0.015 gCO₂e in operational emissions; at the scale of what ATLAS and CMS produce annually, we're talking about thousands of tonnes of CO₂ equivalent per year. 

I didn't yet mention another angle, which is the opportunity that experiments like ATLAS and CMS have in running shared generation, not just for the external community, but for themselves.
Centralising generation across both experiments has the potential to cut that by up to 2,400 tCO₂e annually; that's about a thousand transatlantic return flights.

### It's kind of a sociological problem

Besides requiring a decision, this path also requires coordination.

One needs a dedicated LHC Monte Carlo production team, generating shared Standard Model samples once, releasing them through the CERN Open Data Portal, accessible to experiments and phenomenologists alike.
It's much more complicated than this, because this is by a good part a sociological effort. Ask a random physicist how easy it is to combine results between ATLAS and CMS.
However, this is not necessarily new: the Lattice QCD community did it in the early 2000s with the International Lattice Data Grid, and cosmologists have shared large simulation outputs for years through the Virgo database. 
We risk that HEP is late to its own party.

### Where are these "economies of scale"?

Well, what do we (the experiments and the external communities) get in return?
- Experiments are forced to clean up their own house: when ATLAS prepared its open release, it caught metadata inconsistencies, a bug writing 6.5 PeV beam energies instead of 6.5 TeV, and built new internal tooling in the process. The documentation written for outsiders also ended up serving new collaboration members.
- Phenomenologists wouldn't need to regenerate samples from scratch for every reinterpretation study.
- Theorists building new BSM search strategies would access the Standard Model backgrounds they need in an easier way. 
- Machine learning researchers working on jet tagging or anomaly detection wouldn't be limited to public datasets two orders of magnitude smaller than what's available internally. 

The infrastructure is already there, the CERN's Open Data Portal hosts the samples.
Tools like [`atlasopenmagic`](https://github.com/atlas-outreach-data-tools/atlasopenmagic) provide programmatic access to metadata and file locations.
Platforms like SWAN, the ESCAPE Virtual Research Environment, and ServiceX enable near-data computing; you process the data where it lives rather than shipping petabytes around the network.

Don't generate the same events twice.
