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

            // Carregar nomes dos tipos de critério (para títulos dos blocos)
            const tipoCriterioMap: Record<number, string> = {};
            try {
              // import dinamico para evitar aumentar bundle no componente (apenas runtime)
              const { getTipoCriterios } = await import('@/services/criteriaService');
              const tipos = await getTipoCriterios();
              tipos.forEach((t: { id: number; descricao: string }) => { tipoCriterioMap[t.id] = t.descricao; });
            } catch (err) {
              // Silencioso: se falhar, usaremos os nomes padrão 'Bloco X'
              console.warn('Não foi possível carregar tipos de critério para títulos dos blocos:', err);
            }

            const tableHeaders = ['Critério', 'Meta', 'Alcançado', 'Status', 'Valor Meta', 'Valor Alcançado'];
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
                const metaAlcancada = criterioAvaliacao?.metaAlcancada || '';
                const atingiu = metaAtingida(criterio, valorAlcancado);

                xPos = margin;

                if (idx % 2 !== 0) {
                  pdf.setFillColor(245, 245, 245);
                  pdf.rect(margin, yPosition, pageWidth - 2 * margin, 8, 'F');
                }

                const rowData = [
                  criterio.nome,
                  criterio.tipo === 'qualitativo' ? `${criterio.valorMeta}%` : criterio.valorMeta.toString(),
                  criterio.tipo === 'qualitativo' ? `${metaAlcancada}%` : parseInt(metaAlcancada).toString(),
                  atingiu ? 'Atingida' : 'Não Atingida',
                  formatarMoeda(criterio.valorBonus),
                  formatarMoeda(valorBonusAlcancado)
                ];

                const rowHeight = 8;
                const firstColTextLines = pdf.splitTextToSize(rowData[0], colWidths[0] - 4);
                const newRowHeight = rowHeight * firstColTextLines.length;

                rowData.forEach((data, colIdx) => {
                  const textY = yPosition + 6;
                  if (colIdx === 0) {
                    pdf.text(firstColTextLines, xPos + 2, textY);
                  } else {
                    pdf.text(data, xPos + 2, textY);
                  }
                  xPos += colWidths[colIdx];
                });

                yPosition += newRowHeight;
                checkPageBreak();
              });

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

        return (
          <Button onClick={generatePDF} variant="accent" className="w-full">
            <FileDown className="h-4 w-4 mr-2" />
            Gerar Relatório PDF
          </Button>
        );
      }