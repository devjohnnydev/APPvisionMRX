import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { BottomNav } from '@/components/ui/bottom-nav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings, User, Lock, Download, Palette, LogOut, ChevronRight } from 'lucide-react';

const Profile: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

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

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  const handleEditProfile = () => {
    toast({
      title: "Em desenvolvimento",
      description: "Funcionalidade de edição de perfil em breve!",
    });
  };

  const handleChangePassword = () => {
    toast({
      title: "Em desenvolvimento",
      description: "Funcionalidade de alteração de senha em breve!",
    });
  };

  const handleExportData = () => {
    toast({
      title: "Em desenvolvimento",
      description: "Funcionalidade de exportação de dados em breve!",
    });
  };

  const handleChangeTheme = () => {
    toast({
      title: "Em desenvolvimento",
      description: "Funcionalidade de alteração de tema em breve!",
    });
  };

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

  const getUserInitials = () => {
    if (!user.firstName && !user.lastName) {
      return (user.email || '').charAt(0).toUpperCase();
    }
    return `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const getUserDisplayName = () => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) {
      return user.firstName;
    }
    return user.email;
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
          <h2 className="text-xl font-bold text-foreground">Perfil</h2>
          <Button variant="ghost" size="sm" data-testid="button-settings">
            <Settings className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Profile Info */}
      <div className="px-6 py-6">
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-primary rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-3xl font-bold text-primary-foreground" data-testid="user-initials">
              {getUserInitials()}
            </span>
          </div>
          <h3 className="text-xl font-bold text-foreground mb-1" data-testid="user-name">
            {getUserDisplayName()}
          </h3>
          <p className="text-muted-foreground" data-testid="user-role">
            {user.role === 'admin' ? 'Administrador Principal' : 'Usuário'}
          </p>
          <div className="flex items-center justify-center space-x-2 mt-2">
            <div className="w-2 h-2 bg-primary rounded-full" />
            <span className="text-sm text-primary">Online</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground" data-testid="stat-scans">0</div>
            <div className="text-xs text-muted-foreground">Placas Escaneadas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground" data-testid="stat-users">
              {user.role === 'admin' ? '0' : '-'}
            </div>
            <div className="text-xs text-muted-foreground">
              {user.role === 'admin' ? 'Usuários Criados' : 'N/A'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground" data-testid="stat-days">1d</div>
            <div className="text-xs text-muted-foreground">Último Login</div>
          </div>
        </div>

        {/* Menu Options */}
        <div className="space-y-3">
          <Button 
            variant="secondary" 
            className="w-full justify-between h-auto p-4"
            onClick={handleEditProfile}
            data-testid="button-edit-profile"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <div className="font-medium text-foreground">Editar Perfil</div>
                <div className="text-sm text-muted-foreground">Alterar dados pessoais</div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Button>

          <Button 
            variant="secondary" 
            className="w-full justify-between h-auto p-4"
            onClick={handleChangePassword}
            data-testid="button-change-password"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center">
                <Lock className="h-5 w-5 text-accent" />
              </div>
              <div className="text-left">
                <div className="font-medium text-foreground">Alterar Senha</div>
                <div className="text-sm text-muted-foreground">Segurança da conta</div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Button>

          <Button 
            variant="secondary" 
            className="w-full justify-between h-auto p-4"
            onClick={handleExportData}
            data-testid="button-export-data"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Download className="h-5 w-5 text-blue-400" />
              </div>
              <div className="text-left">
                <div className="font-medium text-foreground">Exportar Dados</div>
                <div className="text-sm text-muted-foreground">Relatórios e backups</div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Button>

          <Button 
            variant="secondary" 
            className="w-full justify-between h-auto p-4"
            onClick={handleChangeTheme}
            data-testid="button-change-theme"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Palette className="h-5 w-5 text-purple-400" />
              </div>
              <div className="text-left">
                <div className="font-medium text-foreground">Aparência</div>
                <div className="text-sm text-muted-foreground">Tema escuro ativo</div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Button>

          <Button 
            variant="destructive" 
            className="w-full justify-between h-auto p-4 bg-destructive/10 border border-destructive/20 hover:bg-destructive/20"
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-destructive/20 rounded-lg flex items-center justify-center">
                <LogOut className="h-5 w-5 text-destructive" />
              </div>
              <div className="text-left">
                <div className="font-medium text-destructive">Logout</div>
                <div className="text-sm text-muted-foreground">Sair da conta</div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;
