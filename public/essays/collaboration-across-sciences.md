
I'm giving [a talk at CHEP 2026](https://indico.cern.ch/event/1471803/contributions/6967825/), the main computing conference in High Energy Physics, on behalf of the ESCAPE collaboration.
The title is "From quarks to quasars: unifying the universe through scalable computing". It sounds ambitious. It kind of is.

### The ESCAPE project

ESCAPE is the European Science Cluster of Astronomy and Particle Physics ESFRI infrastructures; I do not like recursive acronyms, but the name is the name.
It was launched in 2019 with a €16M EU Horizon 2020 grant and 31 partners: CERN, SKA, CTAO, FAIR, Virgo, KM3NeT, and more. 
Particle physicists, radio astronomers, gravitational wave researchers, all in the same room. 
The idea was to create a unified approach to managing and processing large-scale scientific data.

Turns out they have more in common than expected. <br>
They all drown in data. <br>
They all run distributed computing infrastructure across many sites. <br>
And increasingly, they all use the same tools: Rucio for data management, FTS for transfers, REANA for workflow orchestration. <br>

The ESCAPE project produced a working exabyte-scale data management prototype by extending Rucio with modern authentication (OAuth/OIDC), making it usable beyond HEP for the first time. <br>
It also built a blueprint for Virtual Research Environments that several research infrastructures have since replicated independently.

The project ended in January 2023. No budget. Yet the collaboration kept going, because people found value in talking to each other.

### Fighting the escape velocity

Right after the project ended, ESCAPE had a pretty quiet year and a half. Then, in mid 2024, we started talking about revamping the community.
We came up with two main objectives:
1. Develop a technical framework where each RI can advance its own goals, at its own pace, while contributing to a shared computing landscape.
2. Foster a continuous dialogue to maximise technical commonalities in (current and future) computing models.

We borrowed from WLCG's Data Challenges, did a bit of brand identity work, and launched the ESCAPE xRIDGE (cross-RI Distributed Grand Exercise) initiative.
Five of our communities ran coordinated data transfer campaigns simultaneously on the same infrastructure. 
We had a few shared bottlenecks that surfaced and were fixed together in real time. Sites experienced one coordinated campaign, not five competing ones.

Even though throughput is always ***the*** metric, I should say that this time it wasn't the point. 
The question we were asking was simpler: can multiple scientific communities share the same operational environment without getting in each other's way? 
The answer was yes, and that's harder to achieve than it sounds.

### The collective benefit

There's a return on investment here that's easy to miss.
When ESCAPE extended Rucio beyond HEP, it created a larger user base for a tool that WLCG depends on: it has more developers, more users, more use cases, and I feel like it's more sustainable in the long run.
It also means that a researcher who knows Rucio at CTAO can move to a CERN team and hit the ground running. Job mobility across infrastructures becomes easier when they share the same underlying tools.
And when we share the same infrastructure, we share the same monitoring, the same alerting, the same operational playbooks.

The framework that's emerging is: each research infrastructure advances its own scientific goals, at its own pace and with its own resources, while contributing to a shared computing landscape. 
The goal is to be collaborators by design, consumers of the same shared infrastructure, and never competitors for the same developer's time.

There is also a more political angle (that I won't indulge too much in), about the fact that the word "federation" is by now probably the most overused term in scientific computing.
Have a look at the [EuroHPC Federation Platform](https://www.eurohpc-ju.europa.eu/supercomputers/eurohpc-federation-platform_en), or the [EOSC Federation](https://eosc.eu/building-the-eosc-federation).
Both are building federated computing landscapes that significantly overlap with what WLCG has been doing for twenty years. 
Does ESCAPE have the possibility to strategically position itself right in the middle of all three? Yup.

The objective is to make our beloved researchers' lives easier, so that they can do better science, and do not have to think about the technicalities.

From quarks to quasars, the computing challenges are largely the same. The solutions should be too.
Maybe I'll be less ambitious in the title of the next talk.
