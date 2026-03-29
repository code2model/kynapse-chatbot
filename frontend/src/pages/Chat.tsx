import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Sparkles, LogOut, X, Settings } from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import axios from 'axios';
import { supabase } from '../supabaseClient';
import Sidebar from '../components/Sidebar';
import ToolMention from '../components/ToolMention';
import ToolExecutionBlock from '../components/ToolExecutionBlock';
import ChartRenderer from '../components/ChartRenderer';
import '../App.css';

interface ToolDetail {
  name: string;
  args: Record<string, unknown>;
  result: string;
  duration_ms: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tools_used?: string[];
  tool_details?: ToolDetail[];
  isTyping?: boolean;
}

interface SelectedTool {
  name: string;
  label: string;
  icon: string;
}

type ToolChoiceMode = 'auto' | 'none';

export default function Chat() {
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const location = useLocation();
  const initialPrompt = (location.state as { initialPrompt?: string })?.initialPrompt;

  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: 'Hello! I am **Kynapse** ✨ — your advanced AI assistant.\n\nI can **search the web** 🔍, **run Python code** 🐍, **generate images** 🎨, and **calculate math** 🧮.\n\nType `@` to select a specific tool, or just ask me anything!' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [convId, setConvId] = useState(conversationId || '');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedTools, setSelectedTools] = useState<SelectedTool[]>([]);
  const [toolChoiceMode, setToolChoiceMode] = useState<ToolChoiceMode>('auto');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hasAutoSent = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load existing conversation if ID provided
  useEffect(() => {
    if (conversationId) {
      const loadConversation = async () => {
        try {
          const apiUrl = import.meta.env.DEV
            ? `http://localhost:8000/api/history/${conversationId}`
            : `/api/history/${conversationId}`;
          const res = await fetch(apiUrl);
          if (res.ok) {
            const data = await res.json();
            const loaded: Message[] = data.messages.map((m: { role: string; content: string }, i: number) => ({
              id: `loaded-${i}`,
              role: m.role,
              content: m.content
            }));
            if (loaded.length > 0) {
              setMessages(loaded);
            }
            setConvId(conversationId);
          }
        } catch (err) {
          console.error('Failed to load conversation:', err);
        }
      };
      loadConversation();
    }
  }, [conversationId]);

  // Handle initial prompt from dashboard quick-prompt cards
  useEffect(() => {
    if (initialPrompt && !hasAutoSent.current) {
      hasAutoSent.current = true;
      setInput(initialPrompt);
      // Auto-send after a short delay to let UI render
      setTimeout(() => {
        sendMessage(initialPrompt);
      }, 500);
    }
  }, [initialPrompt]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleToolSelect = useCallback((tool: { name: string; label: string; icon: string }) => {
    // Remove the @partial from input
    setInput(prev => {
      const atIndex = prev.lastIndexOf('@');
      return atIndex >= 0 ? prev.slice(0, atIndex) : prev;
    });

    // Add tool to selected list (if not already)
    setSelectedTools(prev => {
      if (prev.find(t => t.name === tool.name)) return prev;
      return [...prev, tool];
    });
  }, []);

  const removeSelectedTool = (name: string) => {
    setSelectedTools(prev => prev.filter(t => t.name !== name));
  };

  const sendMessage = async (overrideMessage?: string) => {
    const messageText = overrideMessage || input;
    if (!messageText.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: messageText };
    setMessages(prev => [...prev, userMsg]);
    if (!overrideMessage) setInput('');
    setIsLoading(true);

    const tempId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: tempId, role: 'assistant', content: '', isTyping: true }]);

    try {
      const apiUrl = import.meta.env.DEV ? 'http://localhost:8000/api/chat' : '/api/chat';
      const payload = {
        message: messageText,
        conversation_id: convId || undefined,
        tool_choice: toolChoiceMode,
        selected_tools: selectedTools.map(t => t.name),
      };

      const res = await axios.post(apiUrl, payload);

      // Update conversation ID from first response
      if (!convId && res.data.conversation_id) {
        setConvId(res.data.conversation_id);
      }

      setMessages(prev => prev.map(msg =>
        msg.id === tempId ? {
          id: tempId,
          role: 'assistant',
          content: res.data.response,
          tools_used: res.data.tools_used,
          tool_details: res.data.tool_details,
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
      setSelectedTools([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Parse message content for chart blocks
  const renderMessageContent = (content: string) => {
    const chartRegex = /```chart\n([\s\S]*?)```/g;
    const parts: (string | { chart: string })[] = [];
    let lastIndex = 0;
    let match;

    while ((match = chartRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }
      parts.push({ chart: match[1].trim() });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }

    return parts.map((part, i) => {
      if (typeof part === 'string') {
        return (
          <div key={i} className="prose">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{part}</ReactMarkdown>
          </div>
        );
      }
      return <ChartRenderer key={i} config={part.chart} />;
    });
  };

  return (
    <div className="chat-layout">
      <Sidebar
        activeId={convId}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="chat-main">
        {/* Header */}
        <header className="chat-header">
          <div className="chat-header-left">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            >
              <Sparkles className="icon-brand" size={22} />
            </motion.div>
            <h1 className="chat-header-title">Kynapse</h1>
          </div>
          <div className="chat-header-right">
            <button onClick={() => navigate('/settings')} className="icon-btn" title="Settings">
              <Settings size={18} />
            </button>
            <button onClick={handleLogout} className="btn outline btn-sm">
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </header>

        {/* Messages Area */}
        <div className="chat-messages-area">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`msg-wrapper ${msg.role}`}
              >
                <div className="msg-avatar">
                  {msg.role === 'assistant' ? <Bot size={18} /> : <User size={18} />}
                </div>
                <div className="msg-body">
                  {msg.isTyping ? (
                    <div className="typing-indicator">
                      <span /><span /><span />
                    </div>
                  ) : (
                    <>
                      {/* Tool execution details */}
                      {msg.tool_details && msg.tool_details.length > 0 && (
                        <ToolExecutionBlock details={msg.tool_details} />
                      )}
                      {/* Message content with chart support */}
                      {renderMessageContent(msg.content)}
                      {/* Tools used badge */}
                      {msg.tools_used && msg.tools_used.length > 0 && (
                        <div className="tools-badge">
                          🛠️ Tools: {msg.tools_used.join(', ')}
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

        {/* Input Area */}
        <div className="chat-input-area">
          {/* Selected Tool Pills */}
          {selectedTools.length > 0 && (
            <div className="selected-tools-bar">
              {selectedTools.map(tool => (
                <span key={tool.name} className="tool-pill">
                  {tool.icon} {tool.label}
                  <button onClick={() => removeSelectedTool(tool.name)} className="tool-pill-remove">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Tool Mention Popover */}
          <ToolMention
            inputValue={input}
            onSelectTool={handleToolSelect}
            inputRef={inputRef}
          />

          <form onSubmit={handleSubmit} className="chat-input-form">
            <div className="chat-input-wrapper">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything or type @ to select tools..."
                className="chat-textarea"
                disabled={isLoading}
                rows={1}
              />
              <div className="chat-input-controls">
                {/* Tool Choice Mode */}
                <div className="tool-choice-toggle">
                  {(['auto', 'none'] as ToolChoiceMode[]).map(mode => (
                    <button
                      key={mode}
                      type="button"
                      className={`tool-choice-btn ${toolChoiceMode === mode ? 'active' : ''}`}
                      onClick={() => setToolChoiceMode(mode)}
                      title={mode === 'auto' ? 'AI decides when to use tools' : 'No tools used'}
                    >
                      {mode === 'auto' ? '⚡ Auto' : '🚫 None'}
                    </button>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className={`chat-send-btn ${isLoading ? 'loading' : ''}`}
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </form>
          <div className="chat-footer-text">
            Kynapse AI • Powered by Gemini 2.5 Flash • Type @ for tools
          </div>
        </div>
      </div>
    </div>
  );
}
