import React from 'react';

export default function Logo({ size = 'md', showSubtitle = true, light = false }) {
  const iconSize = size === 'lg' ? 'w-11 h-11' : size === 'sm' ? 'w-8 h-8' : 'w-9 h-9';
  const textSize = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-lg' : 'text-xl';
  const subSize = size === 'lg' ? 'text-[11px]' : size === 'sm' ? 'text-[9px]' : 'text-[10px]';

  return (
    <div className="flex items-center space-x-3 select-none">
      {/* Executive Medical Cross & Shield SVG Emblem */}
      <div className={`${iconSize} relative flex items-center justify-center flex-shrink-0`}>
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-xs">
          {/* Subtle Shield Outer Path */}
          <path
            d="M24 4L7 11.5V23.2C7 33.6 14.3 43.1 24 45.8C33.7 43.1 41 33.6 41 23.2V11.5L24 4Z"
            fill="#0284C7"
            fillOpacity="0.08"
            stroke="#0284C7"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Medical Plus Cross */}
          <path
            d="M24 14V34M14 24H34"
            stroke="#0284C7"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Center Caduceus / Vital Heart Center Node */}
          <circle cx="24" cy="24" r="4.5" fill="#0EA5E9" stroke="#FFFFFF" strokeWidth="2" />
        </svg>
      </div>

      {/* Brand Text */}
      <div className="leading-tight">
        <div className="flex items-center space-x-1.5">
          <span className={`font-black ${textSize} tracking-tight ${light ? 'text-white' : 'text-slate-900'}`}>
            Medi<span className="text-sky-600">Life</span>
          </span>
          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-200">
            Hospital
          </span>
        </div>
        {showSubtitle && (
          <p className={`${subSize} font-medium tracking-wide text-slate-500 uppercase`}>
            Medical & Healthcare Operations
          </p>
        )}
      </div>
    </div>
  );
}
