import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Tool {
  name: string;
  label: string;
  icon: string;
  description: string;
}

interface ToolMentionProps {
  inputValue: string;
  onSelectTool: (tool: Tool) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
}

const DEFAULT_TOOLS: Tool[] = [
  { name: 'calculator', label: 'Calculator', icon: '🧮', description: 'Evaluate math expressions' },
  { name: 'web_search', label: 'Web Search', icon: '🔍', description: 'Search the internet' },
  { name: 'python_executor', label: 'Python Executor', icon: '🐍', description: 'Run Python code' },
  { name: 'image_generator', label: 'Image Generator', icon: '🎨', description: 'Create AI images' },
];

export default function ToolMention({ inputValue, onSelectTool, inputRef }: ToolMentionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if user just typed @
    const atIndex = inputValue.lastIndexOf('@');
    if (atIndex !== -1) {
      const afterAt = inputValue.slice(atIndex + 1);
      // Only show if @ is the last thing or followed by a partial word
      if (!afterAt.includes(' ') && afterAt.length < 20) {
        setIsOpen(true);
        setFilter(afterAt.toLowerCase());
        setSelectedIndex(0);
        return;
      }
    }
    setIsOpen(false);
    setFilter('');
  }, [inputValue]);

  const filteredTools = DEFAULT_TOOLS.filter(t =>
    t.label.toLowerCase().includes(filter) ||
    t.name.toLowerCase().includes(filter)
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredTools.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && filteredTools.length > 0) {
        e.preventDefault();
        onSelectTool(filteredTools[selectedIndex]);
        setIsOpen(false);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const input = inputRef.current;
    input?.addEventListener('keydown', handleKeyDown);
    return () => input?.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredTools, onSelectTool, inputRef]);

  return (
    <AnimatePresence>
      {isOpen && filteredTools.length > 0 && (
        <motion.div
          ref={popoverRef}
          className="tool-mention-popover"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.15 }}
        >
          <div className="tool-mention-header">Select a tool</div>
          {filteredTools.map((tool, i) => (
            <div
              key={tool.name}
              className={`tool-mention-item ${i === selectedIndex ? 'selected' : ''}`}
              onClick={() => {
                onSelectTool(tool);
                setIsOpen(false);
              }}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <span className="tool-mention-icon">{tool.icon}</span>
              <div className="tool-mention-info">
                <span className="tool-mention-label">{tool.label}</span>
                <span className="tool-mention-desc">{tool.description}</span>
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
