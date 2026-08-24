import React from 'react';

interface MindsetGaugeProps {
  value: number; // 0 (Tendu/Rouge) -> 100 (À l'aise/Vert)
  compact?: boolean;
}

export function MindsetGauge({ value, compact = true }: MindsetGaugeProps) {
  // Clamp value between 0 and 100
  const clampedValue = Math.max(0, Math.min(100, value ?? 50));

  // Determine state label, color class and dot styling
  // Realistic tiers:
  // <= 25: Tendu (Red)
  // 26 - 45: Vulnérable / Stressé (Orange)
  // 46 - 75: Équilibré / Neutre (Amber/Yellow)
  // 76 - 89: Positif (Light Emerald)
  // >= 90: À l'aise / Serein (Emerald)
  let label = "Équilibré";
  let textColor = "text-amber-400";
  let dotColor = "#f59e0b";

  if (clampedValue <= 25) {
    label = "Tendu";
    textColor = "text-rose-400";
    dotColor = "#f43f5e";
  } else if (clampedValue <= 45) {
    label = "Vulnérable";
    textColor = "text-amber-500";
    dotColor = "#f97316";
  } else if (clampedValue < 80) {
    label = "Équilibré";
    textColor = "text-amber-400";
    dotColor = "#eab308";
  } else if (clampedValue < 90) {
    label = "Confiant";
    textColor = "text-emerald-400";
    dotColor = "#34d399";
  } else {
    label = "À l'aise";
    textColor = "text-emerald-300";
    dotColor = "#10b981";
  }

  // Arc parameters
  const width = compact ? 76 : 100;
  const height = compact ? 30 : 40;
  const cx = width / 2;
  const cy = height - 4;
  const radius = compact ? 24 : 32;

  // Angle from 0 (left / Tendu) to PI (right / À l'aise)
  const angleRad = (clampedValue / 100) * Math.PI;
  const dotX = cx - radius * Math.cos(angleRad);
  const dotY = cy - radius * Math.sin(angleRad);

  let tooltipText = `Mentalité : ${label}`;

  return (
    <div 
      className="flex flex-col items-center justify-center cursor-help group select-none transition-all duration-300"
      title={tooltipText}
    >
      <div className="relative flex items-center justify-center">
        <svg width={width} height={height} className="overflow-visible">
          <defs>
            {/* Smooth gradient from Red to Yellow to Green */}
            <linearGradient id="mindsetGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>

            {/* Glowing filter for needle */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Track Arc */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke="rgba(255, 255, 255, 0.12)"
            strokeWidth={compact ? "3.5" : "4.5"}
            strokeLinecap="round"
          />

          {/* Gradient Arc */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke="url(#mindsetGradient)"
            strokeWidth={compact ? "3.5" : "4.5"}
            strokeLinecap="round"
          />

          {/* Center baseline tick mark */}
          <line
            x1={cx}
            y1={cy - radius + 1}
            x2={cx}
            y2={cy - radius + 4}
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1.2"
          />

          {/* Indicator Line from center to dot */}
          <line
            x1={cx}
            y1={cy}
            x2={dotX}
            y2={dotY}
            stroke={dotColor}
            strokeWidth="1.6"
            strokeLinecap="round"
            filter="url(#glow)"
          />

          {/* Indicator Dot */}
          <circle
            cx={dotX}
            cy={dotY}
            r={compact ? "2.5" : "3.5"}
            fill={dotColor}
            stroke="#0f172a"
            strokeWidth="1.2"
            filter="url(#glow)"
          />

          {/* Center pivot dot */}
          <circle
            cx={cx}
            cy={cy}
            r="1.8"
            fill="#94a3b8"
          />
        </svg>
      </div>

      <div className="flex items-center justify-center -mt-0.5">
        <span className={`text-[9px] font-bold uppercase tracking-wider ${textColor}`}>
          {label}
        </span>
      </div>
    </div>
  );
}

