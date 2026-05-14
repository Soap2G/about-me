import React, { useEffect, useRef, useState } from 'react';
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
});

const slugify = (text) =>
    text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

const buildTocAndHtml = (rawHtml) => {
    const doc = new DOMParser().parseFromString(rawHtml, 'text/html');
    const headings = doc.querySelectorAll('h2, h3');
    const toc = [];
    const used = new Set();

    headings.forEach((el) => {
        const text = el.textContent || '';
        let id = slugify(text);
        if (!id) return;
        let unique = id;
        let n = 2;
        while (used.has(unique)) {
            unique = `${id}-${n++}`;
        }
        used.add(unique);
        el.id = unique;
        toc.push({
            id: unique,
            text,
            level: el.tagName === 'H2' ? 2 : 3,
        });
    });

    return { html: doc.body.innerHTML, toc };
};

const Essay = () => {
    const { slug } = useParams();
    const meta = getEssayBySlug(slug);

    const [state, setState] = useState({ status: 'loading', html: '', toc: [] });
    const [activeId, setActiveId] = useState(null);
    const contentRef = useRef(null);

    useEffect(() => {
        if (!meta) {
            setState({ status: 'notfound', html: '', toc: [] });
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
                const { html, toc } = buildTocAndHtml(cleanHtml);
                const hasH2 = toc.some((h) => h.level === 2);
                const normalizedToc = hasH2
                    ? toc
                    : toc.map((h) => ({ ...h, level: 2 }));
                setState({ status: 'ready', html, toc: normalizedToc });
            })
            .catch(() => {
                if (cancelled) return;
                setState({ status: 'error', html: '', toc: [] });
            });

        return () => {
            cancelled = true;
        };
    }, [meta]);

    useEffect(() => {
        if (state.status !== 'ready' || state.toc.length === 0) return;
        const root = contentRef.current;
        if (!root) return;

        const elements = state.toc
            .map((h) => root.querySelector(`#${CSS.escape(h.id)}`))
            .filter(Boolean);

        if (elements.length === 0) return;

        setActiveId(state.toc[0].id);

        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((e) => e.isIntersecting)
                    .sort((a, b) => a.target.offsetTop - b.target.offsetTop);
                if (visible.length > 0) {
                    setActiveId(visible[0].target.id);
                }
            },
            {
                rootMargin: '-80px 0px -65% 0px',
                threshold: 0,
            }
        );

        elements.forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, [state.status, state.toc]);

    if (!meta) {
        return (
            <div className="container essay-page">
                <p>Essay not found. <Link to="/essays">Back to essays</Link>.</p>
            </div>
        );
    }

    return (
        <div className="essay-layout">
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
                        ref={contentRef}
                        className="essay-content"
                        dangerouslySetInnerHTML={{ __html: state.html }}
                    />
                )}
            </article>

            {state.status === 'ready' && state.toc.length > 0 && (
                <aside className="essay-toc" aria-label="Table of contents">
                    <p className="essay-toc-title">On this page</p>
                    <ul>
                        {state.toc.map((h) => (
                            <li
                                key={h.id}
                                className={`essay-toc-item level-${h.level} ${activeId === h.id ? 'active' : ''}`}
                            >
                                <a href={`#${h.id}`}>{h.text}</a>
                            </li>
                        ))}
                    </ul>
                </aside>
            )}
        </div>
    );
};

export default Essay;
