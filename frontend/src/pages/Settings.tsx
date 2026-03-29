import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Key, FileText, Info, ExternalLink, Sparkles } from 'lucide-react';
import '../App.css';

export default function SettingsPage() {
  const navigate = useNavigate();
  const [apiStatus, setApiStatus] = useState<{ status: string; version: string; api_key_configured: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const apiUrl = import.meta.env.DEV ? 'http://localhost:8000/api/health' : '/api/health';
        const res = await fetch(apiUrl);
        if (res.ok) {
          const data = await res.json();
          setApiStatus(data);
        }
      } catch {
        setApiStatus(null);
      } finally {
        setLoading(false);
      }
    };
    checkHealth();
  }, []);

  return (
    <div className="settings-container">
      <motion.div
        className="settings-panel glass-panel"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="settings-header">
          <button onClick={() => navigate(-1)} className="icon-btn">
            <ArrowLeft size={20} />
          </button>
          <h1 className="settings-title">Settings</h1>
        </div>

        {/* API Status */}
        <section className="settings-section">
          <div className="settings-section-header">
            <Key size={18} />
            <h2>API Configuration</h2>
          </div>
          <div className="settings-card">
            {loading ? (
              <div className="settings-status-loading">Checking backend status...</div>
            ) : apiStatus ? (
              <>
                <div className="settings-status-row">
                  <span className="settings-label">Backend Status</span>
                  <span className="settings-value success">
                    <span className="status-dot success" /> Connected
                  </span>
                </div>
                <div className="settings-status-row">
                  <span className="settings-label">API Version</span>
                  <span className="settings-value">{apiStatus.version}</span>
                </div>
                <div className="settings-status-row">
                  <span className="settings-label">Gemini API Key</span>
                  <span className={`settings-value ${apiStatus.api_key_configured ? 'success' : 'error'}`}>
                    <span className={`status-dot ${apiStatus.api_key_configured ? 'success' : 'error'}`} />
                    {apiStatus.api_key_configured ? 'Configured' : 'Missing'}
                  </span>
                </div>
              </>
            ) : (
              <div className="settings-status-row">
                <span className="settings-label">Backend Status</span>
                <span className="settings-value error">
                  <span className="status-dot error" /> Disconnected
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Available Tools */}
        <section className="settings-section">
          <div className="settings-section-header">
            <FileText size={18} />
            <h2>Available Tools</h2>
          </div>
          <div className="settings-tools-grid">
            {[
              { icon: '🧮', name: 'Calculator', desc: 'Evaluate math expressions', status: 'Built-in' },
              { icon: '🔍', name: 'Web Search', desc: 'Search with DuckDuckGo', status: 'Free' },
              { icon: '🐍', name: 'Python Executor', desc: 'Run Python code safely', status: 'Built-in' },
              { icon: '🎨', name: 'Image Generator', desc: 'AI art via Pollinations.ai', status: 'Free' },
            ].map((tool, i) => (
              <motion.div
                key={i}
                className="settings-tool-card"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <span className="settings-tool-icon">{tool.icon}</span>
                <div className="settings-tool-info">
                  <span className="settings-tool-name">{tool.name}</span>
                  <span className="settings-tool-desc">{tool.desc}</span>
                </div>
                <span className="settings-tool-badge">{tool.status}</span>
              </motion.div>
            ))}
          </div>
        </section>

        {/* About */}
        <section className="settings-section">
          <div className="settings-section-header">
            <Info size={18} />
            <h2>About</h2>
          </div>
          <div className="settings-card settings-about">
            <div className="settings-about-brand">
              <Sparkles size={28} className="text-gradient" />
              <div>
                <h3 className="settings-about-name">Kynapse</h3>
                <p className="settings-about-tagline">Intelligence, redefined.</p>
              </div>
            </div>
            <div className="settings-about-details">
              <p>Version 2.0.0</p>
              <p>Built by <strong>code2model</strong></p>
              <p>Powered by Google Gemini 2.5 Flash</p>
            </div>
            <a
              href="https://github.com/cgoinglove/better-chatbot"
              target="_blank"
              rel="noopener noreferrer"
              className="settings-link"
            >
              <ExternalLink size={14} /> Inspired by Better Chatbot
            </a>
          </div>
        </section>
      </motion.div>
    </div>
  );
}
