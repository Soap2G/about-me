import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import './Header.css';

const MoonIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
);

const SunIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
);

const Header = ({ theme, setTheme }) => {
    const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

    return (
        <header className="site-header">
            <div className="site-header-inner container">
                <Link to="/" className="site-header-name" aria-label="Giovanni Guerrieri — home">
                    GG
                </Link>
                <nav className="site-header-nav">
                    <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
                        about
                    </NavLink>
                    <NavLink to="/essays" className={({ isActive }) => isActive ? 'active' : ''}>
                        essays
                    </NavLink>
                    <button
                        className="theme-switch-button"
                        onClick={toggleTheme}
                        aria-label="Toggle color theme"
                        title="Toggle color theme"
                    >
                        {theme === 'light' ? <MoonIcon /> : <SunIcon />}
                    </button>
                </nav>
            </div>
        </header>
    );
};

export default Header;
