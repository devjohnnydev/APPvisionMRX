import React from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { BarChart3, Camera, Users, User } from 'lucide-react';

interface BottomNavProps {
  className?: string;
}

const BottomNav: React.FC<BottomNavProps> = ({ className }) => {
  const [location] = useLocation();

  const navItems = [
    {
      path: '/dashboard',
      icon: BarChart3,
      label: 'Dashboard',
    },
    {
      path: '/scan',
      icon: Camera,
      label: 'Scan',
    },
    {
      path: '/users',
      icon: Users,
      label: 'Usuários',
    },
    {
      path: '/profile',
      icon: User,
      label: 'Perfil',
    },
  ];

  return (
    <nav className={cn(
      "fixed bottom-0 left-0 right-0 bg-card border-t border-border",
      "safe-area-pb",
      className
    )}>
      <div className="flex items-center justify-around py-3 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          
          return (
            <Link key={item.path} href={item.path}>
              <button 
                data-testid={`nav-${item.label.toLowerCase()}`}
                className={cn(
                  "flex flex-col items-center space-y-1 px-3 py-1 rounded-lg transition-colors",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon size={20} />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export { BottomNav };
