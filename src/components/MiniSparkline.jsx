import React from 'react';
export function MiniSparkline({values=[],wide=false}) {
  if(values.length<2)return <span className="muted small">Not enough settled games</span>;
  const low=Math.min(...values),high=Math.max(...values),span=high-low||1;
  const points=values.map((value,index)=>(index/(values.length-1)*60+1)+','+(25-(value-low)/span*22)).join(' ');
  const positive=values.at(-1)>=values[0];
  return <svg className={`sparkline ${wide?'wide':''}`} viewBox="0 0 62 28" role="img" aria-label="Settled player price history"><polyline points={points} fill="none" stroke={positive?'#12d6ae':'#ff6578'} strokeWidth="2"/></svg>;
}
