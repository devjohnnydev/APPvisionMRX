import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';
import { BottomNav } from '@/components/ui/bottom-nav';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, Microchip, Users, MapPin, TrendingUp, Activity, Filter, Sparkles } from 'lucide-react';

interface DashboardStats {
  totalToday: number;
  totalThisMonth: number;
  totalAll: number;
  activeUsers: number;
  topBoardTypes: Array<{ boardType: string; count: number }>;
}

interface ScannedBoard {
  id: string;
  boardType: string;
  manufacturer: string | null;
  model: string | null;
  confidence: number;
  location: string | null;
  createdAt: string;
  user: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
}

const Dashboard: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [selectedFilter, setSelectedFilter] = useState<string>('Todas');

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [user, authLoading, toast]);

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
    retry: false,
  });

  const { data: recentScans, isLoading: scansLoading } = useQuery<ScannedBoard[]>({
    queryKey: ['/api/scanned-boards'],
    retry: false,
  });

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-card">
        <div className="p-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Skeleton className={`${i === 0 ? 'h-12' : i === 1 ? 'h-32' : 'h-48'} w-full rounded-xl`} />
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  const filters = ['Todas', 'Arduino', 'Raspberry Pi', 'ESP32'];

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUserInitials = (user: ScannedBoard['user']) => {
    if (!user?.firstName && !user?.lastName) {
      return user?.email?.charAt(0)?.toUpperCase() || '?';
    }
    return `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const getStatusBadge = (confidence: number) => {
    if (confidence >= 0.8) {
      return (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", bounce: 0.5 }}
        >
          <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-medium">
            Identificado
          </Badge>
        </motion.div>
      );
    } else if (confidence >= 0.5) {
      return (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", bounce: 0.5 }}
        >
          <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600 text-xs font-medium">
            Provável
          </Badge>
        </motion.div>
      );
    } else {
      return (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", bounce: 0.5 }}
        >
          <Badge variant="destructive" className="bg-red-500/20 text-red-600 text-xs font-medium">
            Não identificado
          </Badge>
        </motion.div>
      );
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen bg-gradient-to-br from-background via-card/50 to-background pb-20 relative overflow-hidden"
    >
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-10 right-10 w-32 h-32 bg-primary/5 rounded-full blur-xl"
          animate={{ scale: [1, 1.2, 1], rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-20 left-10 w-24 h-24 bg-accent/5 rounded-full blur-xl"
          animate={{ scale: [1, 0.8, 1], rotate: -360 }}
          transition={{ duration: 8, repeat: Infinity }}
        />
      </div>

      {/* Status Bar */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center px-6 pt-3 pb-2 text-sm relative z-10"
      >
        <span className="font-medium text-foreground/80">9:41</span>
        <div className="flex items-center space-x-2">
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Activity className="w-3 h-3 text-primary" />
          </motion.div>
          <div className="w-4 h-2 bg-primary/20 rounded-full">
            <div className="w-3/4 h-full bg-primary rounded-full" />
          </div>
        </div>
      </motion.div>

      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="px-6 py-6 border-b border-border/50 relative z-10"
      >
        <div className="flex items-center justify-between">
          <div>
            <motion.h2 
              className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              Dashboard
            </motion.h2>
            <motion.p 
              className="text-sm text-muted-foreground font-medium"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              Bem-vindo, {user.role === 'admin' ? '👑 Admin' : user.firstName || user.email}
            </motion.p>
          </div>
          <div className="flex items-center space-x-3">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                variant="secondary" 
                size="sm" 
                data-testid="button-notifications"
                className="relative bg-card/80 border-border/50 backdrop-blur-sm"
              >
                <Bell className="h-4 w-4 text-accent" />
                <motion.div
                  className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </Button>
            </motion.div>
            <motion.div 
              className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-full flex items-center justify-center shadow-lg"
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <span className="text-sm font-bold text-primary-foreground">
                {getUserInitials({ firstName: user.firstName, lastName: user.lastName, email: user.email || '' })}
              </span>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="px-6 py-6 relative z-10"
      >
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4 mb-8">
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <Card className="bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-sm border-border/50 shadow-lg overflow-hidden relative">
              <CardContent className="p-4">
                <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-full -translate-y-8 translate-x-8" />
                <div className="flex items-center justify-between mb-3 relative z-10">
                  <span className="text-muted-foreground text-sm font-medium">Placas Hoje</span>
                  <motion.div
                    animate={{ rotate: [0, 5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Microchip className="h-5 w-5 text-primary" />
                  </motion.div>
                </div>
                <div className="text-3xl font-bold text-foreground mb-1" data-testid="stat-boards-today">
                  {statsLoading ? (
                    <motion.div
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <Skeleton className="h-8 w-12 rounded-lg" />
                    </motion.div>
                  ) : (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", bounce: 0.5, delay: 0.5 }}
                    >
                      {stats?.totalToday || 0}
                    </motion.span>
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  <TrendingUp className="w-3 h-3 text-green-500" />
                  <span className="text-xs text-green-500 font-medium">+12% vs ontem</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <Card className="bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-sm border-border/50 shadow-lg overflow-hidden relative">
              <CardContent className="p-4">
                <div className="absolute top-0 right-0 w-16 h-16 bg-accent/10 rounded-full -translate-y-8 translate-x-8" />
                <div className="flex items-center justify-between mb-3 relative z-10">
                  <span className="text-muted-foreground text-sm font-medium">Usuários Ativos</span>
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Users className="h-5 w-5 text-accent" />
                  </motion.div>
                </div>
                <div className="text-3xl font-bold text-foreground mb-1" data-testid="stat-active-users">
                  {statsLoading ? (
                    <motion.div
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <Skeleton className="h-8 w-12 rounded-lg" />
                    </motion.div>
                  ) : (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", bounce: 0.5, delay: 0.6 }}
                    >
                      {stats?.activeUsers || 0}
                    </motion.span>
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  <motion.div
                    className="w-2 h-2 bg-green-500 rounded-full"
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                  <span className="text-xs text-green-500 font-medium">online agora</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Filters */}
        <motion.div 
          variants={itemVariants}
          className="flex items-center space-x-3 mb-6 overflow-x-auto pb-2"
        >
          {filters.map((filter, index) => (
            <motion.div
              key={filter}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 + index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant={selectedFilter === filter ? "default" : "secondary"}
                size="sm"
                onClick={() => setSelectedFilter(filter)}
                data-testid={`filter-${filter.toLowerCase().replace(' ', '-')}`}
                className={`shrink-0 relative overflow-hidden ${
                  selectedFilter === filter 
                    ? 'bg-gradient-to-r from-primary to-primary/80 shadow-lg' 
                    : 'bg-card/80 backdrop-blur-sm border-border/50'
                }`}
              >
                {selectedFilter === filter && (
                  <motion.div
                    className="absolute inset-0 bg-white/20"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                  />
                )}
                <span className="relative z-10">{filter}</span>
              </Button>
            </motion.div>
          ))}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button 
              variant="secondary" 
              size="sm" 
              data-testid="button-advanced-filters"
              className="shrink-0 bg-card/80 backdrop-blur-sm border-border/50"
            >
              <Filter className="w-4 h-4 text-muted-foreground" />
            </Button>
          </motion.div>
        </motion.div>

        {/* Recent Scans */}
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-foreground">Escaneamentos Recentes</h3>
            <motion.div
              animate={{ rotate: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Sparkles className="w-5 h-5 text-accent" />
            </motion.div>
          </div>
          
          <AnimatePresence>
            {scansLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Skeleton className="h-20 w-full rounded-xl" />
                  </motion.div>
                ))}
              </div>
            ) : recentScans && recentScans.length > 0 ? (
              <div className="space-y-3">
                {recentScans.slice(0, 10).map((scan, index) => (
                  <motion.div
                    key={scan.id}
                    initial={{ opacity: 0, x: -20, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{ 
                      delay: index * 0.1,
                      type: "spring",
                      stiffness: 100
                    }}
                    whileHover={{ scale: 1.02, x: 4 }}
                    className="group"
                  >
                    <Card className="bg-gradient-to-r from-card/80 to-card/60 backdrop-blur-sm border-border/50 hover:border-primary/20 transition-all duration-300 shadow-lg group-hover:shadow-xl overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <motion.div 
                              className="w-12 h-12 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center shadow-lg"
                              whileHover={{ rotate: 5, scale: 1.05 }}
                            >
                              <Microchip className="h-6 w-6 text-primary-foreground" />
                            </motion.div>
                            <div>
                              <motion.div 
                                className="font-semibold text-foreground group-hover:text-primary transition-colors"
                                data-testid={`board-type-${scan.id}`}
                              >
                                {scan.boardType}
                              </motion.div>
                              <div className="text-sm text-muted-foreground" data-testid={`user-name-${scan.id}`}>
                                {scan.user ? 
                                  `${scan.user.firstName || ''} ${scan.user.lastName || ''}`.trim() || scan.user.email 
                                  : 'Usuário desconhecido'
                                }
                              </div>
                            </div>
                          </div>
                          <div className="text-right space-y-1">
                            <div className="text-sm font-medium text-foreground" data-testid={`scan-time-${scan.id}`}>
                              {formatTime(scan.createdAt)}
                            </div>
                            {getStatusBadge(scan.confidence)}
                          </div>
                        </div>
                        {scan.location && (
                          <motion.div 
                            className="text-xs text-muted-foreground flex items-center space-x-1"
                            data-testid={`scan-location-${scan.id}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                          >
                            <MapPin className="w-3 h-3" />
                            <span>{scan.location}</span>
                          </motion.div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", bounce: 0.3 }}
              >
                <Card className="bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-sm border-border/30">
                  <CardContent className="p-8 text-center">
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Microchip className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                    </motion.div>
                    <p className="text-muted-foreground font-medium">Nenhum escaneamento encontrado</p>
                    <p className="text-sm text-muted-foreground/80 mt-2">
                      Comece escaneando uma placa eletrônica
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      <BottomNav />
    </motion.div>
  );
};

export default Dashboard;