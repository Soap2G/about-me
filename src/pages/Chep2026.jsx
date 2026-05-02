import { useState } from 'react';
import './Chep2026.css';

const DAYS = [
  // ── Mon 25 ──────────────────────────────────────────────────
  {
    date: "Mon 25",
    slots: [
      {
        time: "13:45–15:15",
        parallel: [
          {
            track: "Track 8",
            subtitle: "Outreach & Open Data",
            talks: [
              { t: "Advancements in ATLAS Open Data for Research", p: "G. Guerrieri", prio: "own", time: "14:39–14:57", type: "talk" },
            ],
          },
        ],
      },
      {
        time: "16:15–18:03",
        parallel: [
          {
            track: "Track 7",
            subtitle: "Infrastructure & Sustainability",
            talks: [
              { t: "Exploiting LHCb trigger CPU/GPU as Analysis Facilities", p: "D. Castro", prio: "nice", time: "16:15–16:33" },
              { t: "CERN IT's Approach to Environmental Sustainability", p: "E. Bonfillou", prio: "high", time: "16:33–16:51" },
              { t: "European XFEL Scientific Data Infrastructure", p: "J. Malka", prio: "nice", time: "17:27–17:45" },
              { t: "Monitoring Sustainability at ATLAS Tier 2", p: "M. Villaplana", prio: "nice", time: "17:45–18:03" },
            ],
          },
          {
            track: "Track 8",
            subtitle: "Preservation & Reproducibility",
            talks: [
              { t: "Building a local VRE for the Einstein Telescope ⭐", p: "T. Diotalevi", prio: "must", time: "17:09–17:27" },
            ],
          },
        ],
      },
    ],
  },
  // ── Tue 26 ──────────────────────────────────────────────────
  {
    date: "Tue 26",
    slots: [
      {
        time: "09:00–10:30",
        parallel: [
          {
            track: "Plenary",
            subtitle: "",
            talks: [
              { t: "SRCNet — Vision, Progress, Cross-Community (SKA) ⭐", p: "R. Bolton", prio: "must", time: "09:00–09:30" },
              { t: "Rubin/LSST: Petabytes to Discovery (Rucio, PanDA, CVMFS)", p: "L. Guy", prio: "high", time: "09:30–10:00" },
              { t: "WLCG Technical Roadmap 2026–2030 ⭐", p: "WLCG TCB", prio: "must", time: "10:00–10:30" },
            ],
          },
        ],
      },
      {
        time: "13:45–15:15",
        parallel: [
          {
            track: "Track 1",
            subtitle: "Data transfers & federations",
            talks: [
              { t: "DC27 Roadmap: Mini-Challenges & WLCG DC 2027 ⭐", p: "A. Forti", prio: "must", time: "14:03–14:21" },
              { t: "FTS4 a first encounter with the experiments ⭐", p: "N. Pace", prio: "must", time: "14:21–14:39" },
              { t: "ATLAS/SENSE+Rucio Priority Data Transfer ⭐", p: "A. Arora", prio: "must", time: "14:39–14:57" },
              { t: "CERNBox European federation for sync & share", p: "D. Castro", prio: "high", time: "14:57–15:15" },
            ],
          },
          {
            track: "Track 4",
            subtitle: "Distributed computing",
            talks: [
              { t: "Evolving PanDA: Sustainable, Intelligent WLM", p: "F. Barreiro Megino", prio: "high", time: "14:03–14:21" },
              { t: "Scaling ePIC: Distributed Workflow & Data Mgmt", p: "S. Rahman", prio: "high", time: "14:21–14:39" },
              { t: "Toward Sustainable WMS Architecture for CMS HL-LHC", p: "A. Piccinelli", prio: "high", time: "14:57–15:15" },
            ],
          },
          {
            track: "Track 7",
            subtitle: "Infrastructure",
            talks: [
              { t: "Expanding INFN Cloud via Federation of K8s Clusters", p: "L. Giommi", prio: "nice" },
            ],
          },
        ],
      },
      {
        time: "16:15–18:03",
        parallel: [
          {
            track: "Track 1",
            subtitle: "XRootD & data access",
            talks: [
              { t: "Unified XRootD Monitoring for WLCG", p: "B. Garrido Bear", prio: "nice", time: "16:15–16:33" },
              { t: "Enhancing Redirection in CMS Data Federation", p: "R. Chauhan", prio: "nice", time: "16:33–16:51" },
              { t: "Global Profiling of OSDF via Pelican ⭐", p: "F. Andrijauskas", prio: "high", time: "16:51–17:09" },
              { t: "DataHarbor: Secure Web Portal via XRootD", p: "A. Manafov", prio: "nice", time: "17:09–17:27" },
            ],
          },
          {
            track: "Track 4",
            subtitle: "AI & operations",
            talks: [
              { t: '"ChatGPT run my workflow" ⭐', p: "B. Bockelman", prio: "high", time: "17:09–17:27" },
            ],
          },
          {
            track: "Track 7",
            subtitle: "Sustainability",
            talks: [
              { t: "Energy-aware compute at PIC Tier-1", p: "J. Flix Molina", prio: "high", time: "16:15–16:33" },
              { t: "WLCG Sustainability Forum: Progress & Directions", p: "D. Britton", prio: "must", time: "16:51–17:09" },
              { t: "Breathing Computing Center for HEP", p: "L. Sowa", prio: "high", time: "17:27–17:45" },
              { t: "High-Low: High-Perf Algorithms for Low Power HW", p: "A. De Oyanguren", prio: "nice", time: "17:45–18:03" },
            ],
          },
          {
            track: "Track 8",
            subtitle: "Analysis Facilities",
            talks: [
              { t: "The CERN Analysis Facility: Consolidation, Evolution and Strategy", p: "G. Guerrieri", prio: "own", time: "16:15–16:33", type: "talk" },
              { t: "Purdue Analysis Facility for HL-LHC", p: "N. Neumeister", prio: "nice", time: "16:51–17:09", type: "talk" },
              { t: "Offloading CMS analysis with RNTuple on AF", p: "CMS", prio: "nice", time: "17:09–17:27", type: "talk" },
              { t: "ServiceX Update", p: "B. Galewsky", prio: "high", time: "17:27–17:45", type: "talk" },
            ],
          },
        ],
      },
    ],
  },
  // ── Wed 27 ──────────────────────────────────────────────────
  {
    date: "Wed 27",
    slots: [
      {
        time: "13:45–15:15",
        parallel: [
          {
            track: "Track 1",
            subtitle: "Data integrity & storage",
            talks: [
              { t: "Enhanced Data Integrity for WLCG TPC Transfers", p: "H. Gonzalez", prio: "high", time: "14:21–14:39" },
            ],
          },
          {
            track: "Track 4",
            subtitle: "Distributed computing",
            talks: [
              { t: "IceCube Takes Flight with Pelican", p: "D. Schultz", prio: "nice", time: "14:21–14:39" },
              { t: "Evolving CRIC for HL-LHC Era", p: "P. Paparrigopoulos", prio: "high", time: "14:39–14:57" },
            ],
          },
          {
            track: "Track 7",
            subtitle: "Networking",
            talks: [
              { t: "Workflow-Aware Traffic Classification for HEP", p: "A. Giannakou", prio: "high", time: "14:39–14:57" },
              { t: "SciTags at Scale: Terabit Packet Marking ⭐", p: "M. Babik", prio: "high", time: "14:57–15:15" },
            ],
          },
        ],
      },
      {
        time: "16:15–18:03",
        parallel: [
          {
            track: "Track 1",
            subtitle: "FAIR data & metadata ⭐",
            talks: [
              { t: "Paradox of persistence: metadata versioning NAPMIX", p: "I. Knezevic", prio: "nice", time: "16:15–16:33" },
              { t: "PUNCH4NFDI Multi-Layer Metadata ⭐", p: "V. Tokareva", prio: "must", time: "16:33–16:51" },
              { t: "Making Astroparticle Data Reusable ⭐", p: "V. Tokareva", prio: "high", time: "17:09–17:27" },
              { t: "LZ Metadata: Trino, Superset, Ibis", p: "E. Mizrachi", prio: "nice", time: "17:27–17:45" },
              { t: "ILDG 2.0: FAIR data in Lattice QCD ⭐", p: "H. Simma", prio: "nice", time: "17:45–18:03" },
            ],
          },
          {
            track: "Track 1 (2nd room)",
            subtitle: "Storage systems & protocols",
            talks: [
              { t: "dCache project status & updates", p: "D. Litvintsev", prio: "high", time: "16:33–16:51" },
              { t: "dCache NFSv4.1 for HPC", p: "T. Mkrtchyan", prio: "high", time: "16:51–17:09" },
              { t: "EOS NFS 4.2 as Strategic Protocol", p: "A.J. Peters", prio: "high", time: "17:09–17:27" },
              { t: "Scalable Architecture for Metadata-Intensive NFS", p: "A.J. Peters", prio: "nice", time: "17:27–17:45" },
            ],
          },
          {
            track: "Track 4",
            subtitle: "Computing models",
            talks: [
              { t: "ET Computing Model ⭐", p: "P.J. Laycock", prio: "must", time: "16:33–16:51" },
              { t: "ATLAS Distributed Computing towards Run4 ⭐", p: "I. Glushkov", prio: "must", time: "16:51–17:09" },
              { t: "JUNO distributed computing production", p: "X. Zhang", prio: "nice", time: "17:27–17:45" },
            ],
          },
          {
            track: "Track 7",
            subtitle: "Cross-domain & sustainability",
            talks: [
              { t: "SCOPE: Sustainable Computing for ET ⭐", p: "S. Krischer", prio: "high", time: "16:15–16:33" },
              { t: "SRCNet Distributed Computing: Architecture", p: "R. Joshi", prio: "high", time: "16:51–17:09" },
              { t: "SPECTRUM: Strategic Framework for European Exascale", p: "S. Andreozzi", prio: "high", time: "17:09–17:27" },
              { t: "WLCG Mini-Capability Challenge: Host Tuning", p: "S. Mc Kee", prio: "high", time: "17:27–17:45" },
            ],
          },
        ],
      },
    ],
  },
  // ── Thu 28 ──────────────────────────────────────────────────
  {
    date: "Thu 28",
    slots: [
      {
        time: "11:00–12:30",
        parallel: [
          {
            track: "Plenary",
            subtitle: "",
            talks: [
              { t: "From quarks to quasars: unifying the universe through scalable computing", p: "G. Guerrieri", prio: "own", time: "12:00–12:30", type: "talk" },
            ],
          },
        ],
      },
      {
        time: "13:45–15:15",
        parallel: [
          {
            track: "Track 1",
            subtitle: "Compression & I/O",
            talks: [
              { t: "Real-Time I/O Traffic Shaping in EOS", p: "G. Del Monte", prio: "nice", time: "14:03–14:21" },
            ],
          },
        ],
      },
      {
        time: "16:15–18:03",
        parallel: [
          {
            track: "Track 4",
            subtitle: "Monitoring & accounting",
            talks: [
              { t: "WLCG/EGI Next-Gen Accounting Architecture", p: "P. Paparrigopoulos", prio: "nice", time: "16:33–16:51" },
              { t: "AUDITOR: CO₂ Reporting for Distributed HEP", p: "R. Vijayakumar", prio: "nice", time: "17:45–18:03" },
            ],
          },
          {
            track: "Track 7",
            subtitle: "Infrastructure",
            talks: [
              { t: "Computing Cluster for Technology Tracking in ET", p: "L. Lavezzi", prio: "nice", time: "16:51–17:09" },
            ],
          },
          {
            track: "Track 8",
            subtitle: "Outreach & Education",
            talks: [
              { t: "Revamping the ATLAS Open Data for Outreach and Education", p: "G. Guerrieri", prio: "own", time: "16:15–16:33", type: "talk" },
            ],
          },
        ],
      },
    ],
  },
];

const UNSCHEDULED = [
  { t: "Rucio for Open Science: FAIR and Accessible Data at Scale", prio: "must" },
  { t: "A new Rucio Service at CERN for Emerging Experiments", prio: "must" },
  { t: "Enhancing Rucio for GW Experiments with MADDEN", prio: "must" },
  { t: "Rucio-Based Global Data Lake for the SKA", prio: "must" },
  { t: "DUNE Rucio Server Scalability Studies", prio: "high" },
  { t: "Integrating Globus as Transfer Tool for Rucio", prio: "must" },
  { t: "interTwin Digital Twin Engine's Data Lake", prio: "must" },
  { t: "Ensuring Long-Term Data Sustainability: Rucio for LZ", prio: "high" },
  { t: "Sustainable Open Science: ET Analysis Portal (ETAP)", prio: "must" },
  { t: "Towards the Italian national scientific datalake", prio: "high" },
  { t: "Hardening & Federating INDIGO IAM", prio: "must" },
  { t: "Stateless OAuth2 tokens in INDIGO IAM", prio: "high" },
  { t: "Token-based auth risk assessment in WLCG", prio: "high" },
  { t: "SSH with federated identities", prio: "high" },
  { t: "Many Faces of Authentication at CERN", prio: "nice" },
  { t: "Reproducible Dask workflows in REANA", prio: "must" },
  { t: "ServiceX in ATLAS Integration Challenge", prio: "high" },
  { t: "Accelerating Science, Decelerating Carbon", prio: "must" },
  { t: "From recommendations to action: data preservation & open science", prio: "must" },
  { t: "Architectural Patterns of Data Infrastructure in HEP", prio: "high" },
  { t: "Operational Evolution of FTS3", prio: "high" },
  { t: "Scalable Tape Data Management at INFN-CNAF", prio: "nice" },
  { t: "Analysis of Tape Archival Metadata (ATLAS Run3)", prio: "nice" },
  { t: "AI_INFN Platform - distributed VRE", prio: "high" },
  { t: "SRCNet v0.1 and the Data Path to SKA Science", prio: "high" },
  { t: "A Path Toward Scalable FPGA in Federated Infra", prio: "nice" },
  { t: "Standardizing HPC-resource adaptation for HEP workflows", prio: "high" },
  { t: "INFN Open Access Repository: a FAIR challenge", prio: "nice" },
  { t: "Anomaly Detection in dCache Billing Data", prio: "nice" },
];

const PRIO_META = {
  must: { label: "Must see", className: "prio-must" },
  high: { label: "High",     className: "prio-high" },
  nice: { label: "Nice",     className: "prio-nice" },
  own:  { label: "My talks", className: "prio-own"  },
};

const TALK_TYPE_META = {
  talk:   { label: "Talk",   icon: "" },
  poster: { label: "Poster", icon: "📌" },
};

const TRACK_COLORS = {
  "Plenary":  "#3a4858",   /* muted dark slate  */
  "Track 1":  "#8c6030",   /* warm amber-brown  */
  "Track 4":  "#3a7082",   /* muted teal        */
  "Track 7":  "#3d7530",   /* sage (site accent)*/
  "Track 8":  "#6a5090",   /* dusty violet      */
};

function getTrackColor(track) {
  for (const [key, color] of Object.entries(TRACK_COLORS)) {
    if (track.includes(key)) return color;
  }
  return "#6b7280";
}

export default function Chep2026() {
  const [activeDay, setActiveDay] = useState("all");
  const [showUnscheduled, setShowUnscheduled] = useState(false);

  const days = activeDay === "all" ? DAYS : DAYS.filter(d => d.date === activeDay);

  return (
    <div className="chep-page">
      <header className="chep-header">
        <h1><a href="https://indico.cern.ch/event/1471803/">CHEP 2026</a></h1>
        <p className="chep-subtitle">
          My list of favourite talks and an overlap map — May 25–28, 2026, Bangkok, Thailand.
        </p>

        <div className="chep-legend">
          {Object.entries(PRIO_META).map(([key, meta]) => (
            <span key={key} className={`chep-tag ${meta.className}`}>
              {meta.label}
            </span>
          ))}
        </div>
      </header>

      {/* Day filter */}
      <div className="chep-day-filter">
        {[{ key: "all", label: "All days" }, ...DAYS.map(d => ({ key: d.date, label: d.date + " May" }))].map(d => (
          <button
            key={d.key}
            onClick={() => setActiveDay(d.key)}
            className={`chep-day-btn${activeDay === d.key ? " active" : ""}`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Schedule */}
      {days.map(day => (
        <section key={day.date} className="chep-day">
          <h2 className="chep-day-label">{day.date} May</h2>

          {day.slots.map((slot, si) => {
            const hasOverlap = slot.parallel.length > 1;
            const cols = Math.min(slot.parallel.length, 3);
            return (
              <div key={si} className="chep-slot">
                <div className="chep-slot-header">
                  <span className="chep-time">{slot.time}</span>
                  {hasOverlap && (
                    <span className="chep-overlap-badge">
                      ⚡ {slot.parallel.length} parallel tracks — choose one
                    </span>
                  )}
                </div>

                <div
                  className="chep-tracks"
                  style={{ gridTemplateColumns: hasOverlap ? `repeat(${cols}, 1fr)` : "1fr" }}
                >
                  {slot.parallel.map((track, ti) => {
                    const color = getTrackColor(track.track);
                    return (
                      <div
                        key={ti}
                        className="chep-track-card"
                        style={{
                          borderLeft: `3px solid ${color}`,
                          '--track-color': color,
                          '--track-color-bg': `${color}0d`,
                          '--track-color-border': `${color}30`,
                        }}
                      >
                        <div className="chep-track-name" style={{ color }}>
                          {track.track}
                        </div>
                        {track.subtitle && (
                          <div className="chep-track-subtitle">{track.subtitle}</div>
                        )}
                        <ul className="chep-talks">
                          {track.talks.map((talk, ki) => (
                            <li key={ki} className={`chep-talk ${PRIO_META[talk.prio].className}`}>
                              <span className="chep-talk-dot" />
                              <div className="chep-talk-body">
                                <div className="chep-talk-header">
                                  <span className={`chep-talk-title${talk.prio === 'own' ? ' own' : ''}`}>
                                    {talk.t}
                                  </span>
                                  {talk.type && (
                                    <span className="chep-talk-type">
                                      {TALK_TYPE_META[talk.type].icon} {TALK_TYPE_META[talk.type].label}
                                    </span>
                                  )}
                                </div>
                                <div className="chep-talk-meta">
                                  <span className="chep-talk-presenter">{talk.p}</span>
                                  {talk.time && <span className="chep-talk-time">{talk.time}</span>}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>
      ))}

      {/* Unscheduled */}
      <div className="chep-unscheduled-section">
        <button
          className="chep-toggle-btn"
          onClick={() => setShowUnscheduled(!showUnscheduled)}
        >
          {showUnscheduled ? "Hide" : "Show"} talks not yet located in timetable ({UNSCHEDULED.length})
        </button>

        {showUnscheduled && (
          <div className="chep-unscheduled">
            <p className="chep-unscheduled-note">
              In the book of abstracts but not mapped to a specific slot — may be posters or parallel sessions. Check Indico for exact times.
            </p>
            <ul className="chep-unscheduled-list">
              {UNSCHEDULED.map((talk, i) => (
                <li key={i} className={`chep-unscheduled-item ${PRIO_META[talk.prio].className}`}>
                  <span className="chep-talk-dot" />
                  <span className="chep-unscheduled-title">{talk.t}</span>
                  <span className={`chep-tag ${PRIO_META[talk.prio].className}`}>
                    {PRIO_META[talk.prio].label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
