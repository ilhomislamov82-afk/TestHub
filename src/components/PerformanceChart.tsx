import { useMemo } from 'react';
import { TestResult } from '../types';

interface PerformanceChartProps {
  results: TestResult[];
}

export function PerformanceChart({ results }: PerformanceChartProps) {
  // Sort chronologically ascending
  const sorted = useMemo(() => {
    return [...results].sort(
      (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
    );
  }, [results]);

  if (sorted.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
        Hozircha grafik uchun natijalar mavjud emas.
      </div>
    );
  }

  const height = 180;
  const paddingX = 40;
  const paddingY = 25;
  const chartWidth = 500;
  const usableWidth = chartWidth - paddingX * 2;
  const usableHeight = height - paddingY * 2;

  const points = sorted.map((r, i) => {
    const x = sorted.length === 1
      ? chartWidth / 2
      : paddingX + (i / (sorted.length - 1)) * usableWidth;
    const y = height - paddingY - (r.percentage / 100) * usableHeight;
    return { ...r, x, y };
  });

  const pathD = points.length === 1
    ? ''
    : points.reduce((acc, p, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');

  return (
    <div className="w-full bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span>
          O'zlashtirish dinamikasi (Foizlarda)
        </h4>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500"></span> O'tgan (&ge; 60%)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500"></span> O'tmagan (&lt; 60%)
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartWidth} ${height}`}
          className="w-full h-44 select-none min-w-[320px]"
        >
          {/* Horizontal grid lines: 0%, 50%, 100% */}
          {[0, 25, 50, 75, 100].map(pct => {
            const y = height - paddingY - (pct / 100) * usableHeight;
            return (
              <g key={pct}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={chartWidth - paddingX}
                  y2={y}
                  stroke={pct === 60 ? '#fca5a5' : '#f3f4f6'}
                  strokeDasharray={pct === 60 ? '4 3' : 'none'}
                  strokeWidth={pct === 60 ? 1.5 : 1}
                />
                <text
                  x={paddingX - 8}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="10"
                  fill="#9ca3af"
                >
                  {pct}%
                </text>
              </g>
            );
          })}

          {/* Line Path */}
          {points.length > 1 && (
            <path
              d={pathD}
              fill="none"
              stroke="#2563eb"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Dots */}
          {points.map((p, idx) => (
            <g key={p.id} className="cursor-pointer group">
              <circle
                cx={p.x}
                cy={p.y}
                r="5"
                fill={p.passed ? '#10b981' : '#ef4444'}
                stroke="#ffffff"
                strokeWidth="2"
                className="transition-transform group-hover:scale-125"
              />
              {/* Tooltip / Label */}
              <text
                x={p.x}
                y={p.y - 10}
                textAnchor="middle"
                fontSize="10"
                fontWeight="bold"
                fill={p.passed ? '#059669' : '#dc2626'}
              >
                {p.percentage}%
              </text>
              <text
                x={p.x}
                y={height - 8}
                textAnchor="middle"
                fontSize="9"
                fill="#6b7280"
              >
                {new Date(p.submittedAt).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' })}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
