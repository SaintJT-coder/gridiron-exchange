import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
export function Modal({title,onClose,children}) {
  const ref=useRef(null);
  useEffect(()=>{
    const previous=document.activeElement, root=document.getElementById('root'), inert=root.inert, overflow=document.body.style.overflow;
    root.inert=true; document.body.style.overflow='hidden';ref.current.querySelector('button')?.focus();
    const handler=event=>{
      if(event.key==='Escape') onClose();
      if(event.key!=='Tab') return;
      const controls=[...ref.current.querySelectorAll('button,input,select,a[href]')].filter(n=>!n.disabled);
      const first=controls[0],last=controls.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    };
    document.addEventListener('keydown',handler);
    return()=>{root.inert=inert;document.body.style.overflow=overflow;document.removeEventListener('keydown',handler);previous?.focus();};
  },[onClose]);
  return createPortal(<div className="player-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}><section ref={ref} className="player-dialog compact-dialog" role="dialog" aria-modal="true" aria-label={title}><div className="panel-heading"><h2>{title}</h2><button className="detail-close" onClick={onClose} aria-label="Close dialog">×</button></div>{children}</section></div>,document.body);
}
