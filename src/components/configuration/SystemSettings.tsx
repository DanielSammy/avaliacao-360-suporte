import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useEvaluation } from '@/contexts/EvaluationContext';
import { DEFAULT_OPERADORES, DEFAULT_CRITERIOS } from '@/data/defaultData';
import { Download, Upload, RotateCcw, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  serializeData, 
  deserializeData, 
  validateBackupData, 
  logSecurityEvent,
  generateChecksum,
  SECURITY_CONSTRAINTS 
} from '@/utils/security';

export function SystemSettings() {
  const { state, dispatch } = useEvaluation();
  const { toast } = useToast();

  const exportarDados = () => {
    try {
      const dados = {
        version: SECURITY_CONSTRAINTS.CURRENT_DATA_VERSION,
        timestamp: new Date().toISOString(),
        operadores: state.operadores,
        criterios: state.criterios,
        avaliacoes: state.avaliacoes,
        configuracao: state.configuracao,
        exportadoEm: new Date().toISOString()
      };

      // Generate checksum for integrity verification
      const checksum = generateChecksum(dados);
      const dataWithChecksum = { ...dados, checksum };

      // Use secure serialization
      const serializedData = serializeData(dataWithChecksum);
      const blob = new Blob([serializedData], { 
        type: 'application/json' 
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `avalia-mais-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      logSecurityEvent('backup_created', { 
        recordCount: state.operadores.length + state.criterios.length + state.avaliacoes.length,
        checksum 
      });

      toast({
        title: "Backup criado",
        description: "Os dados foram exportados com sucesso.",
        variant: "default"
      });
    } catch (error) {
      logSecurityEvent('backup_export_error', { 
        error: error instanceof Error ? error.message : 'unknown' 
      });
      toast({
        title: "Erro no backup",
        description: "Não foi possível exportar os dados.",
        variant: "destructive"
      });
    }
  };

  const importarDados = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonString = e.target?.result as string;
        
        // Try secure deserialization first
        let dados;
        try {
          dados = deserializeData(jsonString);
        } catch {
          // Fallback to regular JSON parse
          dados = JSON.parse(jsonString);
          logSecurityEvent('backup_import_legacy_format', { filename: file.name });
        }
        
        // Validate backup structure
        const validation = validateBackupData(dados);
        if (!validation.valid) {
          logSecurityEvent('backup_validation_failed', { 
            errors: validation.errors,
            filename: file.name 
          });
          throw new Error('Arquivo de backup inválido: ' + validation.errors.join(', '));
        }

        // Verify checksum if present
        if (dados.checksum) {
          const { checksum, ...dataWithoutChecksum } = dados;
          const calculatedChecksum = generateChecksum(dataWithoutChecksum);
          if (checksum !== calculatedChecksum) {
            logSecurityEvent('backup_checksum_mismatch', { 
              expected: checksum,
              calculated: calculatedChecksum,
              filename: file.name 
            });
            toast({
              title: "Aviso",
              description: "Integridade do backup não pode ser verificada, mas continuando com a importação.",
              variant: "destructive"
            });
          }
        }

        // Import validated data
        dispatch({ type: 'FETCH_OPERADORES_SUCCESS', payload: dados.operadores });
        dispatch({ type: 'SET_CRITERIOS', payload: dados.criterios });
        dispatch({ type: 'SET_AVALIACOES', payload: dados.avaliacoes });

        logSecurityEvent('backup_imported_successfully', { 
          recordCount: dados.operadores.length + dados.criterios.length + dados.avaliacoes.length,
          filename: file.name 
        });

        toast({
          title: "Dados importados",
          description: "O backup foi restaurado com sucesso.",
          variant: "default"
        });
      } catch (error) {
        logSecurityEvent('backup_import_error', { 
          error: error instanceof Error ? error.message : 'unknown',
          filename: file.name 
        });
        toast({
          title: "Erro na importação",
          description: error instanceof Error ? error.message : "Arquivo de backup inválido ou corrompido.",
          variant: "destructive"
        });
      }
    };
    
    reader.readAsText(file);
    // Reset do input para permitir importar o mesmo arquivo novamente
    event.target.value = '';
  };

  const resetarSistema = () => {
    dispatch({ type: 'FETCH_OPERADORES_SUCCESS', payload: DEFAULT_OPERADORES });
    dispatch({ type: 'SET_CRITERIOS', payload: DEFAULT_CRITERIOS });
    dispatch({ type: 'SET_AVALIACOES', payload: [] });
    
    toast({
      title: "Sistema resetado",
      description: "Todos os dados foram restaurados para os valores padrão.",
      variant: "default"
    });
  };

  const limparAvaliacoes = () => {
    dispatch({ type: 'SET_AVALIACOES', payload: [] });
    
    toast({
      title: "Avaliações removidas",
      description: "Todas as avaliações foram removidas do sistema.",
      variant: "default"
    });
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-medium">
        <CardHeader className="bg-gradient-card">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Configurações do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Backup e Restauração</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button onClick={exportarDados} variant="outline" className="h-20 flex-col">
                  <Download className="h-6 w-6 mb-2" />
                  <div className="text-center">
                    <div className="font-medium">Exportar Dados</div>
                    <div className="text-xs text-muted-foreground">
                      Criar backup completo
                    </div>
                  </div>
                </Button>

                <div>
                  <input
                    type="file"
                    accept=".json"
                    onChange={importarDados}
                    className="hidden"
                    id="import-backup"
                  />
                  <Button asChild variant="outline" className="h-20 flex-col w-full">
                    <label htmlFor="import-backup" className="cursor-pointer">
                      <Upload className="h-6 w-6 mb-2" />
                      <div className="text-center">
                        <div className="font-medium">Importar Dados</div>
                        <div className="text-xs text-muted-foreground">
                          Restaurar backup
                        </div>
                      </div>
                    </label>
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Operações do Sistema</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="h-20 flex-col">
                      <RotateCcw className="h-6 w-6 mb-2" />
                      <div className="text-center">
                        <div className="font-medium">Resetar Sistema</div>
                        <div className="text-xs opacity-90">
                          Restaurar configurações padrão
                        </div>
                      </div>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Resetar Sistema Completo</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação irá restaurar todos os operadores e critérios para os valores padrão
                        e remover todas as avaliações. Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={resetarSistema} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Resetar Sistema
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="warning" className="h-20 flex-col">
                      <RotateCcw className="h-6 w-6 mb-2" />
                      <div className="text-center">
                        <div className="font-medium">Limpar Avaliações</div>
                        <div className="text-xs opacity-90">
                          Remover apenas avaliações
                        </div>
                      </div>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Limpar Todas as Avaliações</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação irá remover todas as avaliações do sistema, mantendo
                        operadores e critérios. Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={limparAvaliacoes} className="bg-warning text-warning-foreground hover:bg-warning/90">
                        Limpar Avaliações
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-medium">
        <CardHeader>
          <CardTitle>Informações do Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {state.operadores.length}
              </div>
              <div className="text-sm text-muted-foreground">Operadores</div>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="text-2xl font-bold text-success">
                {state.criterios.length}
              </div>
              <div className="text-sm text-muted-foreground">Critérios</div>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="text-2xl font-bold text-accent">
                {state.avaliacoes.length}
              </div>
              <div className="text-sm text-muted-foreground">Avaliações</div>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="text-2xl font-bold text-warning">
                v{state.configuracao.versao}
              </div>
              <div className="text-sm text-muted-foreground">Versão</div>
            </div>
          </div>
          
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Sistema Avalia+ - Desenvolvido para gestão de performance de operadores</p>
            <p>Última atualização: {state.configuracao.ultimaAtualizacao.toLocaleDateString('pt-BR')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}