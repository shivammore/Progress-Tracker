import React from 'react';

const shimmerAnim = `
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
`;

const baseStyle = {
  background: 'linear-gradient(90deg, var(--bg-card) 25%, var(--border) 50%, var(--bg-card) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s infinite',
  borderRadius: '4px',
};

export function SkeletonRow({ height = '20px', width = '100%', style = {} }) {
  return (
    <>
      <style>{shimmerAnim}</style>
      <div style={{ ...baseStyle, height, width, ...style }} />
    </>
  );
}

export function SkeletonCard({ height = '150px', style = {} }) {
  return (
    <div style={{
      ...baseStyle,
      height,
      borderRadius: '8px',
      ...style
    }} />
  );
}

export function SkeletonTable({ rows = 5, columns = 4 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
      <div style={{ display: 'flex', gap: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonRow key={i} height="15px" width={`${100/columns}%`} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: '1rem' }}>
          {Array.from({ length: columns }).map((_, j) => (
            <SkeletonRow key={j} height="15px" width={`${100/columns}%`} />
          ))}
        </div>
      ))}
    </div>
  );
}
