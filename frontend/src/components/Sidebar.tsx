import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, MessageSquare, Trash2, PanelLeftClose, PanelLeftOpen, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Conversation {
  id: string;
  title: string;
  preview: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

interface SidebarProps {
  activeId?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({ activeId, collapsed = false, onToggleCollapse }: SidebarProps) {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchHistory = async () => {
    try {
      const apiUrl = import.meta.env.DEV ? 'http://localhost:8000/api/history' : '/api/history';
      const res = await fetch(apiUrl);
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    intervalRef.current = setInterval(fetchHistory, 10000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const apiUrl = import.meta.env.DEV ? `http://localhost:8000/api/history/${id}` : `/api/history/${id}`;
      await fetch(apiUrl, { method: 'DELETE' });
      setConversations(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const filtered = conversations.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupByTime = (convs: Conversation[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const weekAgo = new Date(today.getTime() - 7 * 86400000);

    const groups: { label: string; items: Conversation[] }[] = [
      { label: 'Today', items: [] },
      { label: 'Yesterday', items: [] },
      { label: 'Previous 7 Days', items: [] },
      { label: 'Older', items: [] },
    ];

    convs.forEach(c => {
      const d = new Date(c.updated_at);
      if (d >= today) groups[0].items.push(c);
      else if (d >= yesterday) groups[1].items.push(c);
      else if (d >= weekAgo) groups[2].items.push(c);
      else groups[3].items.push(c);
    });

    return groups.filter(g => g.items.length > 0);
  };

  const groups = groupByTime(filtered);

  if (collapsed) {
    return (
      <motion.aside
        className="sidebar sidebar-collapsed"
        initial={{ width: 60 }}
        animate={{ width: 60 }}
      >
        <div className="sidebar-collapsed-actions">
          <button onClick={onToggleCollapse} className="sidebar-toggle" title="Expand sidebar">
            <PanelLeftOpen size={20} />
          </button>
          <button onClick={() => navigate('/chat')} className="sidebar-toggle" title="New chat">
            <Plus size={20} />
          </button>
        </div>
      </motion.aside>
    );
  }

  return (
    <motion.aside
      className="sidebar"
      initial={{ width: 280 }}
      animate={{ width: 280 }}
    >
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <Sparkles size={20} className="text-gradient" />
          <span className="sidebar-brand-text">Kynapse</span>
        </div>
        <button onClick={onToggleCollapse} className="sidebar-toggle" title="Collapse sidebar">
          <PanelLeftClose size={20} />
        </button>
      </div>

      <button onClick={() => navigate('/chat')} className="sidebar-new-chat">
        <Plus size={16} />
        New Chat
      </button>

      <div className="sidebar-search">
        <Search size={14} className="sidebar-search-icon" />
        <input
          type="text"
          placeholder="Search chats..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="sidebar-search-input"
        />
      </div>

      <div className="sidebar-list">
        {loading ? (
          <div className="sidebar-empty">Loading...</div>
        ) : groups.length === 0 ? (
          <div className="sidebar-empty">
            {searchQuery ? 'No matching chats' : 'No conversations yet'}
          </div>
        ) : (
          <AnimatePresence>
            {groups.map(group => (
              <div key={group.label} className="sidebar-group">
                <div className="sidebar-group-label">{group.label}</div>
                {group.items.map((conv, i) => (
                  <motion.div
                    key={conv.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`sidebar-item ${activeId === conv.id ? 'active' : ''}`}
                    onClick={() => navigate(`/chat/${conv.id}`)}
                  >
                    <MessageSquare size={14} className="sidebar-item-icon" />
                    <span className="sidebar-item-title">{conv.title}</span>
                    <button
                      onClick={(e) => handleDelete(e, conv.id)}
                      className="sidebar-item-delete"
                      title="Delete chat"
                    >
                      <Trash2 size={13} />
                    </button>
                  </motion.div>
                ))}
              </div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </motion.aside>
  );
}
