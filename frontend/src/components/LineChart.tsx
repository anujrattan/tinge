import React from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface DataPoint {
  period: string;
  total_orders: number;
  delivered_orders: number;
  revenue: number;
}

interface LineChartProps {
  data: DataPoint[];
  className?: string;
}

export const LineChart: React.FC<LineChartProps> = ({ data, className = '' }) => {
  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 text-brand-secondary ${className}`}>
        No data available for the selected period
      </div>
    );
  }

  // Format period labels for better readability
  const formatPeriod = (period: string) => {
    if (period.includes('W')) {
      // Week format: 2026-W01 -> W1
      return `W${parseInt(period.split('-W')[1])}`;
    } else if (period.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Day format: 2026-01-01 -> Jan 1
      const date = new Date(period + 'T00:00:00');
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (period.match(/^\d{4}-\d{2}$/)) {
      // Month format: 2026-01 -> Jan
      const [year, month] = period.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return date.toLocaleDateString('en-US', { month: 'short' });
    }
    return period;
  };

  // Format data for the chart
  const chartData = data.map(d => ({
    period: formatPeriod(d.period),
    'Total Orders': d.total_orders,
    'Delivered Orders': d.delivered_orders,
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-brand-surface border border-gray-200 dark:border-white/20 rounded-lg p-3 shadow-lg">
          <p className="text-sm font-semibold text-brand-primary mb-2">{payload[0].payload.period}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-brand-secondary">{entry.name}:</span>
              <span className="font-semibold text-brand-primary">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Determine chart height and label angle based on data length
  const chartHeight = data.length > 15 ? 400 : 350;
  const labelAngle = data.length > 10 ? -45 : 0;
  const bottomMargin = data.length > 10 ? 60 : 30;

  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <RechartsLineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 0, bottom: bottomMargin }}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            className="stroke-gray-200 dark:stroke-white/10"
          />
          <XAxis
            dataKey="period"
            interval={0}
            angle={labelAngle}
            textAnchor={labelAngle === 0 ? 'middle' : 'end'}
            height={bottomMargin + 10}
            tick={{ fill: 'currentColor', fontSize: 12, fontWeight: 500 }}
            className="text-brand-primary"
            tickLine={{ stroke: 'currentColor' }}
            axisLine={{ stroke: 'currentColor' }}
          />
          <YAxis
            tick={{ fill: 'currentColor', fontSize: 13 }}
            className="text-brand-secondary"
            tickLine={{ stroke: 'currentColor' }}
            axisLine={{ stroke: 'currentColor' }}
            label={{ 
              value: 'Orders', 
              angle: -90, 
              position: 'insideLeft',
              style: { 
                fill: 'currentColor',
                fontSize: 14,
                fontWeight: 600,
              },
              className: 'text-brand-secondary'
            }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '5 5' }} />
          <Legend
            wrapperStyle={{
              paddingTop: '20px',
              fontSize: '14px',
              fontWeight: 500,
            }}
            iconType="line"
          />
          <Line
            type="monotone"
            dataKey="Total Orders"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={{ fill: '#3b82f6', r: 5, strokeWidth: 2, stroke: '#ffffff' }}
            activeDot={{ r: 8, strokeWidth: 2 }}
            className="dark:stroke-blue-400"
          />
          <Line
            type="monotone"
            dataKey="Delivered Orders"
            stroke="#10b981"
            strokeWidth={3}
            dot={{ fill: '#10b981', r: 5, strokeWidth: 2, stroke: '#ffffff' }}
            activeDot={{ r: 8, strokeWidth: 2 }}
            className="dark:stroke-green-400"
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
};
