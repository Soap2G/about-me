import React from 'react';
import { Link } from 'react-router-dom';
import { essays } from '../essays/manifest';
import './Home.css';

const Home = () => {
    const recent = [...essays]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 3);

    return (
        <div className="container home">
            <section className="home-intro">
                <h1>Giovanni Guerrieri</h1>

                <p>
                    I work at <a href="https://home.cern/" target="_blank" rel="noreferrer">CERN</a> in
                    the IT department, where I focus on Distributed computing, Data Management,
                    Analysis Facilities (or <a href="https://www.databricks.com/blog/what-is-data-lakehouse" target="_blank" rel="noreferrer">data-lakehouses</a> as the call them irl), and Open Data.
                </p>

                <p>
                    I earned my PhD in Particle Physics with the{' '}
                    <a href="https://atlas.cern/" target="_blank" rel="noreferrer">ATLAS Collaboration</a>{' '}
                    in 2024, where I co-led the experiment&rsquo;s <a href="https://cds.cern.ch/record/2892713" target="_blank" rel="noreferrer">first measurement</a> in Run 3 of
                    the Large Hadron Collider.
                </p>

                <p>
                    Today my work focuses on the Future Circular Collider, the{' '}
                    <a href="https://projectescape.eu/" target="_blank" rel="noreferrer">ESCAPE</a>{' '}
                    collaboration, the{' '}
                    <a href="https://oscars-project.eu/" target="_blank" rel="noreferrer">OSCARS</a>{' '}
                    project, and the <a href="https://eosc.eu/building-the-eosc-federation" target="_blank" rel="noreferrer">EOSC Federation</a>. I help design and operate computing models
                    and analysis platforms for research infrastructures, with the broader goal of
                    making Open Science practical across disciplines.
                </p>

                <p>
                    Outside of work I fly fish, throw pots, and once built a pizza oven from
                    scratch.
                </p>
            </section>

            <section className="home-section">
                <h2>What I&rsquo;m working on</h2>
                <ul className="home-list">
                    <li>
                        Building the FCC distributed computing and data management model.
                    </li>
                    <li>
                        Building the{' '}
                        <a href="https://eosc.eu/building-the-eosc-federation/eosc-node-cern" target="_blank" rel="noreferrer">CERN Node</a> within the EOSC Federation, 
                        and operating it.
                    </li>
                    <li>
                        Coordinating the <em>Data Infrastructure for Open Science</em> working
                        group in ESCAPE, and representing it on the{' '}
                        <a href="https://rucio.cern.ch/" target="_blank" rel="noreferrer">Rucio</a>{' '}
                        Advisory Board.
                    </li>
                    <li>
                        Consolidating the{' '}
                        <a href="https://vre-hub.github.io/" target="_blank" rel="noreferrer">ESCAPE Virtual Research Environment</a>{' '}
                        and the CERN&rsquo;s Analysis Facility.
                    </li>
                    <li>
                        Maintaining the{' '}
                        <a href="https://opendata.atlas.cern/" target="_blank" rel="noreferrer">ATLAS Open Data</a>{' '}
                        repositories, documentation, and tools.
                    </li>
                    <li>
                        Building{' '}
                        <a href="https://github.com/Soap2G/lumi-assistant" target="_blank" rel="noreferrer">lumi-assistant</a>.
                    </li>
                </ul>
            </section>

            {recent.length > 0 && (
                <section className="home-section">
                    <h2>Recent essays</h2>
                    <ul className="home-essays">
                        {recent.map((e) => (
                            <li key={e.slug}>
                                <Link to={`/essay/${e.slug}`}>{e.title}</Link>
                                <span className="home-essay-date">
                                    {new Date(e.date).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                </span>
                            </li>
                        ))}
                    </ul>
                    <p>
                        <Link to="/essays">All essays →</Link>
                    </p>
                </section>
            )}

            <section className="home-section">
                <h2>Elsewhere</h2>
                <ul className="home-list">
                    <li>
                        <a href="https://github.com/Soap2G" target="_blank" rel="noreferrer">GitHub</a>
                    </li>
                    <li>
                        <a href="https://www.linkedin.com/in/giovanniguerrieri/" target="_blank" rel="noreferrer">LinkedIn</a>
                    </li>
                    <li>
                        <a href="https://gitlab.cern.ch/gguerrie" target="_blank" rel="noreferrer">GitLab @ CERN</a>
                    </li>
                    <li>
                        <a href="https://inspirehep.net/authors/1911949" target="_blank" rel="noreferrer">InspireHEP</a>
                    </li>
                </ul>
            </section>
        </div>
    );
};

export default Home;
