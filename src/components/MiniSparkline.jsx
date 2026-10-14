import React from 'react';
export function MiniSparkline({ positive = true, wide = false }) {
  const points = positive ? '0,24 9,19 17,21 25,11 34,15 43,8 52,12 61,2' : '0,3 9,7 17,5 25,15 34,12 43,21 52,17 61,25';
  return <svg className={`sparkline ${wide ? 'wide' : ''}`} viewBox="0 0 62 28" preserveAspectRatio="none" aria-label={positive ? 'Upward trend' : 'Downward trend'}>
    <polyline points={points} fill="none" stroke={positive ? '#12d6ae' : '#ff6578'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>;
}