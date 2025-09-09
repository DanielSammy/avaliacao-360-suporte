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
      toast({
        title: "Gerando PDF",
        description: "Preparando relatório...",
      });

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

      // Informações do operador
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

      // Tabela de critérios
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('CRITÉRIOS DE AVALIAÇÃO', margin, yPosition);
      yPosition += 8;
      checkPageBreak();

      const tableHeaders = ['Critério', 'Meta', 'Alcançado', 'Status', 'Valor Meta', 'Valor Alcançado'];
      const colWidths = [100, 30, 30, 30, 40, 40];
      let xPosition = margin;

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      tableHeaders.forEach((header, index) => {
        pdf.setFillColor(59, 130, 246);
        pdf.rect(xPosition, yPosition, colWidths[index], 8, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.text(header, xPosition + 2, yPosition + 6);
        xPosition += colWidths[index];
      });
      yPosition += 8;
      checkPageBreak();

      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      criterios
        .filter(criterio => criterio.ativo)
        .sort((a, b) => a.ordem - b.ordem)
        .forEach((criterio, index) => {
          const criterioAvaliacao = avaliacao.criterios.find(ca => ca.criterioId === criterio.id);
          const valorAlcancado = criterioAvaliacao?.valorAlcancado || 0;
          const valorBonusAlcancado = criterioAvaliacao?.valorBonusAlcancado || 0;
          const metaAlcancada = criterioAvaliacao?.metaAlcancada || '';
          const atingiu = metaAtingida(criterio, valorAlcancado);

          xPosition = margin;

          if (index % 2 !== 0) {
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

          rowData.forEach((data, index) => {
            const textY = yPosition + 6;
            if (index === 0) {
              pdf.text(firstColTextLines, xPosition + 2, textY);
            } else {
              pdf.text(data, xPosition + 2, textY);
            }
            xPosition += colWidths[index];
          });

          yPosition += newRowHeight;
          checkPageBreak();
        });

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

      toast({
        title: "PDF gerado com sucesso",
        description: `Relatório salvo como ${fileName}`,
        variant: "default"
      });

    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Ocorreu um erro ao gerar o relatório. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  return (
    <Button onClick={generatePDF} variant="accent" className="w-full">
      <FileDown className="h-4 w-4 mr-2" />
      Gerar Relatório PDF
    </Button>
  );
}