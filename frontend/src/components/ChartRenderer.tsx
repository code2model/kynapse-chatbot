import { useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

interface ChartConfig {
  type: 'bar' | 'line' | 'pie';
  title?: string;
  data: Record<string, unknown>[];
  xKey?: string;
  yKey?: string;
}

interface ChartRendererProps {
  config: string; // JSON string
}

const CHART_COLORS = [
  '#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd',
  '#3b82f6', '#60a5fa', '#93c5fd', '#10b981',
  '#f59e0b', '#ef4444'
];

export default function ChartRenderer({ config }: ChartRendererProps) {
  const chartConfig = useMemo<ChartConfig | null>(() => {
    try {
      return JSON.parse(config);
    } catch {
      return null;
    }
  }, [config]);

  if (!chartConfig || !chartConfig.data || chartConfig.data.length === 0) {
    return (
      <div className="chart-error">
        <pre>{config}</pre>
      </div>
    );
  }

  const { type, title, data, xKey = 'name', yKey = 'value' } = chartConfig;

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey={xKey} tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(15,23,42,0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#f8fafc'
                }}
              />
              <Legend wrapperStyle={{ color: '#94a3b8' }} />
              <Bar dataKey={yKey} radius={[6, 6, 0, 0]}>
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey={xKey} tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(15,23,42,0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#f8fafc'
                }}
              />
              <Legend wrapperStyle={{ color: '#94a3b8' }} />
              <Line type="monotone" dataKey={yKey} stroke="#6366f1" strokeWidth={2} dot={{ r: 4, fill: '#6366f1' }} />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                outerRadius={120}
                dataKey={yKey}
                nameKey={xKey}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'rgba(15,23,42,0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#f8fafc'
                }}
              />
              <Legend wrapperStyle={{ color: '#94a3b8' }} />
            </PieChart>
          </ResponsiveContainer>
        );
      default:
        return <pre>{config}</pre>;
    }
  };

  return (
    <div className="chart-container">
      {title && <div className="chart-title">{title}</div>}
      {renderChart()}
    </div>
  );
}
