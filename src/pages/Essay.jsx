import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { getEssayBySlug } from '../essays/manifest';
import './Essay.css';

const formatDate = (iso) =>
    new Date(iso).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

marked.setOptions({
    gfm: true,
    breaks: false,
    headerIds: true,
    mangle: false,
});

const Essay = () => {
    const { slug } = useParams();
    const meta = getEssayBySlug(slug);

    const [state, setState] = useState({ status: 'loading', html: '' });

    useEffect(() => {
        if (!meta) {
            setState({ status: 'notfound', html: '' });
            return;
        }
        let cancelled = false;
        const url = `${process.env.PUBLIC_URL || ''}/essays/${meta.file}`;

        fetch(url)
            .then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.text();
            })
            .then((md) => {
                if (cancelled) return;
                const rawHtml = marked.parse(md);
                const cleanHtml = DOMPurify.sanitize(rawHtml);
                setState({ status: 'ready', html: cleanHtml });
            })
            .catch(() => {
                if (cancelled) return;
                setState({ status: 'error', html: '' });
            });

        return () => {
            cancelled = true;
        };
    }, [meta]);

    if (!meta) {
        return (
            <div className="container essay-page">
                <p>Essay not found. <Link to="/essays">Back to essays</Link>.</p>
            </div>
        );
    }

    return (
        <article className="container essay-page">
            <header className="essay-header">
                <p className="essay-back">
                    <Link to="/essays">← Essays</Link>
                </p>
                <h1 className="essay-title">{meta.title}</h1>
                <p className="essay-meta">
                    <time dateTime={meta.date}>{formatDate(meta.date)}</time>
                </p>
            </header>

            {state.status === 'loading' && (
                <p className="essay-loading">Loading…</p>
            )}
            {state.status === 'error' && (
                <p className="essay-loading">Could not load this essay.</p>
            )}
            {state.status === 'ready' && (
                <div
                    className="essay-content"
                    dangerouslySetInnerHTML={{ __html: state.html }}
                />
            )}
        </article>
    );
};

export default Essay;
