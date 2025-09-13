import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';
import { BottomNav } from '@/components/ui/bottom-nav';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, Microchip, Users, MapPin } from 'lucide-react';

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
      <div className="min-h-screen bg-background">
        <div className="p-6 space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
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
      return <Badge className="bg-primary text-primary-foreground text-xs">Identificado</Badge>;
    } else if (confidence >= 0.5) {
      return <Badge variant="secondary" className="text-xs">Provável</Badge>;
    } else {
      return <Badge variant="destructive" className="text-xs">Não identificado</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Status Bar */}
      <div className="flex justify-between items-center px-6 pt-3 pb-2 text-sm">
        <span className="font-medium">9:41</span>
        <div className="flex items-center space-x-1">
          <i className="fas fa-signal text-xs" />
          <i className="fas fa-wifi text-xs" />
          <i className="fas fa-battery-three-quarters text-xs" />
        </div>
      </div>

      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Dashboard</h2>
            <p className="text-sm text-muted-foreground">
              Bem-vindo, {user.role === 'admin' ? 'Admin' : user.firstName || user.email}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="secondary" size="sm" data-testid="button-notifications">
              <Bell className="h-4 w-4 text-accent" />
            </Button>
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-primary-foreground">
                {getUserInitials({ firstName: user.firstName, lastName: user.lastName, email: user.email || '' })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="bg-secondary">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground text-sm">Placas Hoje</span>
                <Microchip className="h-4 w-4 text-primary" />
              </div>
              <div className="text-2xl font-bold text-foreground" data-testid="stat-boards-today">
                {statsLoading ? <Skeleton className="h-8 w-12" /> : stats?.totalToday || 0}
              </div>
              <div className="text-xs text-primary">vs mês anterior</div>
            </CardContent>
          </Card>
          
          <Card className="bg-secondary">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground text-sm">Usuários Ativos</span>
                <Users className="h-4 w-4 text-accent" />
              </div>
              <div className="text-2xl font-bold text-foreground" data-testid="stat-active-users">
                {statsLoading ? <Skeleton className="h-8 w-12" /> : stats?.activeUsers || 0}
              </div>
              <div className="text-xs text-accent">online agora</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-3 mb-4 overflow-x-auto">
          {filters.map((filter) => (
            <Button
              key={filter}
              variant={selectedFilter === filter ? "default" : "secondary"}
              size="sm"
              onClick={() => setSelectedFilter(filter)}
              data-testid={`filter-${filter.toLowerCase().replace(' ', '-')}`}
              className="shrink-0"
            >
              {filter}
            </Button>
          ))}
          <Button variant="secondary" size="sm" data-testid="button-advanced-filters">
            <i className="fas fa-filter text-muted-foreground" />
          </Button>
        </div>

        {/* Recent Scans */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">Escaneamentos Recentes</h3>
          
          {scansLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : recentScans && recentScans.length > 0 ? (
            <div className="space-y-3">
              {recentScans.slice(0, 10).map((scan) => (
                <Card key={scan.id} className="bg-secondary border border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                          <Microchip className="h-5 w-5 text-primary-foreground" />
                        </div>
                        <div>
                          <div className="font-medium text-foreground" data-testid={`board-type-${scan.id}`}>
                            {scan.boardType}
                          </div>
                          <div className="text-sm text-muted-foreground" data-testid={`user-name-${scan.id}`}>
                            {scan.user ? 
                              `${scan.user.firstName || ''} ${scan.user.lastName || ''}`.trim() || scan.user.email 
                              : 'Usuário desconhecido'
                            }
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-foreground" data-testid={`scan-time-${scan.id}`}>
                          {formatTime(scan.createdAt)}
                        </div>
                        {getStatusBadge(scan.confidence)}
                      </div>
                    </div>
                    {scan.location && (
                      <div className="text-xs text-muted-foreground" data-testid={`scan-location-${scan.id}`}>
                        <MapPin className="inline h-3 w-3 mr-1" />
                        {scan.location}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-secondary">
              <CardContent className="p-8 text-center">
                <Microchip className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum escaneamento encontrado</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Comece escaneando uma placa eletrônica
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Dashboard;
