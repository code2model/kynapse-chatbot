import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Sparkles, MessageSquare, Search, Code, Image, ArrowRight, LogOut, Settings } from 'lucide-react';
import { supabase } from '../supabaseClient';
import Sidebar from '../components/Sidebar';
import NewsCard from '../components/NewsCard';
import '../App.css';

interface NewsItem {
  title: string;
  description: string;
  source: string;
  url: string;
  image: string;
  published_at: string;
}

interface Conversation {
  id: string;
  title: string;
  preview: string;
  updated_at: string;
  message_count: number;
}

const QUICK_PROMPTS = [
  { icon: <MessageSquare size={20} />, label: 'Write me a story', color: '#6366f1', prompt: 'Write me a creative short story' },
  { icon: <Search size={20} />, label: 'Search the web', color: '#3b82f6', prompt: '@web_search Search for the latest AI news' },
  { icon: <Code size={20} />, label: 'Run Python code', color: '#10b981', prompt: '@python_executor Generate fibonacci numbers' },
  { icon: <Image size={20} />, label: 'Generate an image', color: '#a855f7', prompt: '@image_generator A futuristic city at sunset' },
];

export default function Landing() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('User');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [recentChats, setRecentChats] = useState<Conversation[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);

  useEffect(() => {
    // Get user info from Supabase
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        const name = data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'User';
        setUserName(name);
      }
    });

    // Fetch recent chats
    const fetchChats = async () => {
      try {
        const apiUrl = import.meta.env.DEV ? 'http://localhost:8000/api/history' : '/api/history';
        const res = await fetch(apiUrl);
        if (res.ok) {
          const data = await res.json();
          setRecentChats(data.slice(0, 5));
        }
      } catch (err) {
        console.error('Failed to fetch history:', err);
      }
    };

    // Fetch news
    const fetchNews = async () => {
      try {
        const apiUrl = import.meta.env.DEV ? 'http://localhost:8000/api/news' : '/api/news';
        const res = await fetch(apiUrl);
        if (res.ok) {
          const data = await res.json();
          setNews(data);
        }
      } catch (err) {
        console.error('Failed to fetch news:', err);
      } finally {
        setNewsLoading(false);
      }
    };

    fetchChats();
    fetchNews();

    // Auto-refresh news every 5 minutes
    const interval = setInterval(fetchNews, 300000);
    return () => clearInterval(interval);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleQuickPrompt = (prompt: string) => {
    navigate('/chat', { state: { initialPrompt: prompt } });
  };

  return (
    <div className="dashboard-layout">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <main className="dashboard-main">
        {/* Top Bar */}
        <header className="dashboard-topbar">
          <div />
          <div className="dashboard-topbar-actions">
            <button onClick={() => navigate('/settings')} className="icon-btn" title="Settings">
              <Settings size={20} />
            </button>
            <button onClick={handleLogout} className="btn outline btn-sm">
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </header>

        {/* Hero Greeting */}
        <motion.section
          className="dashboard-hero"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
            className="dashboard-hero-icon"
          >
            <Sparkles size={48} className="text-gradient" />
          </motion.div>
          <h1 className="dashboard-greeting">
            {getGreeting()}, <span className="text-gradient">{userName}</span>
          </h1>
          <p className="dashboard-subtitle">What would you like to explore today?</p>
        </motion.section>

        {/* Quick Prompt Cards */}
        <section className="dashboard-quick-prompts">
          {QUICK_PROMPTS.map((qp, i) => (
            <motion.button
              key={i}
              className="quick-prompt-card"
              onClick={() => handleQuickPrompt(qp.prompt)}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              whileHover={{ y: -3, scale: 1.02 }}
              style={{ '--card-accent': qp.color } as React.CSSProperties}
            >
              <div className="quick-prompt-icon" style={{ color: qp.color }}>{qp.icon}</div>
              <span className="quick-prompt-label">{qp.label}</span>
              <ArrowRight size={14} className="quick-prompt-arrow" />
            </motion.button>
          ))}
        </section>

        {/* Recent Chats Section */}
        {recentChats.length > 0 && (
          <motion.section
            className="dashboard-section"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="dashboard-section-header">
              <h2 className="dashboard-section-title">
                <MessageSquare size={20} /> Recent Conversations
              </h2>
              <button onClick={() => navigate('/chat')} className="text-btn-accent">
                View all <ArrowRight size={14} />
              </button>
            </div>
            <div className="recent-chats-grid">
              {recentChats.map((chat, i) => (
                <motion.div
                  key={chat.id}
                  className="recent-chat-card glass-panel"
                  onClick={() => navigate(`/chat/${chat.id}`)}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.08 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="recent-chat-title">{chat.title}</div>
                  <div className="recent-chat-preview">{chat.preview}</div>
                  <div className="recent-chat-meta">
                    {chat.message_count} messages
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* World News Section */}
        <motion.section
          className="dashboard-section"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <div className="dashboard-section-header">
            <h2 className="dashboard-section-title">🌍 World Affairs</h2>
          </div>

          {newsLoading ? (
            <div className="news-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="news-skeleton">
                  <div className="skeleton-image" />
                  <div className="skeleton-text" />
                  <div className="skeleton-text short" />
                </div>
              ))}
            </div>
          ) : (
            <div className="news-grid">
              {news.map((item, i) => (
                <NewsCard key={i} index={i} {...item} />
              ))}
            </div>
          )}
        </motion.section>
      </main>
    </div>
  );
}
