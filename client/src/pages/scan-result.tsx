import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';
import { BottomNav } from '@/components/ui/bottom-nav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Check, Share, Camera } from 'lucide-react';

interface ScannedBoard {
  id: string;
  boardType: string;
  manufacturer: string | null;
  model: string | null;
  confidence: number;
  imageUrl: string | null;
  location: string | null;
  createdAt: string;
  analysis?: {
    components: string[];
    description: string;
  };
}

const ScanResult: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  
  // Get scan ID from URL params
  const urlParams = new URLSearchParams(location.split('?')[1]);
  const scanId = urlParams.get('id');

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

  const { data: scanResult, isLoading, error } = useQuery<ScannedBoard>({
    queryKey: ['/api/scanned-boards', scanId],
    enabled: !!scanId && !!user,
    retry: false,
  });

  useEffect(() => {
    if (error && isUnauthorizedError(error)) {
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
  }, [error, toast]);

  const handleGoBack = () => {
    setLocation('/scan');
  };

  const handleNewScan = () => {
    setLocation('/scan');
  };

  const handleShare = () => {
    if (navigator.share && scanResult) {
      navigator.share({
        title: 'MRXTechVision - Placa Identificada',
        text: `${scanResult.boardType} identificado com ${Math.round(scanResult.confidence * 100)}% de precisão`,
        url: window.location.href,
      });
    } else {
      toast({
        title: "Link copiado!",
        description: "Link do resultado copiado para a área de transferência",
      });
    }
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

  if (!scanId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-bold text-foreground mb-2">Resultado não encontrado</h2>
          <p className="text-muted-foreground mb-6">O ID do escaneamento não foi fornecido.</p>
          <Button onClick={() => setLocation('/dashboard')} data-testid="button-back-dashboard">
            Voltar ao Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="p-6 space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (error || !scanResult) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-exclamation-triangle text-destructive text-xl" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Erro ao carregar resultado</h2>
          <p className="text-muted-foreground mb-6">
            Não foi possível carregar os dados do escaneamento.
          </p>
          <div className="space-y-3">
            <Button onClick={() => window.location.reload()} className="w-full">
              Tentar Novamente
            </Button>
            <Button variant="outline" onClick={() => setLocation('/dashboard')} className="w-full">
              Voltar ao Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) {
      return <Badge className="bg-primary text-primary-foreground">Alta confiança</Badge>;
    } else if (confidence >= 0.5) {
      return <Badge variant="secondary">Média confiança</Badge>;
    } else {
      return <Badge variant="destructive">Baixa confiança</Badge>;
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
        <div className="flex items-center space-x-4">
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={handleGoBack}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-xl font-bold text-foreground">Resultado do Scan</h2>
            <p className="text-sm text-muted-foreground">Placa identificada com sucesso</p>
          </div>
        </div>
      </div>

      {/* Success Section */}
      <div className="px-6 py-8 text-center">
        <div className="w-20 h-20 bg-primary rounded-full mx-auto mb-6 flex items-center justify-center">
          <Check className="h-8 w-8 text-primary-foreground" />
        </div>
        <h3 className="text-2xl font-bold text-foreground mb-2" data-testid="board-type">
          {scanResult.boardType}
        </h3>
        <p className="text-muted-foreground mb-4" data-testid="confidence-description">
          {scanResult.manufacturer && `${scanResult.manufacturer} - `}
          Identificado com {Math.round(scanResult.confidence * 100)}% de precisão
        </p>
        {getConfidenceBadge(scanResult.confidence)}
      </div>

      {/* Captured Image */}
      {scanResult.imageUrl && (
        <div className="px-6 mb-6">
          <Card className="bg-secondary">
            <CardContent className="p-4">
              <h4 className="font-semibold text-foreground mb-3">Imagem Capturada</h4>
              <div className="w-full h-48 bg-muted rounded-xl border border-border overflow-hidden">
                <img 
                  src={scanResult.imageUrl}
                  alt="Placa capturada"
                  className="w-full h-full object-cover"
                  data-testid="captured-image"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Board Details */}
      <div className="px-6 mb-6">
        <Card className="bg-secondary">
          <CardContent className="p-4">
            <h4 className="font-semibold text-foreground mb-4">Detalhes da Placa</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Tipo</span>
                <span className="text-foreground font-medium" data-testid="detail-type">
                  {scanResult.boardType}
                </span>
              </div>
              {scanResult.manufacturer && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Fabricante</span>
                  <span className="text-foreground font-medium" data-testid="detail-manufacturer">
                    {scanResult.manufacturer}
                  </span>
                </div>
              )}
              {scanResult.model && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Modelo</span>
                  <span className="text-foreground font-medium" data-testid="detail-model">
                    {scanResult.model}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Precisão IA</span>
                <span className="text-primary font-medium" data-testid="detail-confidence">
                  {Math.round(scanResult.confidence * 100)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Data/Hora</span>
                <span className="text-foreground font-medium" data-testid="detail-datetime">
                  {formatDateTime(scanResult.createdAt)}
                </span>
              </div>
              {scanResult.location && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Localização</span>
                  <span className="text-foreground font-medium" data-testid="detail-location">
                    {scanResult.location}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Components Analysis */}
      {scanResult.analysis?.components && scanResult.analysis.components.length > 0 && (
        <div className="px-6 mb-6">
          <Card className="bg-secondary">
            <CardContent className="p-4">
              <h4 className="font-semibold text-foreground mb-4">Componentes Identificados</h4>
              <div className="flex flex-wrap gap-2">
                {scanResult.analysis.components.map((component, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {component}
                  </Badge>
                ))}
              </div>
              {scanResult.analysis.description && (
                <p className="text-sm text-muted-foreground mt-3">
                  {scanResult.analysis.description}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Action Buttons */}
      <div className="px-6 pb-6 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="secondary"
            onClick={handleShare}
            data-testid="button-share"
            className="flex items-center justify-center space-x-2"
          >
            <Share className="h-4 w-4" />
            <span>Compartilhar</span>
          </Button>
          <Button 
            variant="secondary"
            onClick={handleNewScan}
            data-testid="button-new-scan"
            className="flex items-center justify-center space-x-2"
          >
            <Camera className="h-4 w-4" />
            <span>Novo Scan</span>
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ScanResult;
