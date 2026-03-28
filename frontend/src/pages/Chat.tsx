import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Sparkles, LogOut, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import axios from 'axios';
import { supabase } from '../supabaseClient';
import '../App.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tools_used?: string[];
  isTyping?: boolean;
}

export default function Chat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I am Kynapse. Ask me anything, or give me some math to calculate!',
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleLogout = async () => {
      await supabase.auth.signOut();
      navigate('/');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const tempId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: tempId, role: 'assistant', content: '', isTyping: true }]);

    try {
      const res = await axios.post('http://localhost:8000/api/chat', { message: userMsg.content });
      setMessages(prev => prev.map(msg => 
        msg.id === tempId ? { 
          id: tempId, 
          role: 'assistant', 
          content: res.data.response, 
          tools_used: res.data.tools_used,
          isTyping: false 
        } : msg
      ));
    } catch (error) {
      console.error(error);
      setMessages(prev => prev.map(msg => 
        msg.id === tempId ? { 
          id: tempId, 
          role: 'assistant', 
          content: 'Sorry, I encountered an error. Is the backend running?', 
          isTyping: false 
        } : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header className="glass-panel header">
        <div className="logo-container">
          <button onClick={() => navigate('/landing')} className="icon-btn" title="Back">
             <ArrowLeft size={20} />
          </button>
          <motion.div 
            animate={{ rotate: 360 }} 
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          >
            <Sparkles className="icon-brand" size={28} />
          </motion.div>
          <h1>Kynapse</h1>
        </div>
        <div className="header-actions">
           <button onClick={handleLogout} className="btn outline">
             <LogOut size={16} /> Sign out
           </button>
        </div>
      </header>

      <main className="chat-container">
        <div className="messages-area glass-panel">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`message-wrapper ${msg.role}`}
              >
                <div className="avatar">
                  {msg.role === 'assistant' ? <Bot size={20} /> : <User size={20} />}
                </div>
                <div className="message-content">
                  {msg.isTyping ? (
                    <div className="typing-indicator">
                      <span></span><span></span><span></span>
                    </div>
                  ) : (
                    <>
                      <div className="prose">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                      {msg.tools_used && msg.tools_used.length > 0 && (
                        <div className="tools-badge">
                          🛠️ Tools utilized: {msg.tools_used.join(', ')}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        <div className="input-area glass-panel">
          <form onSubmit={handleSubmit} className="input-form">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              className="chat-input"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={`btn btn-primary btn-icon ${isLoading ? 'loading' : ''}`}
            >
              <Send size={20} />
            </button>
          </form>
          <div className="footer-text">
            Kynapse AI is capable of executing tools perfectly.
          </div>
        </div>
      </main>
    </div>
  );
}
