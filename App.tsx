import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/Header';
import { Home } from './pages/Home';
import { ListingForm } from './pages/ListingForm';
import { TicketDetails } from './pages/TicketDetails';
import { Login } from './pages/Login';

const App: React.FC = () => {
  return (
    <HashRouter>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/give" element={<ListingForm />} />
            <Route path="/ticket/:id" element={<TicketDetails />} />
            
            {/* Redirect legacy /find and /signup routes to home/login */}
            <Route path="/find" element={<Navigate to="/" replace />} />
            <Route path="/signup" element={<Navigate to="/login" replace />} />
            
            {/* Catch all unknown routes and redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
};

export default App;