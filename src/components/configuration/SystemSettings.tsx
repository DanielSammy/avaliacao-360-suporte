import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useEvaluation } from '@/contexts/EvaluationContext';
import { DEFAULT_OPERADORES, DEFAULT_CRITERIOS } from '@/data/defaultData';
import { Download, Upload, RotateCcw, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getAuthToken } from '@/config/apiConfig';
import { sendEmailWithAttachment } from '@/services/reportService';
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
                  // Primeiro, tente enviar um anexo PDF mínimo (emula ReportsPanel)
                  const minimalPdf = '%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT /F1 24 Tf 72 72 Td (Teste) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000210 00000 n \ntrailer\n<< /Root 1 0 R >>\nstartxref\n300\n%%EOF';
                  const pdfBlob = new Blob([minimalPdf], { type: 'application/pdf' });
                  const pdfName = `teste-email-${new Date().toISOString().split('T')[0]}.pdf`;

                  let resp = await sendEmailWithAttachment({ ...emailPayload }, pdfBlob, pdfName);
                  let respText = await resp.text().catch(() => '<no body>');

                  if (!resp.ok) {
                    console.warn('Envio com PDF falhou, tentando fallback para TXT', resp.status, respText);

                    // fallback para .txt (mais simples)
                    const contentText = `Este é um email de teste enviado a partir do sistema Avalia+.\nData: ${new Date().toLocaleString()}`;
                    const txtFile = new Blob([contentText], { type: 'text/plain' });
                    const txtName = `teste-email-${new Date().toISOString().split('T')[0]}.txt`;

                    resp = await sendEmailWithAttachment({ ...emailPayload }, txtFile, txtName);
                    respText = await resp.text().catch(() => '<no body>');
                  }

                  if (resp.ok) {
                    toast({ title: 'Enviado', description: 'Email de teste enviado com sucesso (com anexo).' });
                  } else {
                    console.error('Envio de teste falhou', resp.status, respText);
                    toast({ title: 'Erro', description: `Envio falhou: ${resp.status} - ${respText}`, variant: 'destructive' });
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