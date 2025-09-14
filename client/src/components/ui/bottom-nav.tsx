import React from 'react';
import { Link, useLocation } from 'wouter';
import { motion } from 'framer-motion';
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
      color: 'text-blue-400',
    },
    {
      path: '/scan',
      icon: Camera,
      label: 'Scan',
      color: 'text-green-400',
    },
    {
      path: '/users',
      icon: Users,
      label: 'Usuários',
      color: 'text-purple-400',
    },
    {
      path: '/profile',
      icon: User,
      label: 'Perfil',
      color: 'text-orange-400',
    },
  ];

  return (
    <motion.nav 
      initial={false}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={cn(
        "fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-lg border-t border-border/50",
        "safe-area-pb shadow-lg",
        className
      )}
    >
      <div className="flex items-center justify-around py-3 max-w-md mx-auto relative">
        {navItems.map((item, index) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          
          return (
            <Link key={item.path} href={item.path}>
              <motion.button 
                data-testid={`nav-${item.label.toLowerCase()}`}
                className={cn(
                  "relative flex flex-col items-center space-y-1 px-4 py-2 rounded-xl transition-colors",
                  "min-w-[60px]"
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                {/* Active background */}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-primary/10 rounded-xl border border-primary/20"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                
                {/* Icon with color animation */}
                <motion.div
                  className="relative z-10"
                  animate={{
                    scale: isActive ? 1.1 : 1,
                    color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <Icon size={20} />
                  
                  {/* Active indicator glow */}
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 bg-primary/10 rounded-full"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                  )}
                </motion.div>
                
                {/* Label with animation */}
                <motion.span 
                  className={cn(
                    "text-xs font-medium relative z-10 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                  animate={{
                    scale: isActive ? 1.05 : 1,
                  }}
                  transition={{ duration: 0.3 }}
                >
                  {item.label}
                </motion.span>
                
                {/* Active indicator dot */}
                {isActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-1 w-1 h-1 bg-primary rounded-full"
                    transition={{ type: "spring", bounce: 0.4 }}
                  />
                )}
              </motion.button>
            </Link>
          );
        })}
      </div>
    </motion.nav>
  );
};

export { BottomNav };