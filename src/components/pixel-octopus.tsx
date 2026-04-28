'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const _ = null;
const L = '#fb923c'; // head highlight (brand-400)
const M = '#f97316'; // main body (brand-500)
const D = '#ea580c'; // belly shadow (brand-600)
const E = '#111827'; // eyes (dark)

type Grid = (string | null)[][];

const bodyGrid: Grid = [
  [_, _, _, L, L, L, L, _, _, _],
  [_, _, L, L, L, L, L, L, _, _],
  [_, M, M, M, M, M, M, M, M, _],
  [M, M, M, E, M, M, E, M, M, M],
  [M, M, M, M, M, M, M, M, M, M],
  [_, D, D, D, D, D, D, D, D, _],
  [_, _, D, D, D, D, D, D, _, _],
];

const tentaclesA: Grid = [
  [_, M, _, M, _, _, M, _, M, _],
  [M, _, _, _, M, M, _, _, _, M],
];

const tentaclesB: Grid = [
  [M, _, M, _, _, _, _, M, _, M],
  [_, M, _, _, M, M, _, _, M, _],
];

function gridToShadow(grid: Grid, px: number, yOff = 0): string {
  const parts: string[] = [];
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const c = grid[y][x];
      if (c) parts.push(`${x * px}px ${(y + yOff) * px}px 0 0.5px ${c}`);
    }
  }
  return parts.join(', ');
}

function buildFrame(px: number, tentacles: Grid): string {
  return `${gridToShadow(bodyGrid, px)}, ${gridToShadow(tentacles, px, bodyGrid.length)}`;
}

interface FallingOctopus {
  id: number;
  x: number;
  delay: number;
  duration: number;
  size: number;
  wobble: number;
}

let nextId = 0;

function MiniOctopus({ px }: { px: number }) {
  const shadow = buildFrame(px, Math.random() > 0.5 ? tentaclesA : tentaclesB);
  return (
    <div
      style={{
        width: px,
        height: px,
        boxShadow: shadow,
      }}
    />
  );
}

function FallingOverlay({ items, onDone }: { items: FallingOctopus[]; onDone: () => void }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const maxTime = Math.max(...items.map((o) => (o.delay + o.duration) * 1000));
    const timer = setTimeout(onDone, maxTime + 200);
    return () => clearTimeout(timer);
  }, [items, onDone]);

  if (!mounted) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9999,
        overflow: 'hidden',
      }}
    >
      {items.map((o) => (
        <div
          key={o.id}
          className="octopus-rain"
          style={{
            position: 'absolute',
            left: `${o.x}%`,
            top: -60,
            animationDelay: `${o.delay}s`,
            animationDuration: `${o.duration}s`,
            // wobble via CSS custom property
            '--wobble': `${o.wobble}deg`,
          } as React.CSSProperties}
        >
          <MiniOctopus px={o.size} />
        </div>
      ))}
    </div>,
    document.body,
  );
}

export default function PixelOctopus({ size = 6 }: { size?: number }) {
  const cols = 10;
  const rows = bodyGrid.length + tentaclesA.length;
  const frameA = buildFrame(size, tentaclesA);
  const frameB = buildFrame(size, tentaclesB);
  const blink = `${3 * size}px ${3 * size}px 0 0.5px ${M}, ${6 * size}px ${3 * size}px 0 0.5px ${M}`;

  const [batches, setBatches] = useState<FallingOctopus[][]>([]);
  const batchRef = useRef(0);

  const handleClick = useCallback(() => {
    const batch: FallingOctopus[] = Array.from({ length: 30 }, (__, i) => ({
      id: nextId++,
      // spread evenly across full width with slight randomness
      x: (i / 30) * 100 + Math.random() * 3,
      delay: Math.random() * 0.6,
      duration: 2.5 + Math.random() * 1.5,
      size: 3 + Math.floor(Math.random() * 3),
      wobble: -20 + Math.random() * 40,
    }));

    const idx = batchRef.current++;
    setBatches((prev) => [...prev, batch]);

    // cleanup handled by FallingOverlay onDone
    void idx;
  }, []);

  const removeBatch = useCallback((index: number) => {
    setBatches((prev) => prev.filter((__, i) => i !== index));
  }, []);

  return (
    <>
      <div
        className="octopus-hover cursor-pointer"
        aria-hidden="true"
        onClick={handleClick}
      >
        <div
          className="octopus-float relative"
          style={{ width: cols * size, height: rows * size }}
        >
          <div
            className="octopus-frame-a absolute top-0 left-0"
            style={{ width: size, height: size, boxShadow: frameA }}
          />
          <div
            className="octopus-frame-b absolute top-0 left-0"
            style={{ width: size, height: size, boxShadow: frameB }}
          />
          <div
            className="octopus-blink absolute top-0 left-0"
            style={{ width: size, height: size, boxShadow: blink }}
          />
        </div>
      </div>

      {batches.map((batch, i) => (
        <FallingOverlay key={i} items={batch} onDone={() => removeBatch(i)} />
      ))}
    </>
  );
}
