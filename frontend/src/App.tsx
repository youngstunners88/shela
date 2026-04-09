import { useMemo, useState } from 'react';
import { AppStoreProvider, useAppStore } from './state/AppStore';
import { OnboardingFlow } from './components/OnboardingFlow';
import { PassengerDashboard } from './components/PassengerDashboard';
import { DriverDashboard } from './components/DriverDashboard';
import { MarshalDashboard } from './components/MarshalDashboard';
import { SocialFeed } from './components/SocialFeed';
import { Leaderboard } from './components/Leaderboard';
import { FeedbackHub } from './components/FeedbackHub';
import './styles.css';

function Shell() {
  const { currentUser, snapshot, logout } = useAppStore();
  const [tab, setTab] = useState<'home' | 'social' | 'leaderboard' | 'feedback'>('home');

  const home = useMemo(() => {
    if (!currentUser) return <OnboardingFlow />;
    if (currentUser.role === 'PASSENGER') return <PassengerDashboard />;
    if (currentUser.role === 'DRIVER') return <DriverDashboard />;
    return <MarshalDashboard />;
  }, [currentUser]);

  const verse = useMemo(() => 'Trust in the Lord with all your heart and lean not on your own understanding. — Proverbs 3:5', []);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <div className="brand-badge">B</div>
          <div>
            <h1>Bhubezi</h1>
            <p>Keeping Jozi moving.</p>
          </div>
        </div>
        {currentUser && <div className="user-pill">{currentUser.name} · {currentUser.points} pts</div>}
        {currentUser && (
          <button className="logout-btn" onClick={logout}>
            Logout
          </button>
        )}
      </header>

      <main className="main-grid">
        <div className="main-column">{home}</div>
        <aside className="side-column">
          <section className="panel compact">
            <div className="section-title">Live summary</div>
            <div className="summary-grid">
              <div><strong>{snapshot?.ranks.length ?? 0}</strong><span>ranks</span></div>
              <div><strong>{snapshot?.routes.length ?? 0}</strong><span>routes</span></div>
              <div><strong>{snapshot?.pings.length ?? 0}</strong><span>pings</span></div>
              <div><strong>{snapshot?.posts.length ?? 0}</strong><span>posts</span></div>
            </div>
            <blockquote>{verse}</blockquote>
          </section>
          {tab === 'social' && <SocialFeed />}
          {tab === 'leaderboard' && <Leaderboard />}
          {tab === 'feedback' && <FeedbackHub />}
          {tab === 'home' && <Leaderboard />}
        </aside>
      </main>

      <nav className="bottom-nav">
        <button className={tab === 'home' ? 'nav-active' : ''} onClick={() => setTab('home')}>Home</button>
        <button className={tab === 'social' ? 'nav-active' : ''} onClick={() => setTab('social')}>Social</button>
        <button className={tab === 'leaderboard' ? 'nav-active' : ''} onClick={() => setTab('leaderboard')}>Leaderboard</button>
        <button className={tab === 'feedback' ? 'nav-active' : ''} onClick={() => setTab('feedback')}>Feedback</button>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <AppStoreProvider>
      <Shell />
    </AppStoreProvider>
  );
}
