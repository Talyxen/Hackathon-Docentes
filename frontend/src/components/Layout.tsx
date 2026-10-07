import React from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';

const Navbar: React.FC = () => {
  const toggleTheme = () => {
    const d = document.documentElement;
    const isDark = d.dataset.theme ? d.dataset.theme === 'dark' : window.matchMedia('(prefers-color-scheme:dark)').matches;
    d.dataset.theme = isDark ? 'light' : 'dark';
  };

  return (
    <header className="no-print">
      <div className="bar">
        <div className="logo">
          <i>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 9l10-5 10 5-10 5z"/>
              <path d="M6 11v5c3 2.5 9 2.5 12 0v-5"/>
            </svg>
          </i>
          Inteligencia Académica S-1
        </div>
        
        <nav>
          <NavLink to="/" className={({isActive}) => isActive ? "on" : ""}>Dashboard</NavLink>
          <NavLink to="/comparative" className={({isActive}) => isActive ? "on" : ""}>Comparador</NavLink>
          <NavLink to="/explorer" className={({isActive}) => isActive ? "on" : ""}>Revisión</NavLink>
        </nav>
        
        <button className="btn g ic" title="Cambiar tema" aria-label="Cambiar tema" onClick={toggleTheme}>◐</button>
        <Link to="/upload" className="btn">Subir CSV/XLSX</Link>
      </div>
    </header>
  );
};

export const Layout: React.FC = () => {
  return (
    <>
      <Navbar />
      <main id="app">
        <Outlet />
      </main>
      <footer>© 2024 Academic Intelligence Hackathon</footer>
    </>
  );
};
