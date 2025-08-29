// // src/components/import/ImportDialog.tsx
// import React, { useState, useCallback } from 'react';
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Alert, AlertDescription } from '@/components/ui/alert';
// import { Upload, FileText, CheckCircle, AlertTriangle, X, Link as LinkIcon } from 'lucide-react';
// import Papa from 'papaparse';
// import * as XLSX from 'xlsx';
// import { DadosImportacao } from '@/types/evaluation';
// import { useToast } from '@/hooks/use-toast';

// type ImportType = '360' | 'gerencia';

// interface ImportDialogProps {
//   onImport: (dados: DadosImportacao[], importType: ImportType) => void;
//   children: React.ReactNode;
//   importType: ImportType;
//   periodoAtual: string;
// }

// interface PreviewData {
//   valid: DadosImportacao[];
//   errors: string[];
// }

// const normalizeText = (text: string = '') => {
//   return text.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
// };

// export function ImportDialog({ onImport, children, importType, periodoAtual }: ImportDialogProps) {
//   const [isOpen, setIsOpen] = useState(false);
//   const [sheetUrl, setSheetUrl] = useState('');
//   const [previewData, setPreviewData] = useState<PreviewData | null>(null);
//   const [isProcessing, setIsProcessing] = useState(false);
//   const { toast } = useToast();

//   const processRowOrientedData = useCallback((data: Record<string, unknown>[]): PreviewData => {
//     // Lógica para planilhas onde cada linha é um registro (Gerência)
//     const valid: DadosImportacao[] = [];
//     const errors: string[] = [];
//     data.forEach((row, index) => {
//       const nomeOperador = row['Operador'] || row['operador'];
//       if (!nomeOperador) {
//         if (Object.values(row).some(val => val)) {
//           errors.push(`Linha ${index + 9}: A coluna 'Operador' é obrigatória.`);
//         }
//         return;
//       }
//       const importedData: DadosImportacao = { nome_operador: String(nomeOperador).trim(), periodo: periodoAtual };
//       for (const key in row) {
//         if (key.toLowerCase() !== 'operador') {
//           importedData[normalizeText(key)] = row[key];
//         }
//       }
//       valid.push(importedData);
//     });
//     return { valid, errors };
//   }, [periodoAtual]);
  
//   const processColumnarDataFromLink = (data: Record<string, unknown>[]): PreviewData => {
//     // Lógica para planilhas onde cada coluna é um operador (360 via link)
//     const valid: DadosImportacao[] = [];
//     const errors: string[] = [];
    
//     if (data.length === 0) {
//       errors.push("A planilha 360 parece estar vazia.");
//       return { valid, errors };
//     }

//     const headers = Object.keys(data[0]);
//     const criteriaColumnKey = headers[1]; // Critérios estão na coluna B
//     const operatorHeaders = headers.slice(2);

//     const operatorDataMap = new Map<string, DadosImportacao>();

//     operatorHeaders.forEach(header => {
//       if (!header || typeof header !== 'string') return;
//       const operatorNameMatch = header.match(/\[(.*?)\]/);
//       if (operatorNameMatch && operatorNameMatch[1]) {
//         const nomeOperador = operatorNameMatch[1].trim();
//         operatorDataMap.set(header, { nome_operador: nomeOperador, periodo: periodoAtual });
//       } else {
//         errors.push(`Cabeçalho de coluna inválido: "${header}". Use o formato "[Nome Operador]".`);
//       }
//     });

//     data.forEach(row => {
//       const criterion = row[criteriaColumnKey];
//       if (criterion) {
//         const normalizedCriterion = normalizeText(criterion);
//         operatorHeaders.forEach(header => {
//           if (operatorDataMap.has(header)) {
//             const operatorData = operatorDataMap.get(header)!;
//             operatorData[normalizedCriterion] = row[header];
//           }
//         });
//       }
//     });

//     operatorDataMap.forEach(value => valid.push(value));

//     return { valid, errors };
//   };

//   const handleUrlImport = useCallback(async () => {
//     if (!sheetUrl) return;
//     setIsProcessing(true);
//     setPreviewData(null);
//     try {
//       const response = await fetch(sheetUrl);
//       if (!response.ok) throw new Error(`Erro na rede: ${response.statusText}`);
//       const csvText = await response.text();
//       Papa.parse(csvText, {
//         header: true,
//         skipEmptyLines: true,
//         complete: (results) => {
//           const preview = processColumnarDataFromLink(results.data);
//           setPreviewData(preview);
//           setIsProcessing(false);
//         },
//         error: () => { throw new Error("Não foi possível processar o CSV da URL."); }
//       });
//     } catch (error) {
//       toast({ title: "Erro na Importação", description: `Verifique o link e se a planilha está publicada como CSV. Detalhe: ${error.message}`, variant: "destructive" });
//       setIsProcessing(false);
//     }
//   }, [sheetUrl, toast, processColumnarDataFromLink]);

//   const handleFileImport = useCallback((file: File) => {
//     setIsProcessing(true);
//     setPreviewData(null);
//     const reader = new FileReader();
//     reader.onload = (e) => {
//       try {
//         const data = new Uint8Array(e.target?.result as ArrayBuffer);
//         const workbook = XLSX.read(data, { type: 'array' });
//         const sheetName = workbook.SheetNames[0];
//         const worksheet = workbook.Sheets[sheetName];
        
//         const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:Z1000');
//         range.s.r = 8; // Começa a ler da linha 9
//         const jsonData = XLSX.utils.sheet_to_json(worksheet, { range, blankrows: false });
//         setPreviewData(processRowOrientedData(jsonData));

//       } catch (error) {
//            toast({ title: "Erro no Arquivo", description: `Não foi possível ler o arquivo: ${error instanceof Error ? error.message : String(error)}`, variant: "destructive" });
//       } finally {
//           setIsProcessing(false);
//       }
//     };
//     reader.readAsArrayBuffer(file);
//   }, [toast, processRowOrientedData]);

//   const handleConfirmImport = () => {
//     if (previewData?.valid && previewData.valid.length > 0) {
//       onImport(previewData.valid, importType);
//       setIsOpen(false);
//     }
//   };

//   const resetDialog = () => {
//     setPreviewData(null);
//     setIsProcessing(false);
//     setSheetUrl('');
//   };

//   return (
//     <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetDialog(); }}>
//       <DialogTrigger asChild>{children}</DialogTrigger>
//       <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
//         <DialogHeader>
//           <DialogTitle className="flex items-center gap-2">
//             {importType === '360' ? <LinkIcon className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
//             {importType === '360' ? 'Importar Avaliação 360 (via Link)' : 'Importar Dados da Gerência (Arquivo)'}
//           </DialogTitle>
//         </DialogHeader>
//         <div className="flex-1 overflow-y-auto pr-2 space-y-4">
//           {!previewData && !isProcessing && (
//             importType === '360' ? (
//                 <div className="space-y-4 pt-4">
//                     <p className="text-sm text-muted-foreground">Cole o link da sua planilha do Google Sheets publicada como CSV. (Vá em <strong>Arquivo &gt; Compartilhar &gt; Publicar na web</strong>).</p>
//                     <div className="flex items-center gap-2"><Input id="sheet-url" placeholder="https://docs.google.com/spreadsheets/d/..." value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleUrlImport()} className="flex-1"/><Button onClick={handleUrlImport} disabled={!sheetUrl}><Upload className="h-4 w-4 mr-2" />Processar Link</Button></div>
//                 </div>
//             ) : (
//                 <div className="pt-4">
//                     <label htmlFor={`file-input-${importType}`} className="cursor-pointer border-2 border-dashed rounded-lg p-8 text-center block hover:border-primary transition-colors">
//                         <FileText className="h-12 w-12 mx-auto text-muted-foreground" /><p className="mt-2 font-semibold">Arraste um arquivo Excel ou clique para selecionar</p><p className="text-xs text-muted-foreground mt-1">A leitura começará da linha 9.</p>
//                         <Input id={`file-input-${importType}`} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileImport(e.target.files[0])} />
//                     </label>
//                 </div>
//             )
//           )}
//           {isProcessing && (<div className="text-center py-8 flex items-center justify-center gap-2 text-muted-foreground"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div><span>Processando dados...</span></div>)}
//           {previewData && (
//                <div className="space-y-4">
//                   <div className="flex items-center justify-between"><h3 className="text-lg font-semibold">Pré-visualização</h3><Button variant="outline" size="sm" onClick={resetDialog}><X className="h-4 w-4 mr-2" />Novo Envio</Button></div>
//                   {previewData.valid.length > 0 && <Alert className="bg-success/10 border-success/50"><CheckCircle className="h-4 w-4 !text-success" /><AlertDescription>{previewData.valid.length} operador(es) com dados válidos para importação.</AlertDescription></Alert>}
//                   {previewData.errors.length > 0 && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription className="max-h-40 overflow-y-auto"><p className="font-semibold">{previewData.errors.length} erro(s):</p><ul className="list-disc list-inside text-xs">{previewData.errors.map((e, i) => <li key={i}>{e}</li>)}</ul></AlertDescription></Alert>}
//                   {previewData.valid.length > 0 && <div className="flex justify-end gap-2 pt-4 border-t mt-4"><Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button><Button onClick={handleConfirmImport}>Confirmar e Importar</Button></div>}
//                </div>
//           )}
//         </div>
//       </DialogContent>
//     </Dialog>
//   );
// }