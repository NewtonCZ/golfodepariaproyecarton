import React from 'react';
import { motion } from 'motion/react';

interface SparkleDiamondProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const SparkleDiamond: React.FC<SparkleDiamondProps> = ({
  className = '',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10 sm:w-11 sm:h-11',
    lg: 'w-12 h-12 sm:w-14 sm:h-14',
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none flex-shrink-0 ${className}`}
      style={{ margin: '0 4px' }}
    >
      {/* 1. Radiant Blue & Pure White Glowing Aura */}
      <motion.div
        className="absolute inset-[-8px] rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(56, 189, 248, 0.7) 0%, rgba(37, 99, 235, 0.45) 45%, rgba(147, 197, 253, 0) 75%)',
          filter: 'blur(5px)',
        }}
        animate={{
          scale: [1, 1.25, 1],
          opacity: [0.8, 1, 0.8],
        }}
        transition={{
          duration: 2.6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* 2. Subtle Radiant Light Rays */}
      <motion.div
        className="absolute inset-[-16px] flex items-center justify-center pointer-events-none"
        animate={{
          rotate: [0, 360],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        {/* Horizontal Light Ray */}
        <div className="absolute w-full h-[1.5px] bg-gradient-to-r from-transparent via-cyan-200 via-white to-transparent opacity-75 blur-[0.5px]" />
        {/* Vertical Light Ray */}
        <div className="absolute h-full w-[1.5px] bg-gradient-to-b from-transparent via-cyan-200 via-white to-transparent opacity-75 blur-[0.5px]" />
        {/* Diagonal Ray 1 */}
        <div className="absolute w-3/4 h-[1px] rotate-45 bg-gradient-to-r from-transparent via-sky-300 to-transparent opacity-50" />
        {/* Diagonal Ray 2 */}
        <div className="absolute w-3/4 h-[1px] -rotate-45 bg-gradient-to-r from-transparent via-sky-300 to-transparent opacity-50" />
      </motion.div>

      {/* Micro-sparkles */}
      <motion.div
        className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_10px_#ffffff]"
        animate={{
          scale: [0.5, 1.3, 0.5],
          opacity: [0.3, 1, 0.3],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_8px_#67e8f9]"
        animate={{
          scale: [1.2, 0.4, 1.2],
          opacity: [0.9, 0.3, 0.9],
        }}
        transition={{
          duration: 1.8,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.3,
        }}
      />

      {/* 3. Tilted Square Diamond Container with 4-Point Star Sparkle inside */}
      <motion.div
        className={`relative ${sizeClasses[size]} rounded-xl flex items-center justify-center overflow-hidden cursor-pointer shadow-[0_0_20px_rgba(14,165,233,0.85),0_0_35px_rgba(59,130,246,0.6),inset_0_0_10px_rgba(255,255,255,0.8)]`}
        style={{
          transform: 'rotate(-12deg)',
          background: 'linear-gradient(135deg, #ffffff 0%, #38bdf8 25%, #0284c7 60%, #1e3a8a 100%)',
          border: '2px solid rgba(255, 255, 255, 0.95)',
        }}
        whileHover={{
          scale: 1.1,
          rotate: 15,
        }}
        transition={{ type: 'spring', stiffness: 350, damping: 20 }}
      >
        {/* Animated Light Sweep / Glint across square */}
        <motion.div
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{
            background:
              'linear-gradient(105deg, transparent 15%, rgba(255,255,255,0.9) 50%, transparent 85%)',
          }}
          animate={{
            x: ['-150%', '150%'],
          }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            repeatDelay: 1.1,
            ease: 'easeInOut',
          }}
        />

        {/* Glossy top highlight layer */}
        <div
          className="absolute inset-x-0 top-0 h-[45%] pointer-events-none opacity-70"
          style={{
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(255,255,255,0))',
            borderRadius: '8px 8px 0 0',
          }}
        />

        {/* 4. Center Glowing Star Sparkle */}
        <div
          className="relative z-10 flex items-center justify-center pointer-events-none"
          style={{ transform: 'rotate(-12deg)' }}
        >
          {/* Central 4-pointed Star Sparkle SVG */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.95)]"
          >
            <path
              d="M12 2C12 7.5 7.5 12 2 12C7.5 12 12 16.5 12 22C12 16.5 16.5 12 22 12C16.5 12 12 7.5 12 2Z"
              fill="white"
            />
          </svg>
        </div>
      </motion.div>
    </div>
  );
};
