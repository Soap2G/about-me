import React from 'react';
import { Link } from 'react-router-dom';
import { essays } from '../essays/manifest';
import './Essays.css';

const formatDate = (iso) =>
    new Date(iso).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

const Essays = () => {
    const sorted = [...essays].sort((a, b) => new Date(b.date) - new Date(a.date));

    return (
        <div className="container essays-page">
            <header className="essays-header">
                <h1>Essays</h1>
                <p className="essays-intro">
                    Notes on physics, computing, and Open Science. Mostly written for myself.
                </p>
            </header>

            <ul className="essays-list">
                {sorted.map((e) => (
                    <li key={e.slug} className="essay-row">
                        <div className="essay-row-main">
                            <Link to={`/essay/${e.slug}`} className="essay-row-title">
                                {e.title}
                            </Link>
                            {e.summary && (
                                <p className="essay-row-summary">{e.summary}</p>
                            )}
                        </div>
                        <time className="essay-row-date" dateTime={e.date}>
                            {formatDate(e.date)}
                        </time>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Essays;
