import React, { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';
import { apiRequest } from '@/lib/queryClient';
import { BottomNav } from '@/components/ui/bottom-nav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, MoreVertical } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insertUserSchema, type InsertUser } from '@shared/schema';

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
}

const Users: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);

  // Redirect to home if not authenticated or not admin
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
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

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: !!user && user.role === 'admin',
    retry: false,
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: InsertUser) => {
      const response = await apiRequest('POST', '/api/users', userData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsAddUserOpen(false);
      toast({
        title: "Usuário criado!",
        description: "Novo usuário adicionado com sucesso.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      
      toast({
        title: "Erro ao criar usuário",
        description: "Falha ao criar novo usuário. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const form = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      role: 'user',
      isActive: true,
    },
  });

  const onSubmit = (data: InsertUser) => {
    createUserMutation.mutate(data);
  };

  if (authLoading || !user || user.role !== 'admin') {
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

  const getUserInitials = (user: User) => {
    if (!user.firstName && !user.lastName) {
      return user.email.charAt(0).toUpperCase();
    }
    return `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const getLastLoginStatus = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Ativo há algumas horas';
    if (diffInDays === 1) return 'Ativo há 1d';
    if (diffInDays <= 7) return `Ativo há ${diffInDays}d`;
    return `Inativo há ${diffInDays}d`;
  };

  const filteredUsers = users?.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

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
            <h2 className="text-xl font-bold text-foreground">Usuários</h2>
            <p className="text-sm text-muted-foreground">Gerenciamento de acesso</p>
          </div>
          <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-primary text-primary-foreground"
                data-testid="button-add-user"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Adicionar Usuário</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="usuario@exemplo.com" 
                            data-testid="input-email"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="João" 
                            data-testid="input-first-name"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sobrenome</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Silva" 
                            data-testid="input-last-name"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Função</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-role">
                              <SelectValue placeholder="Selecione a função" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="user">Usuário</SelectItem>
                            <SelectItem value="admin">Administrador</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex space-x-3 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsAddUserOpen(false)}
                      className="w-full"
                      data-testid="button-cancel"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={createUserMutation.isPending}
                      data-testid="button-create-user"
                    >
                      {createUserMutation.isPending ? 'Criando...' : 'Criar'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-6 py-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            type="text" 
            placeholder="Buscar usuários..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="input-search"
            className="pl-10"
          />
        </div>
      </div>

      {/* User List */}
      <div className="px-6 pb-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : filteredUsers.length > 0 ? (
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <Card key={user.id} className="bg-secondary border border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        user.role === 'admin' ? 'bg-primary' : 'bg-accent'
                      }`}>
                        <span className={`text-lg font-bold ${
                          user.role === 'admin' ? 'text-primary-foreground' : 'text-black'
                        }`} data-testid={`user-initials-${user.id}`}>
                          {getUserInitials(user)}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-foreground" data-testid={`user-name-${user.id}`}>
                          {user.firstName && user.lastName 
                            ? `${user.firstName} ${user.lastName}`
                            : user.email
                          }
                        </div>
                        <div className="text-sm text-muted-foreground" data-testid={`user-email-${user.id}`}>
                          {user.email}
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge 
                            className={user.role === 'admin' 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-secondary text-foreground border border-border'
                            }
                            data-testid={`user-role-${user.id}`}
                          >
                            {user.role === 'admin' ? 'Admin' : 'Usuário'}
                          </Badge>
                          <span className={`text-xs ${
                            user.isActive ? 'text-muted-foreground' : 'text-destructive'
                          }`} data-testid={`user-status-${user.id}`}>
                            {getLastLoginStatus(user.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      data-testid={`button-user-menu-${user.id}`}
                    >
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-secondary">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-users text-muted-foreground text-xl" />
              </div>
              <p className="text-muted-foreground">
                {searchTerm ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchTerm ? 'Tente alterar os termos de busca' : 'Comece adicionando um novo usuário'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Users;
