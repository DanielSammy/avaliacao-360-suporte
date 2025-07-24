import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, CheckCircle, AlertTriangle, X } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { DadosImportacao } from '@/types/evaluation';
import { useToast } from '@/hooks/use-toast';
import { 
  validateFile, 
  validateImportData, 
  sanitizeString, 
  logSecurityEvent,
  SECURITY_CONSTRAINTS 
} from '@/utils/security';

interface ImportDialogProps {
  onImport: (dados: DadosImportacao[]) => void;
  children: React.ReactNode;
}

interface PreviewData {
  valid: DadosImportacao[];
  invalid: any[];
  errors: string[];
}

export function ImportDialog({ onImport, children }: ImportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    
    try {
      // Validate file first
      const fileValidation = validateFile(file);
      if (!fileValidation.valid) {
        logSecurityEvent('file_validation_failed', { filename: file.name, error: fileValidation.error });
        throw new Error(fileValidation.error);
      }
      
      let data: any[] = [];
      
      if (file.name.endsWith('.csv')) {
        // Processar CSV com limitações de segurança
        const text = await file.text();
        if (text.length > SECURITY_CONSTRAINTS.MAX_FILE_SIZE) {
          throw new Error('Arquivo CSV muito grande');
        }
        
        const result = Papa.parse(text, { 
          header: true, 
          skipEmptyLines: true,
          preview: SECURITY_CONSTRAINTS.MAX_IMPORT_ROWS // Limit rows for security
        });
        
        data = result.data as any[];
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // Processar Excel com limitações de segurança
        const buffer = await file.arrayBuffer();
        if (buffer.byteLength > SECURITY_CONSTRAINTS.MAX_FILE_SIZE) {
          throw new Error('Arquivo Excel muito grande');
        }
        
        const workbook = XLSX.read(buffer);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Limit rows for security
        data = jsonData.slice(0, SECURITY_CONSTRAINTS.MAX_IMPORT_ROWS);
      } else {
        throw new Error('Formato de arquivo não suportado. Use CSV ou Excel (.xlsx, .xls)');
      }

      // Use secure validation from security utils
      const validation = validateImportData(data);
      
      // Map to old format for compatibility
      const preview: PreviewData = {
        valid: validation.valid,
        invalid: data.filter(item => !validation.valid.includes(item as DadosImportacao)),
        errors: validation.errors
      };
      
      setPreviewData(preview);
      
      if (preview.valid.length === 0) {
        logSecurityEvent('no_valid_data_found', { totalRows: data.length });
        toast({
          title: "Erro na importação",
          description: "Nenhum registro válido encontrado no arquivo.",
          variant: "destructive"
        });
      } else {
        logSecurityEvent('file_processed_successfully', { 
          validRows: preview.valid.length, 
          invalidRows: preview.invalid.length,
          filename: file.name 
        });
      }
    } catch (error) {
      logSecurityEvent('file_processing_error', { 
        error: error instanceof Error ? error.message : 'unknown',
        filename: file.name 
      });
      toast({
        title: "Erro ao processar arquivo",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);


  const normalizeColumnNames = (row: any) => {
    const normalized: any = {};
    
    Object.keys(row).forEach(key => {
      const normalizedKey = key.toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
      
      // Mapeamento de colunas comuns
      const keyMappings: { [key: string]: string } = {
        'nome': 'nome_operador',
        'operador': 'nome_operador',
        'atraso': 'atraso_1_contato_percentual',
        'atraso_1_contato': 'atraso_1_contato_percentual',
        'preenchimento': 'preenchimento_incorreto_percentual',
        'satisfacao': 'satisfacao_clientes_percentual',
        'apoio': 'solicitacao_apoio_indevida_percentual',
        'reabertura': 'reabertura_tickets_percentual',
        'mes': 'periodo',
        'periodo': 'periodo'
      };

      const finalKey = keyMappings[normalizedKey] || normalizedKey;
      normalized[finalKey] = row[key];
    });

    return normalized;
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const file = files[0];
    
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleConfirmImport = () => {
    if (previewData?.valid) {
      onImport(previewData.valid);
      setIsOpen(false);
      setPreviewData(null);
      toast({
        title: "Importação concluída",
        description: `${previewData.valid.length} registros importados com sucesso.`,
        variant: "default"
      });
    }
  };

  const resetDialog = () => {
    setPreviewData(null);
    setIsProcessing(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetDialog();
    }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Dados de Avaliação
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!previewData && !isProcessing && (
            <Card
              className={`border-2 border-dashed transition-colors ${
                isDragging ? 'border-primary bg-primary/10' : 'border-muted-foreground/25'
              }`}
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
            >
              <CardContent className="p-8 text-center">
                <div className="space-y-4">
                  <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Arraste seu arquivo aqui</h3>
                    <p className="text-muted-foreground">ou clique para selecionar</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Formatos aceitos: CSV, Excel (.xlsx, .xls)
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <Badge variant="outline">CSV</Badge>
                      <Badge variant="outline">XLSX</Badge>
                      <Badge variant="outline">XLS</Badge>
                    </div>
                  </div>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileInput}
                    className="hidden"
                    id="file-input"
                  />
                  <Button asChild>
                    <label htmlFor="file-input" className="cursor-pointer">
                      Selecionar Arquivo
                    </label>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {isProcessing && (
            <div className="text-center py-8">
              <div className="inline-flex items-center gap-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span>Processando arquivo...</span>
              </div>
            </div>
          )}

          {previewData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Preview dos Dados</h3>
                <Button variant="outline" onClick={resetDialog}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2 text-success">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-semibold">Válidos</span>
                    </div>
                    <div className="text-2xl font-bold text-success">
                      {previewData.valid.length}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2 text-destructive">
                      <AlertTriangle className="h-5 w-5" />
                      <span className="font-semibold">Inválidos</span>
                    </div>
                    <div className="text-2xl font-bold text-destructive">
                      {previewData.invalid.length}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="h-5 w-5" />
                      <span className="font-semibold">Total</span>
                    </div>
                    <div className="text-2xl font-bold">
                      {previewData.valid.length + previewData.invalid.length}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {previewData.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-semibold">Erros encontrados:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {previewData.errors.slice(0, 5).map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                        {previewData.errors.length > 5 && (
                          <li>... e mais {previewData.errors.length - 5} erro(s)</li>
                        )}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {previewData.valid.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-semibold">Dados válidos para importação:</h4>
                  <div className="max-h-60 overflow-y-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="text-left p-2">Operador</th>
                          <th className="text-center p-2">Período</th>
                          <th className="text-center p-2">Atraso</th>
                          <th className="text-center p-2">Preenchimento</th>
                          <th className="text-center p-2">Satisfação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.valid.slice(0, 10).map((item, index) => (
                          <tr key={index} className="border-b">
                            <td className="p-2 font-medium">{item.nome_operador}</td>
                            <td className="p-2 text-center">{item.periodo}</td>
                            <td className="p-2 text-center">{item.atraso_1_contato_percentual}%</td>
                            <td className="p-2 text-center">{item.preenchimento_incorreto_percentual}%</td>
                            <td className="p-2 text-center">{item.satisfacao_clientes_percentual}%</td>
                          </tr>
                        ))}
                        {previewData.valid.length > 10 && (
                          <tr>
                            <td colSpan={5} className="p-2 text-center text-muted-foreground">
                              ... e mais {previewData.valid.length - 10} registro(s)
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={resetDialog}>
                      Cancelar
                    </Button>
                    <Button onClick={handleConfirmImport}>
                      Importar {previewData.valid.length} Registro(s)
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}