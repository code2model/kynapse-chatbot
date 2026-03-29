import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Clock, Wrench } from 'lucide-react';

interface ToolDetail {
  name: string;
  args: Record<string, unknown>;
  result: string;
  duration_ms: number;
}

interface ToolExecutionBlockProps {
  details: ToolDetail[];
}

const TOOL_COLORS: Record<string, string> = {
  calculator: '#f59e0b',
  web_search: '#3b82f6',
  python_executor: '#10b981',
  image_generator: '#a855f7',
};

const TOOL_ICONS: Record<string, string> = {
  calculator: '🧮',
  web_search: '🔍',
  python_executor: '🐍',
  image_generator: '🎨',
};

export default function ToolExecutionBlock({ details }: ToolExecutionBlockProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (!details || details.length === 0) return null;

  return (
    <div className="tool-exec-container">
      {details.map((detail, i) => {
        const isExpanded = expandedIndex === i;
        const color = TOOL_COLORS[detail.name] || '#94a3b8';
        const icon = TOOL_ICONS[detail.name] || '🛠️';

        return (
          <motion.div
            key={i}
            className="tool-exec-block"
            style={{ borderLeftColor: color }}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <div
              className="tool-exec-header"
              onClick={() => setExpandedIndex(isExpanded ? null : i)}
            >
              <div className="tool-exec-header-left">
                <span className="tool-exec-icon">{icon}</span>
                <span className="tool-exec-name">{detail.name.replace('_', ' ').toUpperCase()}</span>
              </div>
              <div className="tool-exec-header-right">
                <span className="tool-exec-duration">
                  <Clock size={12} />
                  {detail.duration_ms}ms
                </span>
                <span className="tool-exec-status">✓</span>
                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </div>

            {isExpanded && (
              <motion.div
                className="tool-exec-body"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <div className="tool-exec-section">
                  <div className="tool-exec-section-label">
                    <Wrench size={12} /> Arguments
                  </div>
                  <pre className="tool-exec-code">
                    {JSON.stringify(detail.args, null, 2)}
                  </pre>
                </div>
                <div className="tool-exec-section">
                  <div className="tool-exec-section-label">
                    <Wrench size={12} /> Result
                  </div>
                  <pre className="tool-exec-code">
                    {detail.result}
                  </pre>
                </div>
              </motion.div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
