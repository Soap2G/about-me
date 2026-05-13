import React from 'react';
import './Footer.css';

const Footer = () => {
    return (
        <footer className="site-footer">
            <div className="container site-footer-inner">
                <span>© {new Date().getFullYear()} Giovanni Guerrieri</span>
                <span className="site-footer-sep">·</span>
                <a href="https://github.com/Soap2G" target="_blank" rel="noreferrer">GitHub</a>
                <span className="site-footer-sep">·</span>
                <a href="https://www.linkedin.com/in/giovanniguerrieri/" target="_blank" rel="noreferrer">LinkedIn</a>
                <span className="site-footer-sep">·</span>
                <a href="https://gitlab.cern.ch/gguerrie" target="_blank" rel="noreferrer">GitLab @ CERN</a>
                <span className="site-footer-sep">·</span>
                <a href="https://inspirehep.net/authors/1911949" target="_blank" rel="noreferrer">InspireHEP</a>
                <span className="site-footer-sep">·</span>
                <a href="https://orcid.org/0000-0002-3403-1177" target="_blank" rel="noreferrer">ORCID</a>
            </div>
        </footer>
    );
};

export default Footer;
