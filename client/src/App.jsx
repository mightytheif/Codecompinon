import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PropertySearch from './components/PropertySearch';
import './styles/main.css';

const App = () => {
  return (
    <Router>
      <div className="app">
        <header className="app-header">
          <h1>Real Estate Finder</h1>
          <nav>
            <ul>
              <li><a href="/">Home</a></li>
              <li><a href="/about">About</a></li>
              <li><a href="/contact">Contact</a></li>
            </ul>
          </nav>
        </header>
        
        <main className="app-main">
          <Routes>
            <Route path="/" element={<PropertySearch />} />
            {/* Add more routes here */}
          </Routes>
        </main>
        
        <footer className="app-footer">
          <p>&copy; {new Date().getFullYear()} Real Estate Finder. All rights reserved.</p>
        </footer>
      </div>
    </Router>
  );
};

export default App;