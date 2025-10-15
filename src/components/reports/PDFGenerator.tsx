import React from 'react';
import { Button } from '@/components/ui/button';
import { jsPDF } from 'jspdf';
import { Avaliacao, Operador, Criterio } from '@/types/evaluation';
import { formatarMoeda, formatarPeriodo, metaAtingida } from '@/utils/calculations';
import { FileDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useEvaluation } from '@/contexts/EvaluationContext';

      interface PDFGeneratorProps {
        avaliacao: Avaliacao;
        operador: Operador;
        criterios: Criterio[];
      }

      const getColorRgbForPercentage = (p: number) => {
        // 0-25 vermelho, 26-50 laranja, 51-75 amarelo, 76-100 verde
        if (isNaN(p)) return [100, 100, 100];
        if (p <= 25) return [220, 38, 38]; // red-600
        if (p <= 50) return [249, 115, 22]; // orange-500-ish
        if (p <= 75) return [250, 204, 21]; // yellow-400-ish
        return [16, 185, 129]; // green-500-ish
      };

      const getLabelForPercentage = (p: number) => {
        if (isNaN(p)) return 'N/A';
        if (p <= 25) return 'Insatisfatório';
        if (p <= 50) return 'Regular';
        if (p <= 75) return 'Bom';
        return 'Ótimo';
      };

      // Helper que constrói o jsPDF e retorna a instância. Reutilizável para salvar ou retornar como blob/base64.
      async function buildPdf(avaliacao: Avaliacao, operador: Operador, criterios: Criterio[]) {
        const pdf = new jsPDF('l', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 15;
            let yPosition = 0;
            let pageNumber = 1;

            const checkPageBreak = () => {
              if (yPosition > pageHeight - 20) {
                pdf.addPage();
                yPosition = 20;
                pageNumber++;
              }
            };

            // Cabeçalho
            pdf.setFontSize(22);
            pdf.setFont('helvetica', 'bold');
            pdf.text('RELATÓRIO DE AVALIAÇÃO DE DESEMPENHO', pageWidth / 2, 20, { align: 'center' });
            yPosition = 30;
            checkPageBreak();

            // Dados do operador
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'bold');
            pdf.text('DADOS DO OPERADOR', margin, yPosition);
            yPosition += 8;
            checkPageBreak();

            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            pdf.text(`Nome: ${operador.nome}`, margin, yPosition);
            pdf.text(`Período: ${formatarPeriodo(avaliacao.periodo)}`, pageWidth - margin, yPosition, { align: 'right' });
            yPosition += 6;
            checkPageBreak();
            pdf.text(`Data de Geração: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - margin, yPosition, { align: 'right' });
            yPosition += 10;
            checkPageBreak();

            // Tabela de critérios (agrupada por bloco)
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'bold');
            pdf.text('CRITÉRIOS DE AVALIAÇÃO', margin, yPosition);
            yPosition += 8;
            checkPageBreak();

            const criteriosAtivos = criterios.filter(c => c.ativo).sort((a, b) => (a.idCriterio - b.idCriterio) || (a.ordem - b.ordem));
            const blocosMap: Record<number, Criterio[]> = {};
            criteriosAtivos.forEach(c => {
              if (!blocosMap[c.idCriterio]) blocosMap[c.idCriterio] = [];
              blocosMap[c.idCriterio].push(c);
            });

            // Carregar nomes dos tipos de critério (para títulos dos blocos) e valores totais por bloco
            const tipoCriterioMap: Record<number, string> = {};
            const tipoValorMap: Record<number, number> = {};
            let tipos: any[] = [];
            try {
              // import dinamico para evitar aumentar bundle no componente (apenas runtime)
              const { getTipoCriterios } = await import('@/services/criteriaService');
              tipos = await getTipoCriterios();
              tipos.forEach((t: { id: number; descricao: string; valorNvl1?: number; valorNvl2?: number; valorNvl3?: number; valorSpa?: number }) => {
                tipoCriterioMap[t.id] = t.descricao;
                // definir valor total do bloco conforme convenção do sistema
                let total = 0;
                if (t.id === 1) total = Number(t.valorNvl1 ?? 0);
                else if (t.id === 2) total = Number(t.valorNvl2 ?? 0);
                else if (t.id === 3) total = Number(t.valorNvl3 ?? 0);
                tipoValorMap[t.id] = total;
              });
            } catch (err) {
              // Silencioso: se falhar, usaremos os nomes padrão 'Bloco X'
              console.warn('Não foi possível carregar tipos de critério para títulos/dimensão dos blocos:', err);
            }

            const tableHeaders = ['Critério', 'Meta', 'Alcançado', 'Status', 'Valor (R$)', 'Valor Alcançado'];
            const colWidths = [100, 30, 30, 30, 40, 40];
            const totalTableWidth = pageWidth - 2 * margin;
            const compactHeaders = ['Critério', 'Alcançado', 'Status'];
            const compactColWidths = [totalTableWidth - 80, 40, 40];

            let isFirstBlock = true;
            // acumuladores globais para resumo final (usar cálculos locais, não confiar apenas em avaliacao.*)
            let globalValorPossivel = 0;
            let globalTotalAlcancado = 0;
            for (const idBlocoStr of Object.keys(blocosMap)) {
              const idBloco = parseInt(idBlocoStr, 10);
              const criteriosDoBloco = blocosMap[idBloco];


              if (!isFirstBlock) {
                pdf.addPage();
                pageNumber++;
                yPosition = 20;
              }

              pdf.setFontSize(11);
              pdf.setFont('helvetica', 'bold');
              const blocoTitulo = tipoCriterioMap[idBloco] || `Bloco ${idBloco}`;
              // calcular resumo do bloco
              const getValorCriterio = (c: Criterio): number => {
                // preferir o valor bruto `valorCriterio` quando presente (pode ser string ou number)
                const r = c as unknown as Record<string, unknown>;
                const raw = r['valorCriterio'];
                if (raw !== undefined && raw !== null) {
                  if (typeof raw === 'string') return parseFloat(raw.replace(',', '.')) || 0;
                  if (typeof raw === 'number') return raw;
                }
                return Number(c.valorBonus ?? 0);
              };

              // valorPossivel por bloco
              let valorPossivel = criteriosDoBloco.reduce((acc, c) => acc + getValorCriterio(c), 0);
              if (idBloco === 1 || idBloco === 2) {
                const tipoObj = tipos.find((t: any) => t.id === idBloco);
                if (tipoObj) {
                  const nivelStr = operador?.nivel || '';
                  if (nivelStr && nivelStr.includes('2') && typeof tipoObj.valorNvl2 === 'number') {
                    valorPossivel = Number(tipoObj.valorNvl2 ?? valorPossivel);
                  } else if (nivelStr && nivelStr.includes('3') && typeof tipoObj.valorNvl3 === 'number') {
                    valorPossivel = Number(tipoObj.valorNvl3 ?? valorPossivel);
                  } else {
                    valorPossivel = Number(tipoObj.valorNvl1 ?? valorPossivel);
                  }
                } else if (tipoValorMap[idBloco] !== undefined) {
                  valorPossivel = tipoValorMap[idBloco];
                }
              }

              // mapear percentuais por criterio (0-100)
              const percentMap: Record<number, number> = {};
              criteriosDoBloco.forEach(c => {
                const ca = avaliacao.criterios.find(x => x.criterioId === c.id);
                const valorAlc = ca ? parseFloat(String(ca.valorAlcancado).replace(',', '.')) || 0 : 0;
                let rowPercent = NaN;
                if (c.tipo === 'qualitativo') {
                  // metaAlcancada pode vir no criterioAvaliacao
                  const metaAlc = ca?.metaAlcancada ?? '';
                  rowPercent = metaAlc ? parseFloat(String(metaAlc).replace(',', '.')) || NaN : NaN;
                } else {
                  const target = c.valorMeta || 0;
                  if (!isNaN(valorAlc) && target > 0) {
                    if (c.tipoMeta === 'menor_melhor') rowPercent = (target / valorAlc) * 100;
                    else rowPercent = (valorAlc / target) * 100;
                  }
                }
                percentMap[c.id] = rowPercent;
              });

              // calcular totalAlcancadoBlock com regras específicas:
              // - para blocos 1 e 2: usar média dos percentuais * valorPossivel
              // - para outros blocos: somar os valores alcançados (valorBonusAlcancado)
              let totalAlcancadoBlock = 0;
              let performanceBlock = 0;
              if (idBloco === 1 || idBloco === 2) {
                // média dos percentuais (ignorar NaN)
                const vals = Object.values(percentMap).filter(p => !isNaN(p));
                const avgPercent = vals.length > 0 ? (vals.reduce((s, v) => s + v, 0) / vals.length) : 0;
                totalAlcancadoBlock = (avgPercent / 100) * valorPossivel;
                // performanceBlock como percentagem média
                performanceBlock = avgPercent;
              } else {
                totalAlcancadoBlock = criteriosDoBloco.reduce((acc, c) => {
                  const ca = avaliacao.criterios.find(x => x.criterioId === c.id);
                  return acc + (ca?.valorBonusAlcancado || 0);
                }, 0);
                performanceBlock = valorPossivel > 0 ? (totalAlcancadoBlock / valorPossivel) * 100 : 0;
              }

              const qtdAvaliacoes = criteriosDoBloco.reduce((acc, c) => acc + (avaliacao.criterios.find(x => x.criterioId === c.id) ? 1 : 0), 0);

              // acumular globais para resumo final
              globalValorPossivel += valorPossivel;
              globalTotalAlcancado += totalAlcancadoBlock;

              pdf.text(blocoTitulo.toUpperCase(), margin, yPosition);
              yPosition += 8;
              checkPageBreak();

              // Cabeçalho da tabela do bloco (compacta para blocos 1 e 2)
              const isCompact = (idBloco === 1 || idBloco === 2);
              const headersToUse = isCompact ? compactHeaders : tableHeaders;
              const widthsToUse = isCompact ? compactColWidths : colWidths;
              let xPos = margin;
              pdf.setFont('helvetica', 'bold');
              pdf.setFontSize(9);
              headersToUse.forEach((header, idx) => {
                pdf.setFillColor(59, 130, 246);
                const w = widthsToUse[idx] ?? 40;
                pdf.rect(xPos, yPosition, w, 8, 'F');
                pdf.setTextColor(255, 255, 255);
                pdf.text(header, xPos + 2, yPosition + 6);
                xPos += w;
              });
              yPosition += 8;
              checkPageBreak();

              pdf.setTextColor(0, 0, 0);
              pdf.setFont('helvetica', 'normal');
              pdf.setFontSize(8);

              criteriosDoBloco.forEach((criterio, idx) => {
                const criterioAvaliacao = avaliacao.criterios.find(ca => ca.criterioId === criterio.id);
                const valorAlcancado = criterioAvaliacao ? parseFloat(String(criterioAvaliacao.valorAlcancado).replace(',', '.')) || 0 : 0;
                const valorBonusAlcancado = criterioAvaliacao?.valorBonusAlcancado || 0;
                const metaAlcancadaRaw = criterioAvaliacao?.metaAlcancada ?? '';
                const atingiu = metaAtingida(criterio, valorAlcancado);

                // calcular percentual por linha (compatível com a UI)
                let rowPercent = NaN;
                if (criterio.tipo === 'qualitativo') {
                  rowPercent = metaAlcancadaRaw ? parseFloat(String(metaAlcancadaRaw).replace(',', '.')) || NaN : NaN;
                } else {
                  const n = criterioAvaliacao ? parseFloat(String(criterioAvaliacao.valorAlcancado).replace(',', '.')) || NaN : NaN;
                  const target = criterio.valorMeta || 0;
                  if (!isNaN(n) && target > 0) {
                    if (criterio.tipoMeta === 'menor_melhor') {
                      rowPercent = (target / n) * 100;
                    } else {
                      rowPercent = (n / target) * 100;
                    }
                  }
                }

                xPos = margin;
                if (idx % 2 !== 0) {
                  const rowW = widthsToUse.reduce((s, w) => s + w, 0);
                  pdf.setFillColor(245, 245, 245);
                  pdf.rect(margin, yPosition, rowW, 8, 'F');
                }

                const isGerenciaOr360 = (criterio.idCriterio === 1 || criterio.idCriterio === 2);
                const statusLabel = isGerenciaOr360 ? getLabelForPercentage(rowPercent) : (atingiu ? 'Atingida' : 'Não Atingida');
                const valorMetaMonetario = getValorCriterio(criterio);

                const fullRowData = [
                  criterio.nome,
                  criterio.tipo === 'qualitativo' ? `${criterio.valorMeta}%` : criterio.valorMeta.toString(),
                  criterio.tipo === 'qualitativo' ? (metaAlcancadaRaw ? `${metaAlcancadaRaw}%` : 'N/A') : (criterioAvaliacao ? String(parseInt(String(criterioAvaliacao.metaAlcancada || criterioAvaliacao.valorAlcancado || 0), 10)) : '0'),
                  statusLabel,
                  formatarMoeda(valorMetaMonetario),
                  formatarMoeda(valorBonusAlcancado)
                ];

                const compactRowData = [
                  criterio.nome,
                  criterio.tipo === 'qualitativo' ? (metaAlcancadaRaw ? `${metaAlcancadaRaw}%` : 'N/A') : (criterioAvaliacao ? String(parseInt(String(criterioAvaliacao.metaAlcancada || criterioAvaliacao.valorAlcancado || 0), 10)) : '0'),
                  statusLabel
                ];

                const rowDataToUse = isCompact ? compactRowData : fullRowData;
                const rowHeight = 8;
                const firstColTextLines = pdf.splitTextToSize(rowDataToUse[0], (widthsToUse[0] ?? 100) - 4);
                const newRowHeight = rowHeight * firstColTextLines.length;

                rowDataToUse.forEach((data, colIdx) => {
                  const textY = yPosition + 6;
                  // aplicar cor para a coluna 'Alcançado' e 'Status' usando rowPercent
                  if (isCompact) {
                    if (colIdx === 1) {
                      if (isGerenciaOr360 && criterio.tipo === 'qualitativo') {
                        const rgb = getColorRgbForPercentage(rowPercent);
                        pdf.setTextColor(rgb[0], rgb[1], rgb[2]);
                      } else {
                        if (atingiu) pdf.setTextColor(16, 185, 129); else pdf.setTextColor(220, 38, 38);
                      }
                    }
                    if (colIdx === 2) {
                      if (isGerenciaOr360) {
                        const rgb = getColorRgbForPercentage(rowPercent);
                        pdf.setTextColor(rgb[0], rgb[1], rgb[2]);
                      } else {
                        if (atingiu) pdf.setTextColor(16, 185, 129); else pdf.setTextColor(220, 38, 38);
                      }
                    }
                  } else {
                    if (colIdx === 2) {
                      if (isGerenciaOr360 && criterio.tipo === 'qualitativo') {
                        const rgb = getColorRgbForPercentage(rowPercent);
                        pdf.setTextColor(rgb[0], rgb[1], rgb[2]);
                      } else {
                        if (atingiu) pdf.setTextColor(16, 185, 129); else pdf.setTextColor(220, 38, 38);
                      }
                    }
                    if (colIdx === 3) {
                      if (isGerenciaOr360) {
                        const rgb = getColorRgbForPercentage(rowPercent);
                        pdf.setTextColor(rgb[0], rgb[1], rgb[2]);
                      } else {
                        if (atingiu) pdf.setTextColor(16, 185, 129); else pdf.setTextColor(220, 38, 38);
                      }
                    }
                  }

                  if (colIdx === 0) {
                    pdf.text(firstColTextLines, xPos + 2, textY);
                  } else {
                    pdf.text(String(data), xPos + 2, textY);
                  }

                  // reset cor para preto depois da célula
                  pdf.setTextColor(0, 0, 0);
                  xPos += widthsToUse[colIdx] ?? 40;
                });

                yPosition += newRowHeight;
                checkPageBreak();
              });

              // após a tabela do bloco, desenhar resumo do bloco alinhado à direita
              yPosition += 6;
              checkPageBreak();
              pdf.setFont('helvetica', 'normal');
              pdf.setFontSize(9);
              pdf.text(`Valor possível: ${formatarMoeda(valorPossivel)}`, pageWidth - margin, yPosition, { align: 'right' });
              yPosition += 6;
              pdf.text(`Total alcançado: ${formatarMoeda(totalAlcancadoBlock)} (${performanceBlock.toFixed(1)}%)`, pageWidth - margin, yPosition, { align: 'right' });
              yPosition += 6;
              pdf.text(`Qtd avaliações: ${qtdAvaliacoes}`, pageWidth - margin, yPosition, { align: 'right' });
              yPosition += 8;
              checkPageBreak();

              isFirstBlock = false;
            }

            // Resumo
            yPosition += 10;
            checkPageBreak();
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'bold');
            pdf.text('RESUMO DA AVALIAÇÃO', margin, yPosition);
            yPosition += 8;
            checkPageBreak();

            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');

            const metasAtingidas = avaliacao.criterios.filter(ca => ca.metaAtingida).length;
            const totalMetas = criterios.filter(c => c.ativo).length;
            // O resumo final usa os acumuladores locais (soma dos totais alcançados por bloco)
            const percentualPerformance = globalValorPossivel > 0
              ? (globalTotalAlcancado / globalValorPossivel) * 100
              : 0;

            pdf.text(`Valor Total Possível: ${formatarMoeda(globalValorPossivel)}`, margin, yPosition);
            yPosition += 6;
            checkPageBreak();
            pdf.text(`Valor Total Alcançado: ${formatarMoeda(globalTotalAlcancado)}`, margin, yPosition);
            yPosition += 6;
            checkPageBreak();
            pdf.text(`Performance Geral: ${percentualPerformance.toFixed(1)}%`, margin, yPosition);
            yPosition += 6;
            checkPageBreak();
            pdf.text(`Metas Atingidas: ${metasAtingidas}/${totalMetas}`, margin, yPosition);

            // Rodapé
            const totalPages = pageNumber;
            for (let i = 1; i <= totalPages; i++) {
              pdf.setPage(i);
              pdf.setFontSize(8);
              pdf.setFont('helvetica', 'italic');
              pdf.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
              pdf.text('Sistema Avalia+ - Relatório gerado automaticamente', margin, pageHeight - 10);
            }

            const fileName = `avaliacao_${operador.nome.replace(/\s+/g, '_')}_${avaliacao.periodo}.pdf`;
        return { pdf, fileName };
      }

      // Exported helper: gera PDF e retorna base64 (sem prefix) e filename
      export async function generatePdfBase64(avaliacao: Avaliacao, operador: Operador, criterios: Criterio[]) {
        const { pdf, fileName } = await buildPdf(avaliacao, operador, criterios);
        const arrayBuffer = pdf.output('arraybuffer') as ArrayBuffer;
        // converter ArrayBuffer para base64
        const base64 = arrayBufferToBase64(arrayBuffer);
        return { fileName, base64 };
      }

      // Export helper to get PDF as Blob (for multipart/form-data uploads)
      export async function generatePdfBlob(avaliacao: Avaliacao, operador: Operador, criterios: Criterio[]) {
        const { pdf, fileName } = await buildPdf(avaliacao, operador, criterios);
        const arrayBuffer = pdf.output('arraybuffer') as ArrayBuffer;
        const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
        return { fileName, blob };
      }

      // utilitário
      function arrayBufferToBase64(buffer: ArrayBuffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
      }

      export function PDFGenerator({ avaliacao, operador, criterios }: PDFGeneratorProps) {
              const { toast } = useToast();
              const { state } = useEvaluation();

              // Helper: calcula totalPending para o período da avaliação usando a mesma regra da tela de acompanhamento
              const calculaTotalPendentes = (periodo: string) => {
                const hojePeriodo = periodo;
                const allActiveOperators = state.operadores.filter(op => op.ativo);
                const applicableCriterios = state.criterios.filter(criterio => criterio.ativo && criterio.idCriterio === 2);
                const applicableCriterioIds = new Set(applicableCriterios.map(c => c.id));

                let totalCompletedAcrossAll = 0;
                for (const op of allActiveOperators) {
                  const evalsByOp = state.avaliacoes.filter(ev => {
                    if (ev.periodo !== hojePeriodo) return false;
                    if (ev.avaliadorId === op.id) return true;
                    if (!Array.isArray(ev.criterios)) return false;
                    return ev.criterios.some((c: any) => Number(c.avaliadorId) === op.id);
                  });

                  const criteriaEvaluatedByOp = new Set<number>();
                  for (const ev of evalsByOp) {
                    if (!Array.isArray(ev.criterios)) continue;
                    for (const c of ev.criterios) {
                      const criterioAplicavel = applicableCriterioIds.has(c.criterioId);
                      const criterioPorEsseAvaliador = (c.avaliadorId !== undefined && Number(c.avaliadorId) === op.id) || ev.avaliadorId === op.id;
                      if (criterioAplicavel && criterioPorEsseAvaliador) criteriaEvaluatedByOp.add(c.criterioId);
                    }
                  }

                  totalCompletedAcrossAll += criteriaEvaluatedByOp.size;
                }

                const totalPossible = allActiveOperators.length * applicableCriterios.length;
                return Math.max(0, totalPossible - totalCompletedAcrossAll);
              };

        const generatePDF = async () => {
          try {
            // verificar pré-condições: contador de pendentes deve ser 0
            const periodo = avaliacao?.periodo || '';
            const totalPendentes = calculaTotalPendentes(periodo);
            const criteriosAtivosCount = state.criterios.filter(c => c.ativo).length;
            const criteriosAvaliadosCount = Array.isArray(avaliacao?.criterios) ? avaliacao.criterios.length : 0;

            if (totalPendentes > 0) {
              toast({ title: 'Impressão bloqueada', description: `Ainda existem ${totalPendentes} avaliações pendentes. Aguarde finalizar todas as avaliações antes de gerar o PDF.`, variant: 'destructive' });
              return;
            }

            if (criteriosAvaliadosCount !== criteriosAtivosCount) {
              toast({ title: 'Impressão bloqueada', description: `Número de critérios avaliados (${criteriosAvaliadosCount}) diferente do número de critérios ativos (${criteriosAtivosCount}). Complete todas as avaliações antes de gerar o PDF.`, variant: 'destructive' });
              return;
            }

            toast({ title: 'Gerando PDF', description: 'Preparando relatório...' });
            const { pdf, fileName } = await buildPdf(avaliacao, operador, criterios);
            pdf.save(fileName);
            toast({ title: 'PDF gerado com sucesso', description: `Relatório salvo como ${fileName}`, variant: 'default' });
          } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            toast({ title: 'Erro ao gerar PDF', description: 'Ocorreu um erro ao gerar o relatório. Tente novamente.', variant: 'destructive' });
          }
        };
        const getColorRgbForPercentage = (p: number) => {
          // 0-25 vermelho, 26-50 laranja, 51-75 amarelo, 76-100 verde
          if (isNaN(p)) return [100, 100, 100];
          if (p <= 25) return [220, 38, 38]; // red-600
          if (p <= 50) return [249, 115, 22]; // orange-500-ish
          if (p <= 75) return [250, 204, 21]; // yellow-400-ish
          return [16, 185, 129]; // green-500-ish
        };

        const getLabelForPercentage = (p: number) => {
          if (isNaN(p)) return 'N/A';
          if (p <= 25) return 'Insatisfatório';
          if (p <= 50) return 'Regular';
          if (p <= 75) return 'Bom';
          return 'Ótimo';
        };

        return (
          <Button onClick={generatePDF} variant="accent" className="w-full">
            <FileDown className="h-4 w-4 mr-2" />
            Gerar Relatório PDF
          </Button>
        );
      }