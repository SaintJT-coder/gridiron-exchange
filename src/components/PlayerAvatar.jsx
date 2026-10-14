import React from 'react';
import { useState } from 'react';

export function PlayerAvatar({ player, size = 'md' }) {
  const [failed, setFailed] = useState(false);
  const initials = player.name.split(' ').map(x => x[0]).slice(0, 2).join('');
  return <span className={`player-avatar ${size} ${failed ? 'avatar-fallback' : ''}`}>
    {!failed && player.headshot
      ? <img src={player.headshot} alt={`${player.name} headshot`} loading="lazy" onError={() => setFailed(true)} />
      : <span>{initials}</span>}
  </span>;
}