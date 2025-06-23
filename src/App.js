
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { User, Download, ChevronDown } from 'lucide-react';
import './App.css';
import VoiceToImage from './components/voice-to-image';
import VoiceToStory from './components/voice-to-story';
import VoiceToCharacter from './components/voice-to-character';
import VoiceToVideo from './components/voice-to-video';
import ProfileDashboard from './components/profile-dashboard';
import Login from './components/login';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function NavBar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [showExportDropdown, setShowExportDropdown] = React.useState(false);

  const exportAsZip = () => {
    // Implementation for ZIP export
    console.log('Exporting as ZIP...');
  };

  const exportAsPDF = () => {
    // Implementation for PDF export
    console.log('Exporting as PDF...');
  };

  if (location.pathname === '/login') return null;

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <h1>Sound Pix</h1>
      </div>
      
      <div className="nav-links">
        <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
          Voice to Image
        </Link>
        <Link to="/story" className={location.pathname === '/story' ? 'active' : ''}>
          Voice to Story
        </Link>
        <Link to="/character" className={location.pathname === '/character' ? 'active' : ''}>
          Voice to Character
        </Link>
        <Link to="/video" className={location.pathname === '/video' ? 'active' : ''}>
          Voice to Video
        </Link>
        <Link to="/profile" className={location.pathname === '/profile' ? 'active' : ''}>
          <User size={20} /> Profile
        </Link>
        
        <div className="export-dropdown">
          <button 
            className="export-btn"
            onClick={() => setShowExportDropdown(!showExportDropdown)}
          >
            <Download size={20} />
            Export
            <ChevronDown size={16} />
          </button>
          {showExportDropdown && (
            <div className="dropdown-menu">
              <button onClick={exportAsZip}>Export as ZIP</button>
              <button onClick={exportAsPDF}>Export as PDF</button>
            </div>
          )}
        </div>
        
        {user && (
          <button className="logout-btn" onClick={logout}>
            Logout
          </button>
        )}
      </div>
    </nav>
  );
}

function AppContent() {
  const { user } = useAuth();

  if (!user) {
    return <Login />;
  }

  return (
    <>
      <NavBar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<VoiceToImage />} />
          <Route path="/story" element={<VoiceToStory />} />
          <Route path="/character" element={<VoiceToCharacter />} />
          <Route path="/video" element={<VoiceToVideo />} />
          <Route path="/profile" element={<ProfileDashboard />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </main>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <AppContent />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
