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
      let data: any[] = [];
      
      if (file.name.endsWith('.csv')) {
        // Processar CSV
        const text = await file.text();
        const result = Papa.parse(text, { header: true, skipEmptyLines: true });
        data = result.data as any[];
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // Processar Excel
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        data = XLSX.utils.sheet_to_json(worksheet);
      } else {
        throw new Error('Formato de arquivo não suportado. Use CSV ou Excel (.xlsx, .xls)');
      }

      // Validar e processar dados
      const preview = validateData(data);
      setPreviewData(preview);
      
      if (preview.valid.length === 0) {
        toast({
          title: "Erro na importação",
          description: "Nenhum registro válido encontrado no arquivo.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao processar arquivo",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  const validateData = (data: any[]): PreviewData => {
    const valid: DadosImportacao[] = [];
    const invalid: any[] = [];
    const errors: string[] = [];

    data.forEach((row, index) => {
      try {
        // Mapear colunas (flexibilidade nos nomes)
        const normalizedRow = normalizeColumnNames(row);
        
        const dadosImportacao: DadosImportacao = {
          nome_operador: normalizedRow.nome_operador || '',
          atraso_1_contato_percentual: parseFloat(normalizedRow.atraso_1_contato_percentual) || 0,
          preenchimento_incorreto_percentual: parseFloat(normalizedRow.preenchimento_incorreto_percentual) || 0,
          satisfacao_clientes_percentual: parseFloat(normalizedRow.satisfacao_clientes_percentual) || 0,
          solicitacao_apoio_indevida_percentual: parseFloat(normalizedRow.solicitacao_apoio_indevida_percentual) || 0,
          reabertura_tickets_percentual: parseFloat(normalizedRow.reabertura_tickets_percentual) || 0,
          periodo: normalizedRow.periodo || ''
        };

        // Validações
        if (!dadosImportacao.nome_operador.trim()) {
          errors.push(`Linha ${index + 2}: Nome do operador não informado`);
          invalid.push(row);
          return;
        }

        if (!dadosImportacao.periodo.match(/^\d{4}-\d{2}$/)) {
          errors.push(`Linha ${index + 2}: Período inválido (use formato YYYY-MM)`);
          invalid.push(row);
          return;
        }

        valid.push(dadosImportacao);
      } catch (error) {
        errors.push(`Linha ${index + 2}: Erro de formatação`);
        invalid.push(row);
      }
    });

    return { valid, invalid, errors };
  };

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