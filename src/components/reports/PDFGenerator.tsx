import React from 'react';
      import { Button } from '@/components/ui/button';
      import { jsPDF } from 'jspdf';
      import { Avaliacao, Operador, Criterio } from '@/types/evaluation';
      import { formatarMoeda, formatarPeriodo, metaAtingida } from '@/utils/calculations';
      import { FileDown } from 'lucide-react';
      import { useToast } from '@/hooks/use-toast';

      interface PDFGeneratorProps {
        avaliacao: Avaliacao;
        operador: Operador;
        criterios: Criterio[];
      }

      export function PDFGenerator({ avaliacao, operador, criterios }: PDFGeneratorProps) {
        const { toast } = useToast();

        const generatePDF = async () => {
          try {
            toast({ title: 'Gerando PDF', description: 'Preparando relatório...' });

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
            try {
              // import dinamico para evitar aumentar bundle no componente (apenas runtime)
              const { getTipoCriterios } = await import('@/services/criteriaService');
              const tipos = await getTipoCriterios();
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

            let isFirstBlock = true;
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

              // Para os blocos de Tipo 1 e 2, o 'valor possível' é o valor total do bloco (configurado em TipoCriterio)
              let valorPossivel = criteriosDoBloco.reduce((acc, c) => acc + getValorCriterio(c), 0);
              if ((idBloco === 1 || idBloco === 2) && tipoValorMap[idBloco] !== undefined) {
                valorPossivel = tipoValorMap[idBloco];
              }
              const totalAlcancadoBlock = criteriosDoBloco.reduce((acc, c) => {
                const ca = avaliacao.criterios.find(x => x.criterioId === c.id);
                return acc + (ca?.valorBonusAlcancado || 0);
              }, 0);
              const qtdAvaliacoes = criteriosDoBloco.reduce((acc, c) => acc + (avaliacao.criterios.find(x => x.criterioId === c.id) ? 1 : 0), 0);
              const performanceBlock = valorPossivel > 0 ? (totalAlcancadoBlock / valorPossivel) * 100 : 0;

              pdf.text(blocoTitulo.toUpperCase(), margin, yPosition);
              yPosition += 8;
              checkPageBreak();

              // Cabeçalho da tabela do bloco
              let xPos = margin;
              pdf.setFont('helvetica', 'bold');
              pdf.setFontSize(9);
              tableHeaders.forEach((header, idx) => {
                pdf.setFillColor(59, 130, 246);
                pdf.rect(xPos, yPosition, colWidths[idx], 8, 'F');
                pdf.setTextColor(255, 255, 255);
                pdf.text(header, xPos + 2, yPosition + 6);
                xPos += colWidths[idx];
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
                const metaAlcancada = metaAlcancadaRaw;
                const atingiu = metaAtingida(criterio, valorAlcancado);

                // calcular percentual por linha (compatível com a UI)
                let rowPercent = NaN;
                if (criterio.tipo === 'qualitativo') {
                  const n = metaAlcancadaRaw ? parseFloat(String(metaAlcancadaRaw).replace(',', '.')) || NaN : NaN;
                  rowPercent = n;
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
                  pdf.setFillColor(245, 245, 245);
                  pdf.rect(margin, yPosition, pageWidth - 2 * margin, 8, 'F');
                }

                const isGerenciaOr360 = (criterio.idCriterio === 1 || criterio.idCriterio === 2);
                const statusLabel = isGerenciaOr360 ? getLabelForPercentage(rowPercent) : (atingiu ? 'Atingida' : 'Não Atingida');

                const valorMetaMonetario = getValorCriterio(criterio);

                const rowData = [
                  criterio.nome,
                  criterio.tipo === 'qualitativo' ? `${criterio.valorMeta}%` : criterio.valorMeta.toString(),
                  criterio.tipo === 'qualitativo' ? (metaAlcancada ? `${metaAlcancada}%` : 'N/A') : (criterioAvaliacao ? String(parseInt(String(criterioAvaliacao.metaAlcancada || criterioAvaliacao.valorAlcancado || 0), 10)) : '0'),
                  statusLabel,
                  formatarMoeda(valorMetaMonetario),
                  formatarMoeda(valorBonusAlcancado)
                ];

                const rowHeight = 8;
                const firstColTextLines = pdf.splitTextToSize(rowData[0], colWidths[0] - 4);
                const newRowHeight = rowHeight * firstColTextLines.length;

                rowData.forEach((data, colIdx) => {
                  const textY = yPosition + 6;
                  // aplicar cor para a coluna 'Alcançado' (qualitativos) e para 'Status' usando rowPercent
                  if (colIdx === 2) {
                    // para a coluna 'Alcançado':
                    // - se bloco for Gerência/360 usamos as faixas (rowPercent)
                    // - se não for, usamos binário (atingiu -> verde / !atingiu -> vermelho)
                    if (isGerenciaOr360 && criterio.tipo === 'qualitativo') {
                      const rgb = getColorRgbForPercentage(rowPercent);
                      pdf.setTextColor(rgb[0], rgb[1], rgb[2]);
                    } else {
                      // binário com base em 'atingiu'
                      if (atingiu) pdf.setTextColor(16, 185, 129); else pdf.setTextColor(220, 38, 38);
                    }
                  }
                  if (colIdx === 3) {
                    // para Gerência/360 usar faixas; caso contrário usar verde/vermelho binário
                    if (isGerenciaOr360) {
                      const rgb = getColorRgbForPercentage(rowPercent);
                      pdf.setTextColor(rgb[0], rgb[1], rgb[2]);
                    } else {
                      // binário: verde se atingiu, vermelho se não
                      if (atingiu) pdf.setTextColor(16, 185, 129); else pdf.setTextColor(220, 38, 38);
                    }
                  }

                  if (colIdx === 0) {
                    pdf.text(firstColTextLines, xPos + 2, textY);
                  } else {
                    pdf.text(data, xPos + 2, textY);
                  }

                  // reset cor para preto depois da célula
                  pdf.setTextColor(0, 0, 0);
                  xPos += colWidths[colIdx];
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
            const percentualPerformance = avaliacao.valorTotalMeta > 0
              ? (avaliacao.valorTotalAlcancado / avaliacao.valorTotalMeta) * 100
              : 0;

            pdf.text(`Valor Total Possível: ${formatarMoeda(avaliacao.valorTotalMeta)}`, margin, yPosition);
            yPosition += 6;
            checkPageBreak();
            pdf.text(`Valor Total Alcançado: ${formatarMoeda(avaliacao.valorTotalAlcancado)}`, margin, yPosition);
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

            // Salvar PDF
            const fileName = `avaliacao_${operador.nome.replace(/\s+/g, '_')}_${avaliacao.periodo}.pdf`;
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