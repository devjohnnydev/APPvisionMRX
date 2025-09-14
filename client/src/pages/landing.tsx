import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

const Landing: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await apiRequest('POST', '/api/login', {
        email,
        password,
      });

      if (response.ok) {
        // Invalidate auth queries to refetch user data
        await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        toast({
          title: "Login realizado com sucesso",
          description: "Bem-vindo ao TechVision!",
        });
        // Router will handle redirect automatically
      }
    } catch (error: any) {
      setError(error.message || 'Erro ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-8 pb-6 px-6">
          {/* Logo Section */}
          <div className="text-center mb-12">
            <div className="w-24 h-24 bg-primary rounded-xl mx-auto mb-6 flex items-center justify-center">
              <span className="text-3xl font-bold text-primary-foreground">MRX</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">TechVision</h1>
            <p className="text-muted-foreground text-sm">Reconhecimento Inteligente de Placas</p>
          </div>

          {/* Features */}
          <div className="space-y-4 mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                <i className="fas fa-camera text-primary text-sm" />
              </div>
              <span className="text-foreground">Escaneamento com IA</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                <i className="fas fa-microchip text-primary text-sm" />
              </div>
              <span className="text-foreground">Identificação Automática</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                <i className="fas fa-chart-bar text-primary text-sm" />
              </div>
              <span className="text-foreground">Dashboard Gerencial</span>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="input-email"
                placeholder="Digite seu email"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="input-password"
                placeholder="Digite sua senha"
                required
              />
            </div>

            <Button 
              type="submit"
              data-testid="button-login"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          {/* Footer */}
          <div className="text-center pt-6 text-xs text-muted-foreground">
            <p>MRXTechVision v1.0.0</p>
            <p className="mt-1">© 2024 Todos os direitos reservados</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Landing;
