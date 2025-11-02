import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

// Types
interface WriGaugeCardProps {
  score: number;
  title?: string;
  showLegend?: boolean;
  subtext?: string;
  className?: string;
}

// Pure function to determine band from score (kept for potential future use)
export function getBand(score: number): 'green' | 'yellow' | 'orange' | 'red' {
  if (score <= 24) return 'green';
  if (score <= 49) return 'yellow';
  if (score <= 74) return 'orange';
  return 'red';
}

// Legend data with split orange
const LEGEND_ITEMS = [
  { dot: 'bg-emerald-400', label: '0–24 Green' },
  { dot: 'bg-yellow-400', label: '25–49 Yellow' },
  { dot: 'bg-orange-400', label: '50–62 Orange' },
  { dot: 'bg-orange-500', label: '63–74 Orange+' },
  { dot: 'bg-red-500', label: '75+ Red' }
];

// Math helpers for SVG arc drawing
function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = angleInDegrees * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
}

function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = Math.abs(endAngle - startAngle) <= 180 ? '0' : '1';
  
  return [
    'M', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y
  ].join(' ');
}

// Helper functions for score positioning - Updated to match exact specifications
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function scoreToAngle(score: number) {
  // Exact formula from specifications: angle = startDeg + ((score - min) / (max - min)) * (endDeg - startDeg)
  // startDeg = -90, endDeg = 90, min = 0, max = 100
  const min = 0;
  const max = 100;
  const startDeg = -90;
  const endDeg = 90;
  
  const fraction = (score - min) / (max - min);
  const angleDeg = startDeg + fraction * (endDeg - startDeg);
  
  console.log(`🎯 Angle Calculation: Score=${score}, Fraction=${fraction.toFixed(3)}, Angle=${angleDeg.toFixed(2)}°`);
  return angleDeg;
}

// Gauge segments configuration - Exact specifications
const GAUGE_SEGMENTS = [
  { range: [0, 24], id: 'green', color: '#2ecc71' },
  { range: [25, 49], id: 'yellow', color: '#f1c40f' },
  { range: [50, 62], id: 'orange', color: '#f39c12' },
  { range: [63, 74], id: 'orange-plus', color: '#e67e22' },
  { range: [75, 100], id: 'red', color: '#e74c3c' }
];

export const WriGaugeCard: React.FC<WriGaugeCardProps> = ({
  score,
  title = "Today's WRI",
  showLegend = true,
  subtext,
  className = ''
}) => {
  // Ensure score is within bounds
  const clampedScore = Math.max(0, Math.min(100, score));

  // SVG configuration - updated for cleaner design
  const size = 260;
  const center = size / 2;
  const radius = 100;
  const strokeWidth = 12;
  const valueDy = 18; // Position for score label below needle

  // Calculate needle angle using helper function
  const needleAngle = useMemo(() => {
    const angle = scoreToAngle(clampedScore);
    console.log(`🎯 WRI Needle: Score ${clampedScore} → Angle ${angle}°`);
    return angle;
  }, [clampedScore]);

  // Generate gradient definitions - Exact color specifications
  const renderGradients = () => (
    <defs>
      <linearGradient id="grad-green" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#2ecc71" />
        <stop offset="100%" stopColor="#2ecc71" />
      </linearGradient>
      <linearGradient id="grad-yellow" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#f1c40f" />
        <stop offset="100%" stopColor="#f1c40f" />
      </linearGradient>
      <linearGradient id="grad-orange" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#f39c12" />
        <stop offset="100%" stopColor="#f39c12" />
      </linearGradient>
      <linearGradient id="grad-orange-plus" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#e67e22" />
        <stop offset="100%" stopColor="#e67e22" />
      </linearGradient>
      <linearGradient id="grad-red" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#e74c3c" />
        <stop offset="100%" stopColor="#e74c3c" />
      </linearGradient>
      <filter id="needle-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
        <feMerge> 
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
  );

  const renderGaugeSegments = () => {
    return GAUGE_SEGMENTS.map((segment) => {
      const [startScore, endScore] = segment.range;
      const startAngle = scoreToAngle(startScore);
      const endAngle = scoreToAngle(endScore);
      
      return (
        <motion.path
          key={segment.id}
          d={describeArc(center, center, radius, startAngle, endAngle)}
          fill="none"
          stroke={segment.color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        />
      );
    });
  };

  const renderNeedle = () => {
    // Match exact specifications: length = 0.86, width = 6, color = #ffffff
    const needleLength = radius * 0.86; // 0.86 as per specs
    const needleWidth = 6; // 6 as per specs
    const needleColor = "#ffffff"; // White as per specs
    const capColor = "#9aa5b1"; // Cap color as per specs
    const capRadius = 8; // 8 as per specs
    
    // Calculate needle end point based on angle
    const needleEndX = center + needleLength * Math.cos(needleAngle * Math.PI / 180);
    const needleEndY = center + needleLength * Math.sin(needleAngle * Math.PI / 180);

    console.log(`🎯 Needle Debug: Score=${clampedScore}, Angle=${needleAngle}°, End=(${needleEndX.toFixed(1)}, ${needleEndY.toFixed(1)}), Length=${needleLength.toFixed(1)}`);

    return (
      <g>
        {/* Needle line - exact specifications */}
        <line
          x1={center}
          y1={center}
          x2={needleEndX}
          y2={needleEndY}
          stroke={needleColor}
          strokeWidth={needleWidth}
          strokeLinecap="round"
          opacity="1"
        />
        {/* Needle cap - exact specifications */}
        <circle 
          cx={needleEndX} 
          cy={needleEndY} 
          r={capRadius} 
          fill={capColor}
          stroke="#ffffff"
          strokeWidth="1"
          opacity="1"
        />
        {/* Needle hub - center point */}
        <circle cx={center} cy={center} r="6" fill="#ffffff" stroke="#000000" strokeWidth="1" />
      </g>
    );
  };

  return (
    <motion.div
      className={`relative bg-slate-900/60 backdrop-blur-sm rounded-2xl ring-1 ring-white/10 p-6 md:p-7 shadow-2xl ${className}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      role="img"
      aria-label={`Wellness Risk Index gauge. Score ${clampedScore.toFixed(1)} of 100.`}
    >
      {/* Header */}
      <div className="text-center mb-6">
        <h3 className="text-slate-300 font-medium text-lg">{title}</h3>
        {subtext && (
          <p className="text-slate-400 text-sm mt-1">{subtext}</p>
        )}
      </div>

      {/* Gauge Container */}
      <div className="flex flex-col items-center">
        <div className="relative" style={{ width: size, height: size / 2 + 50 }}>
          <svg
            width={size}
            height={size / 2 + 50}
            viewBox={`0 0 ${size} ${size / 2 + 50}`}
            className="overflow-visible"
          >
            {renderGradients()}

            {/* Rotate the gauge by -90° (arcs + needle), keep text upright */}
            <g transform={`rotate(-90 ${center} ${center})`}>
              {/* Background track with subtle inner shadow */}
              <path
                d={describeArc(center, center, radius, -90, 90)}
                fill="none"
                stroke="rgb(71 85 105 / 0.35)"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />

              {/* Colored segments */}
              {renderGaugeSegments()}

              {/* Tick marks for score ranges */}
              {[0, 25, 50, 63, 75, 100].map((tickScore) => {
                const tickAngle = scoreToAngle(tickScore);
                const tickLength = 15;
                const tickStartX = center + (radius - strokeWidth/2 - 5) * Math.cos(tickAngle * Math.PI / 180);
                const tickStartY = center + (radius - strokeWidth/2 - 5) * Math.sin(tickAngle * Math.PI / 180);
                const tickEndX = center + (radius - strokeWidth/2 - 5 - tickLength) * Math.cos(tickAngle * Math.PI / 180);
                const tickEndY = center + (radius - strokeWidth/2 - 5 - tickLength) * Math.sin(tickAngle * Math.PI / 180);
                
                // Position for score label
                const labelX = center + (radius - strokeWidth/2 - 5 - tickLength - 20) * Math.cos(tickAngle * Math.PI / 180);
                const labelY = center + (radius - strokeWidth/2 - 5 - tickLength - 20) * Math.sin(tickAngle * Math.PI / 180);
                
                return (
                  <g key={tickScore}>
                    <line
                      x1={tickStartX}
                      y1={tickStartY}
                      x2={tickEndX}
                      y2={tickEndY}
                      stroke="rgba(255,255,255,0.6)"
                      strokeWidth="1"
                      strokeLinecap="round"
                    />
                    <text
                      x={labelX}
                      y={labelY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="rgba(255,255,255,0.8)"
                      fontSize="10"
                      fontWeight="500"
                    >
                      {tickScore}
                    </text>
                  </g>
                );
              })}

              {/* Needle */}
              {renderNeedle()}
            </g>
          </svg>
        </div>

        {/* Legend */}
        {showLegend && (
          <motion.div
            className="mt-8 w-full max-w-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 md:flex md:flex-wrap md:gap-4 text-sm">
              {LEGEND_ITEMS.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-2"
                >
                  <div className={`w-3 h-3 rounded-full ${item.dot}`} />
                  <span className="text-slate-300">{item.label}</span>
                </div>
              ))}
            </div>
            
            {/* Range indicators */}
            <div className="flex justify-between text-xs text-slate-400 mt-4 px-2">
              <span>0 (Best)</span>
              <span>100 (Worst)</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Value label with band indicator */}
      <div className="-mt-6 text-center">
        <div className="text-sm md:text-base font-semibold text-slate-200/90 select-none">
          {clampedScore.toFixed(1)}
        </div>
        <div className="text-xs text-slate-400 mt-1">
          {(() => {
            const band = getBand(clampedScore);
            const bandLabels = {
              green: '🟢 Excellent',
              yellow: '🟡 Good', 
              orange: '🟠 Moderate',
              red: '🔴 High Risk'
            };
            return bandLabels[band];
          })()}
        </div>
      </div>

      {/* Screen reader content */}
      <div className="sr-only" aria-live="polite">WRI {clampedScore.toFixed(1)} out of 100</div>
    </motion.div>
  );
};

export default WriGaugeCard;
