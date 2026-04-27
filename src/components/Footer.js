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
                <a href="https://www.linkedin.com/in/giovanni-guerrieri-b4b9a7170/" target="_blank" rel="noreferrer">LinkedIn</a>
            </div>
        </footer>
    );
};

export default Footer;
