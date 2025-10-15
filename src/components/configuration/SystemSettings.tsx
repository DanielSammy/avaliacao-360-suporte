import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useEvaluation } from '@/contexts/EvaluationContext';
import { DEFAULT_OPERADORES, DEFAULT_CRITERIOS } from '@/data/defaultData';
import { Download, Upload, RotateCcw, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getAuthToken } from '@/config/apiConfig';
import emailConfig from '@/config/emailConfig';
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
      console.error('Erro ao exportar dados', error);
      toast({ title: 'Erro', description: 'Falha ao exportar backup.', variant: 'destructive' });
    }
  };

  // SMTP settings (persist in localStorage)
  const [smtpHost, setSmtpHost] = useState<string>(() => localStorage.getItem('smtpHost') || emailConfig.smtpHost || '');
  const [smtpPort, setSmtpPort] = useState<string>(() => localStorage.getItem('smtpPort') || (emailConfig.smtpPort ? String(emailConfig.smtpPort) : ''));
  const [smtpUser, setSmtpUser] = useState<string>(() => localStorage.getItem('smtpUser') || emailConfig.smtpUser || '');
  const [smtpPassword, setSmtpPassword] = useState<string>(() => localStorage.getItem('smtpPassword') || emailConfig.smtpPassword || '');

  const saveSmtpConfig = () => {
    localStorage.setItem('smtpHost', smtpHost);
    localStorage.setItem('smtpPort', smtpPort);
    localStorage.setItem('smtpUser', smtpUser);
    localStorage.setItem('smtpPassword', smtpPassword);
    toast({ title: 'Configurações salvas', description: 'Configurações SMTP salvas localmente.', variant: 'default' });
  };

  return (
    <div className="space-y-6">
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

      <Card className="shadow-medium">
        <CardHeader>
          <CardTitle>Configuração de SMTP</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">SMTP Host</label>
              <input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} className="w-full p-2 border rounded" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">SMTP Port</label>
              <input value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} className="w-full p-2 border rounded" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">SMTP User</label>
              <input value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} className="w-full p-2 border rounded" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">SMTP Password</label>
              <input value={smtpPassword} onChange={(e) => setSmtpPassword(e.target.value)} type="password" className="w-full p-2 border rounded" />
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={saveSmtpConfig}>Salvar Configuração SMTP</Button>
          </div>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-2 block">Email de teste</label>
              <input id="testEmail" placeholder="destinatario@exemplo.com" className="w-full p-2 border rounded" />
            </div>
            <div className="flex items-end">
              <Button onClick={async () => {
                const input = (document.getElementById('testEmail') as HTMLInputElement | null);
                const to = input?.value?.trim();
                if (!to) {
                  toast({ title: 'Erro', description: 'Insira um email válido para teste.', variant: 'destructive' });
                  return;
                }

                // montar payload de teste
                const emailPayload = {
                  to,
                  subject: `Teste de envio - Avalia+`,
                  content: `Este é um email de teste enviado a partir do sistema Avalia+.`,
                  isHtml: true,
                  smtpHost: smtpHost || undefined,
                  smtpPort: smtpPort ? Number(smtpPort) : undefined,
                  smtpUser: smtpUser || undefined,
                  smtpPassword: smtpPassword || undefined,
                };

                try {
                  const token = getAuthToken();
                  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                  if (token) headers['Authorization'] = `Bearer ${token}`;

                  const { BASE_URL, API_ENDPOINTS } = await import('@/config/apiConfig');
                  const resp = await fetch(`${BASE_URL}${API_ENDPOINTS.EMAIL_SEND}`, { method: 'POST', headers, body: JSON.stringify(emailPayload) });
                  const text = await resp.text().catch(() => '<no body>');
                  if (resp.ok) {
                    toast({ title: 'Enviado', description: 'Email de teste enviado com sucesso.' });
                  } else {
                    toast({ title: 'Erro', description: 'Envio de teste falhou. Veja console para mais detalhes.', variant: 'destructive' });
                  }
                } catch (e) {
                  toast({ title: 'Erro', description: 'Falha ao enviar email de teste.', variant: 'destructive' });
                }
              }}>Testar Envio</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}