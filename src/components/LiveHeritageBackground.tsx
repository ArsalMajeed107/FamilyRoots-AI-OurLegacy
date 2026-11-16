import React from 'react';

interface LiveHeritageBackgroundProps {
  intense?: boolean;
}

export const LiveHeritageBackground: React.FC<LiveHeritageBackgroundProps> = ({ intense = false }) => {
  return (
    <div
      aria-hidden="true"
      className="no-print pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#F7F5EF] dark:bg-[#060E1B]"
    >
      {/* Subtle Architectural Heritage Wallpaper Layer */}
      <div
        className={`animate-heritage-drift absolute inset-0 bg-cover bg-center transition-opacity duration-700 ${
          intense
            ? 'opacity-[0.09] dark:opacity-[0.16]'
            : 'opacity-[0.05] dark:opacity-[0.10]'
        }`}
        style={{ backgroundImage: "url('/src/assets/images/hero_heritage_estate_1794849066720.jpg')" }}
      />

      {/* Navy, Ivory & Golden Atmospheric Radial Washes */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 75% 55% at 50% 12%, rgba(212, 175, 55, 0.14), transparent 70%), radial-gradient(ellipse 80% 60% at 15% 85%, rgba(15, 35, 66, 0.08), transparent 70%), radial-gradient(ellipse 70% 50% at 88% 75%, rgba(201, 154, 46, 0.10), transparent 70%)',
        }}
      />
      <div
        className="absolute inset-0 hidden dark:block"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% 10%, rgba(212, 175, 55, 0.16), transparent 68%), radial-gradient(ellipse 85% 65% at 20% 80%, rgba(30, 58, 108, 0.28), transparent 72%), radial-gradient(ellipse 65% 55% at 85% 30%, rgba(212, 175, 55, 0.08), transparent 70%)',
        }}
      />

      {/* Large Animated Multi-Generational Family Tree Illustration */}
      <svg
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        className={`absolute inset-0 h-full w-full ${
          intense ? 'opacity-[0.58] dark:opacity-[0.65]' : 'opacity-[0.34] dark:opacity-[0.40]'
        }`}
      >
        <defs>
          <linearGradient id="goldBranchGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.65" />
            <stop offset="50%" stopColor="#B8860B" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.18" />
          </linearGradient>
          <linearGradient id="navyBranchGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1E3A63" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#475569" stopOpacity="0.14" />
          </linearGradient>
          <radialGradient id="nodeHalo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Heritage Orbit Rings */}
        <circle
          cx="720"
          cy="170"
          r="240"
          fill="none"
          stroke="url(#goldBranchGrad)"
          strokeWidth="0.75"
          strokeOpacity="0.35"
        />
        <circle
          cx="720"
          cy="170"
          r="390"
          fill="none"
          stroke="url(#navyBranchGrad)"
          strokeWidth="0.75"
          strokeDasharray="6 10"
          strokeOpacity="0.35"
        />

        {/* Root Trunk & Gen 0 Founding Couple Anchor (y=170) */}
        <path
          d="M 720 880 C 720 680, 720 420, 720 170"
          fill="none"
          stroke="url(#goldBranchGrad)"
          strokeWidth="2.2"
          strokeOpacity="0.45"
        />
        <path
          d="M 720 880 C 720 680, 720 420, 720 170"
          fill="none"
          stroke="#D4AF37"
          strokeWidth="2"
          strokeOpacity="0.55"
          className="animate-lineage-flow"
        />

        {/* Gen 0 -> Gen 1 Connecting Lineage Curves */}
        <g fill="none" strokeWidth="1.6">
          {/* Left Branch (Elder Son / Daughter Line) */}
          <path
            d="M 720 195 C 570 215, 470 280, 390 365"
            stroke="url(#goldBranchGrad)"
          />
          <path
            d="M 720 195 C 570 215, 470 280, 390 365"
            stroke="#D4AF37"
            strokeOpacity="0.55"
            className="animate-lineage-flow"
          />

          {/* Center Branch */}
          <path
            d="M 720 195 C 720 260, 720 305, 720 365"
            stroke="url(#goldBranchGrad)"
          />
          <path
            d="M 720 195 C 720 260, 720 305, 720 365"
            stroke="#D4AF37"
            strokeOpacity="0.5"
            className="animate-lineage-flow-slow"
          />

          {/* Right Branch */}
          <path
            d="M 720 195 C 870 215, 970 280, 1050 365"
            stroke="url(#goldBranchGrad)"
          />
          <path
            d="M 720 195 C 870 215, 970 280, 1050 365"
            stroke="#D4AF37"
            strokeOpacity="0.55"
            className="animate-lineage-flow"
          />

          {/* Outer Ancestral Wings */}
          <path
            d="M 720 195 C 460 205, 290 270, 170 390"
            stroke="url(#navyBranchGrad)"
          />
          <path
            d="M 720 195 C 980 205, 1150 270, 1270 390"
            stroke="url(#navyBranchGrad)"
          />
        </g>

        {/* Gen 1 -> Gen 2 Grandchildren Connecting Curves */}
        <g fill="none" strokeWidth="1.25">
          <path d="M 390 365 C 320 440, 260 495, 220 570" stroke="url(#goldBranchGrad)" />
          <path d="M 390 365 C 430 445, 455 505, 475 570" stroke="url(#navyBranchGrad)" />
          <path
            d="M 390 365 C 320 440, 260 495, 220 570"
            stroke="#D4AF37"
            strokeOpacity="0.45"
            className="animate-lineage-flow-slow"
          />

          <path d="M 720 365 C 660 445, 635 500, 610 570" stroke="url(#goldBranchGrad)" />
          <path d="M 720 365 C 780 445, 805 500, 830 570" stroke="url(#goldBranchGrad)" />
          <path
            d="M 720 365 C 780 445, 805 500, 830 570"
            stroke="#D4AF37"
            strokeOpacity="0.45"
            className="animate-lineage-flow"
          />

          <path d="M 1050 365 C 1010 445, 985 505, 965 570" stroke="url(#navyBranchGrad)" />
          <path d="M 1050 365 C 1120 440, 1180 495, 1220 570" stroke="url(#goldBranchGrad)" />
          <path
            d="M 1050 365 C 1120 440, 1180 495, 1220 570"
            stroke="#D4AF37"
            strokeOpacity="0.45"
            className="animate-lineage-flow-slow"
          />
        </g>

        {/* Gen 2 -> Gen 3 Great-Grandchildren Connecting Curves */}
        <g fill="none" strokeWidth="1" strokeOpacity="0.65">
          <path d="M 220 570 C 175 645, 145 700, 125 775" stroke="url(#goldBranchGrad)" />
          <path d="M 220 570 C 255 645, 275 700, 290 775" stroke="url(#navyBranchGrad)" />
          <path d="M 475 570 C 445 645, 420 700, 405 775" stroke="url(#navyBranchGrad)" />
          <path d="M 475 570 C 510 645, 535 700, 550 775" stroke="url(#goldBranchGrad)" />
          <path d="M 610 570 C 595 645, 585 700, 580 775" stroke="url(#navyBranchGrad)" />
          <path d="M 830 570 C 845 645, 855 700, 860 775" stroke="url(#navyBranchGrad)" />
          <path d="M 965 570 C 930 645, 905 700, 890 775" stroke="url(#goldBranchGrad)" />
          <path d="M 1220 570 C 1185 645, 1165 700, 1150 775" stroke="url(#navyBranchGrad)" />
          <path d="M 1220 570 C 1265 645, 1295 700, 1315 775" stroke="url(#goldBranchGrad)" />
        </g>

        {/* Founding Couple Crown Rings (Grandfather & Grandmother) */}
        <g className="animate-lineage-glow">
          <circle cx="720" cy="170" r="64" fill="url(#nodeHalo)" />
          <circle cx="702" cy="170" r="22" fill="none" stroke="#D4AF37" strokeWidth="1.8" />
          <circle cx="738" cy="170" r="22" fill="none" stroke="#D4AF37" strokeWidth="1.8" />
          <circle cx="702" cy="170" r="5" fill="#D4AF37" />
          <circle cx="738" cy="170" r="5" fill="#D4AF37" />
        </g>

        {/* Gen 1 Ancestral Nodes */}
        {[
          { x: 170, y: 390, r: 9 },
          { x: 390, y: 365, r: 14 },
          { x: 720, y: 365, r: 14 },
          { x: 1050, y: 365, r: 14 },
          { x: 1270, y: 390, r: 9 },
        ].map((node, i) => (
          <g key={`g1-${i}`} className="animate-lineage-glow">
            <circle cx={node.x} cy={node.y} r={node.r * 2.4} fill="url(#nodeHalo)" />
            <circle
              cx={node.x}
              cy={node.y}
              r={node.r}
              fill="none"
              stroke="#D4AF37"
              strokeWidth="1.5"
            />
            <circle cx={node.x} cy={node.y} r={4} fill="#D4AF37" />
          </g>
        ))}

        {/* Gen 2 Grandchildren Nodes */}
        {[
          { x: 220, y: 570 },
          { x: 475, y: 570 },
          { x: 610, y: 570 },
          { x: 830, y: 570 },
          { x: 965, y: 570 },
          { x: 1220, y: 570 },
        ].map((node, i) => (
          <g key={`g2-${i}`}>
            <circle cx={node.x} cy={node.y} r={10} fill="none" stroke="#C99A2E" strokeWidth="1.2" strokeOpacity="0.65" />
            <circle cx={node.x} cy={node.y} r={3.2} fill="#C99A2E" fillOpacity="0.8" />
          </g>
        ))}

        {/* Gen 3 Great-Grandchildren Leaf Nodes */}
        {[125, 290, 405, 550, 890, 1150, 1315].map((x, i) => (
          <circle
            key={`g3-${i}`}
            cx={x}
            cy={775}
            r={3.5}
            fill="#D4AF37"
            fillOpacity="0.55"
          />
        ))}
      </svg>

      {/* Soft Readability Scrim */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#FAF9F6]/65 via-transparent to-[#FAF9F6]/80 dark:from-[#060E1B]/55 dark:via-transparent dark:to-[#060E1B]/85" />
    </div>
  );
};
