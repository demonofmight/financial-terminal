import { ReactNode } from 'react';

interface CardProps {
  title: string;
  children: ReactNode;
  className?: string;
  headerAction?: ReactNode;
  onClick?: () => void;
}

export function Card({ title, children, className = '', headerAction, onClick }: CardProps) {
  return (
    <div
      className={`terminal-card glow-border ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      <div className="terminal-card-header">
        <h3 className="terminal-card-title flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-neon-green rounded-full opacity-60"></span>
          {title}
        </h3>
        {headerAction}
      </div>
      <div className="terminal-card-body">
        {children}
      </div>
    </div>
  );
}
