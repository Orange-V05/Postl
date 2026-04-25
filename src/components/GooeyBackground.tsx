import React, { useEffect, useRef } from 'react';
import './GooeyBackground.css';

/**
 * A mesmerising, interactive gooey liquid gradient background for POSTL v4.0.
 * Adapted to match the app's emerald/teal/violet "Ferrari" aesthetic.
 */
export const GooeyBackground: React.FC = () => {
  const interactiveRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let curX = 0;
    let curY = 0;
    let tgX = 0;
    let tgY = 0;
    let animationFrameId: number;

    const handleMouseMove = (event: MouseEvent) => {
      tgX = event.clientX;
      tgY = event.clientY;
    };

    const animate = () => {
      if (!interactiveRef.current) return;
      
      // Smoothing factor for mouse follow
      curX += (tgX - curX) / 15; // Slightly faster follow
      curY += (tgY - curY) / 15;
      
      interactiveRef.current.style.transform = `translate3d(${Math.round(curX)}px, ${Math.round(curY)}px, 0)`;
      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', handleMouseMove);
    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[-5] overflow-hidden bg-[var(--bg-color)] transition-colors duration-700">
      <div className="gooey-container">
        <svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" className="absolute">
          <defs>
            <filter id="goo">
              <feGaussianBlur in="SourceGraphic" stdDeviation="15" result="blur" />
              <feColorMatrix 
                in="blur" 
                mode="matrix" 
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10" 
                result="goo" 
              />
              <feBlend in="SourceGraphic" in2="goo" />
            </filter>
          </defs>
        </svg>
        <div className="gradients-wrapper">
          {/* Main Blobs - Using Postl's brand colors */}
          <div className="blob g1"></div>
          <div className="blob g2"></div>
          <div className="blob g3"></div>
          <div className="blob g4"></div>
          <div className="blob g5"></div>
          
          {/* Mouse Interactivity */}
          <div ref={interactiveRef} className="blob interactive"></div>
        </div>
      </div>
      
      {/* Noise detail overlay to maintain Postl's texture */}
      <div className="absolute inset-0 opacity-[var(--noise-opacity)] mix-blend-overlay pointer-events-none" 
        style={{ 
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")` 
        }} 
      />
    </div>
  );
};

export default GooeyBackground;
