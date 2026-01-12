import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  title: string;
  children: ReactNode;
  className?: string;
  headerAction?: ReactNode;
  onClick?: () => void;
  compact?: boolean;
}

export function Card({ title, children, className = '', headerAction, onClick, compact = false }: CardProps) {
  return (
    <motion.div
      className={`terminal-card ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      whileHover={onClick ? { scale: 1.005 } : undefined}
    >
      <div className={`terminal-card-header ${compact ? 'py-2' : ''}`}>
        <h3 className="terminal-card-title flex items-center gap-2">
          <span className="status-dot live"></span>
          {title}
        </h3>
        {headerAction}
      </div>
      <div className={`terminal-card-body ${compact ? 'p-2' : ''}`}>
        {children}
      </div>
    </motion.div>
  );
}
