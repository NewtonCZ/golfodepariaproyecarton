import React from 'react';
import { motion } from 'motion/react';

interface SuperSparkleBadgeProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const SuperSparkleBadge: React.FC<SuperSparkleBadgeProps> = ({
  className = '',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-7 h-7 text-[9px]',
    md: 'w-8 h-8 sm:w-9 sm:h-9 text-[10px] sm:text-[11px]',
    lg: 'w-10 h-10 sm:w-12 sm:h-12 text-xs sm:text-sm',
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none flex-shrink-0 ${className}`}
      style={{ margin: '0 4px' }}
      title="SUPER"
    >
      {/* 1. Outer Radiant Blue & Pure White Glowing Aura (Breathing pulse) */}
      <motion.div
        className="absolute inset-[-6px] rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(56, 189, 248, 0.65) 0%, rgba(37, 99, 235, 0.45) 45%, rgba(147, 197, 253, 0) 75%)',
          filter: 'blur(4px)',
        }}
        animate={{
          scale: [1, 1.22, 1],
          opacity: [0.75, 1, 0.75],
        }}
        transition={{
          duration: 2.8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* 2. Subtle Radiant Light Rays (Star / Cross Flares) */}
      <motion.div
        className="absolute inset-[-14px] flex items-center justify-center pointer-events-none"
        animate={{
          rotate: [0, 360],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        {/* Horizontal Light Ray */}
        <div className="absolute w-full h-[1.5px] bg-gradient-to-r from-transparent via-cyan-200 via-white to-transparent opacity-70 blur-[0.5px]" />
        {/* Vertical Light Ray */}
        <div className="absolute h-full w-[1.5px] bg-gradient-to-b from-transparent via-cyan-200 via-white to-transparent opacity-70 blur-[0.5px]" />
        {/* Diagonal Ray 1 */}
        <div className="absolute w-3/4 h-[1px] rotate-45 bg-gradient-to-r from-transparent via-sky-300 to-transparent opacity-50" />
        {/* Diagonal Ray 2 */}
        <div className="absolute w-3/4 h-[1px] -rotate-45 bg-gradient-to-r from-transparent via-sky-300 to-transparent opacity-50" />
      </motion.div>

      {/* Secondary micro-sparkles */}
      <motion.div
        className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#ffffff]"
        animate={{
          scale: [0.6, 1.3, 0.6],
          opacity: [0.4, 1, 0.4],
        }}
        transition={{
          duration: 1.6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="absolute -bottom-1 -left-1 w-1.5 h-1.5 rounded-full bg-cyan-300 shadow-[0_0_6px_#67e8f9]"
        animate={{
          scale: [1.2, 0.5, 1.2],
          opacity: [0.9, 0.3, 0.9],
        }}
        transition={{
          duration: 1.9,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.4,
        }}
      />

      {/* 3. Tilted Square Diamond Container */}
      <motion.div
        className={`relative ${sizeClasses[size]} rounded-lg flex items-center justify-center overflow-hidden cursor-default shadow-[0_0_15px_rgba(14,165,233,0.8),0_0_30px_rgba(59,130,246,0.5),inset_0_0_8px_rgba(255,255,255,0.7)]`}
        style={{
          transform: 'rotate(12deg)',
          background: 'linear-gradient(135deg, #ffffff 0%, #38bdf8 25%, #0284c7 60%, #1e3a8a 100%)',
          border: '1.5px solid rgba(255, 255, 255, 0.95)',
        }}
        whileHover={{
          scale: 1.12,
          rotate: 15,
        }}
        transition={{ type: 'spring', stiffness: 350, damping: 20 }}
      >
        {/* Animated Light Sweep / Glint across square */}
        <motion.div
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{
            background:
              'linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.85) 50%, transparent 80%)',
          }}
          animate={{
            x: ['-140%', '140%'],
          }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            repeatDelay: 1.2,
            ease: 'easeInOut',
          }}
        />

        {/* Glossy top highlight layer */}
        <div
          className="absolute inset-x-0 top-0 h-[45%] pointer-events-none opacity-60"
          style={{
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.9), rgba(255,255,255,0))',
            borderRadius: '6px 6px 0 0',
          }}
        />

        {/* 4. Elegant Text "super" in center */}
        <span
          className="relative z-10 font-black italic tracking-wide lowercase text-white drop-shadow-[0_1px_3px_rgba(3,7,18,0.95)]"
          style={{
            fontFamily: '"Montserrat", "Plus Jakarta Sans", system-ui, -apple-system, sans-serif',
            textShadow: '0 0 8px rgba(255, 255, 255, 0.8), 0 1px 2px rgba(2, 6, 23, 0.9)',
            letterSpacing: '0.04em',
            transform: 'rotate(-12deg)', // counter-rotate for optimal readability while square stays tilted
          }}
        >
          super
        </span>
      </motion.div>
    </div>
  );
};
