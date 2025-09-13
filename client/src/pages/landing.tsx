import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const Landing: React.FC = () => {
  const handleLogin = () => {
    window.location.href = '/api/login';
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

          {/* Login Button */}
          <Button 
            onClick={handleLogin}
            data-testid="button-login"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            size="lg"
          >
            Entrar com Replit
          </Button>

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
