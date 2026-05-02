import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

import Header from './components/Header.js';
import Footer from './components/Footer.js';
import Transitions from './components/Transitions';

import Home from './pages/Home';
import Essays from './pages/Essays';
import Essay from './pages/Essay';
import Chep2026 from './pages/Chep2026';

import './App.css';

function App() {
    const location = useLocation();

    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('theme') || 'light';
    });

    useEffect(() => {
        document.body.dataset.theme = theme;
        localStorage.setItem('theme', theme);
    }, [theme]);

    return (
        <div className="site">
            <Header theme={theme} setTheme={setTheme} />
            <AnimatePresence initial={false} mode="wait">
                <Routes location={location} key={location.pathname}>
                    <Route path="/" element={<Transitions><Home /></Transitions>} />
                    <Route path="/essays" element={<Transitions><Essays /></Transitions>} />
                    <Route path="/essay/:slug" element={<Transitions><Essay /></Transitions>} />
                    <Route path="/chep2026" element={<Transitions><Chep2026 /></Transitions>} />
                    <Route path="*" element={<Transitions><Home /></Transitions>} />
                </Routes>
            </AnimatePresence>
            <Footer />
        </div>
    );
}

export default App;
