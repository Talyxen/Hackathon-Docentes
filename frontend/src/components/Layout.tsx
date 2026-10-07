import React from 'react';
import { Link, Outlet } from 'react-router-dom';

const Navbar: React.FC = () => {
  return (
    <nav className="no-print" style={{ background: 'var(--primary-color)', padding: '1rem 0', boxShadow: 'var(--shadow-sm)' }}>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white' }}>
          Inteligencia Académica S-1
        </Link>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link to="/" style={{ color: 'white', fontWeight: 600 }}>Dashboard</Link>
          <Link to="/comparative" style={{ color: 'white', fontWeight: 600 }}>Comparador</Link>
          <Link to="/explorer" style={{ color: 'white', fontWeight: 600 }}>Revisión</Link>
          <Link to="/upload" className="btn" style={{ backgroundColor: 'white', color: 'var(--primary-color)' }}>Subir CSV/XLSX</Link>
        </div>
      </div>
    </nav>
  );
};

export const Layout: React.FC = () => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main className="container main-content" style={{ flex: 1 }}>
        <Outlet />
      </main>
      <footer style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        &copy; 2024 Academic Intelligence Hackathon
      </footer>
    </div>
  );
};
