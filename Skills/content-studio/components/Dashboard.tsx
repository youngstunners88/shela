/** @jsx jsx */
/** @jsxFrag Fragment */
import { jsx, Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";

// Content Studio Dashboard for Teachers
// All-in-one hub with Canva + Skool quick actions

interface TeacherProfile {
  id: string;
  name: string;
  email: string;
  walletAddress: string;
  walletBalance: number;
}

interface PluginStatus {
  canva: boolean;
  skool: boolean;
  lastSync: string | null;
}

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  plugin: "canva" | "skool";
  action: string;
  description: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "canva-flyer",
    label: "Quick Flyer",
    icon: "FileImage",
    plugin: "canva",
    action: "create-flyer",
    description: "Create lesson promotion",
  },
  {
    id: "canva-certificate",
    label: "Certificate",
    icon: "Award",
    plugin: "canva",
    action: "create-certificate",
    description: "Student achievement",
  },
  {
    id: "skool-community",
    label: "Community",
    icon: "Users",
    plugin: "skool",
    action: "create-community",
    description: "New class group",
  },
  {
    id: "skool-invite",
    label: "Invite Students",
    icon: "UserPlus",
    plugin: "skool",
    action: "send-invites",
    description: "Generate links",
  },
];

function useTeacherData(teacherId: string) {
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [plugins, setPlugins] = useState<PluginStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/teachers/${teacherId}/dashboard`)
      .then((res) => res.json())
      .then((data) => {
        setProfile({
          id: teacherId,
          name: data.profile.name,
          email: data.profile.email,
          walletAddress: data.wallet.address,
          walletBalance: data.wallet.balance,
        });
        setPlugins({
          canva: data.plugins.canva_connected,
          skool: data.plugins.skool_connected,
          lastSync: data.plugins.last_sync,
        });
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [teacherId]);

  return { profile, plugins, loading, error };
}

function WelcomeHeader({ profile }: { profile: TeacherProfile }) {
  return (
    <div className="welcome-header">
      <h1>Welcome back, {profile.name.split(' ')[0]}!</h1>
      <p className="subtitle">
        Your Content Studio is ready — live classes, instant designs, 
        Skool communities, and real ckUSDC funding for your classroom.
      </p>
    </div>
  );
}

function WalletCard({ balance, address }: { balance: number; address: string }) {
  return (
    <div className="wallet-card">
      <div className="card-header">
        <span className="icon">Wallet</span>
        <span className="label">Teaching Fund</span>
      </div>
      <div className="balance">
        <span className="amount">{balance.toFixed(2)}</span>
        <span className="currency">ckUSDC</span>
      </div>
      <div className="wallet-address">
        {address.slice(0, 8)}...{address.slice(-6)}
      </div>
    </div>
  );
}

function QuickActions({ plugins }: { plugins: PluginStatus }) {
  const handleAction = (action: QuickAction) => {
    if (action.plugin === "canva" && !plugins.canva) {
      window.location.href = "/settings/canva-connect";
      return;
    }
    if (action.plugin === "skool" && !plugins.skool) {
      window.location.href = "/settings/skool-connect";
      return;
    }

    window.location.href = `/action/${action.plugin}/${action.action}`;
  };

  return (
    <div className="quick-actions">
      <h2>Content Studio</h2>
      <div className="actions-grid">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.id}
            className={`action-tile ${action.plugin}`}
            onClick={() => handleAction(action)}
          >
            <span className="action-icon">{action.icon}</span>
            <span className="action-label">{action.label}</span>
            <span className="action-desc">{action.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function PluginStatusBar({ plugins }: { plugins: PluginStatus }) {
  return (
    <div className="plugin-status">
      <div className={`status-pill ${plugins.canva ? "connected" : "disconnected"}`}>
        Canva {plugins.canva ? "✓" : "—"}
      </div>
      <div className={`status-pill ${plugins.skool ? "connected" : "disconnected"}`}>
        Skool {plugins.skool ? "✓" : "—"}
      </div>
      {plugins.lastSync && (
        <span className="last-sync">
          Last sync: {new Date(plugins.lastSync).toLocaleString()}
        </span>
      )}
    </div>
  );
}

export default function Dashboard() {
  const teacherId = new URLSearchParams(window.location.search).get("teacher") || "me";
  const { profile, plugins, loading, error } = useTeacherData(teacherId);

  if (loading) return <div className="loading">Loading Content Studio...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!profile || !plugins) return <div className="error">No data found</div>;

  return (
    <div className="content-studio-dashboard">
      <WelcomeHeader profile={profile} />
      <div className="dashboard-grid">
        <WalletCard balance={profile.walletBalance} address={profile.walletAddress} />
        <QuickActions plugins={plugins} />
      </div>
      <PluginStatusBar plugins={plugins} />
    </div>
  );
}
