import React from 'react';
import { Button } from '@/components/ui/button';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
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
      const margin = 20;

      // Cabeçalho
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text('RELATÓRIO DE AVALIAÇÃO DE DESEMPENHO', pageWidth / 2, 30, { align: 'center' });

      // Linha decorativa
      pdf.setDrawColor(59, 130, 246); // Cor primária
      pdf.setLineWidth(2);
      pdf.line(margin, 35, pageWidth - margin, 35);

      // Informações do operador
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('DADOS DO OPERADOR', margin, 55);

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Nome: ${operador.nome}`, margin, 65);
      pdf.text(`Período: ${formatarPeriodo(avaliacao.periodo)}`, margin, 75);
      pdf.text(`Data de Geração: ${new Date().toLocaleDateString('pt-BR')}`, margin, 85);

      // Tabela de critérios
      let yPosition = 105;
      
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('CRITÉRIOS DE AVALIAÇÃO', margin, yPosition);
      yPosition += 15;

      // Cabeçalho da tabela
      const tableHeaders = ['Critério', 'Meta', 'Alcançado', 'Status', 'R$ Meta', 'R$ Alcançado'];
      const colWidths = [120, 30, 30, 30, 30, 30];
      let xPosition = margin;

      pdf.setFillColor(59, 130, 246);
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');

      // Desenhar cabeçalho
      tableHeaders.forEach((header, index) => {
        pdf.rect(xPosition, yPosition, colWidths[index], 8, 'F');
        pdf.text(header, xPosition + 2, yPosition + 6);
        xPosition += colWidths[index];
      });

      yPosition += 8;
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'normal');

      // Dados da tabela
      criterios
        .filter(criterio => criterio.ativo)
        .sort((a, b) => a.ordem - b.ordem)
        .forEach((criterio) => {
          const criterioAvaliacao = avaliacao.criterios.find(ca => ca.criterioId === criterio.id);
          const valorAlcancado = criterioAvaliacao?.valorAlcancado || 0;
          const valorBonusAlcancado = criterioAvaliacao?.valorBonusAlcancado || 0;
          const atingiu = metaAtingida(criterio, valorAlcancado);

          xPosition = margin;

          const rowData = [
            criterio.nome,
            criterio.nome === 'Quantitativo' ? criterio.valorMeta.toString() : `${criterio.valorMeta}%`,
            criterio.nome === 'Quantitativo' ? valorAlcancado.toString() : `${valorAlcancado.toFixed(1)}%`,
            atingiu ? 'Atingida' : 'Não Atingida',
            formatarMoeda(criterio.valorBonus),
            formatarMoeda(valorBonusAlcancado)
          ];

          const rowHeight = 8;
          const firstColTextLines = pdf.splitTextToSize(rowData[0], colWidths[0] - 4);
          const newRowHeight = rowHeight * firstColTextLines.length;

          // Alternar cor de fundo das linhas
          if (criterios.indexOf(criterio) % 2 === 0) {
            pdf.setFillColor(245, 245, 245);
            pdf.rect(margin, yPosition, pageWidth - 2 * margin, newRowHeight, 'F');
          }

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

          // Nova página se necessário
          if (yPosition > pageHeight - 50) {
            pdf.addPage();
            yPosition = 30;
          }
        });

      // Resumo
      yPosition += 15;
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('RESUMO DA AVALIAÇÃO', margin, yPosition);
      yPosition += 15;

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');

      const metasAtingidas = avaliacao.criterios.filter(ca => ca.metaAtingida).length;
      const totalMetas = criterios.filter(c => c.ativo).length;
      const percentualPerformance = avaliacao.valorTotalMeta > 0 
        ? (avaliacao.valorTotalAlcancado / avaliacao.valorTotalMeta) * 100 
        : 0;

      pdf.text(`Valor Total Possível: ${formatarMoeda(avaliacao.valorTotalMeta)}`, margin, yPosition);
      yPosition += 10;
      pdf.text(`Valor Total Alcançado: ${formatarMoeda(avaliacao.valorTotalAlcancado)}`, margin, yPosition);
      yPosition += 10;
      pdf.text(`Performance Geral: ${percentualPerformance.toFixed(1)}%`, margin, yPosition);
      yPosition += 10;
      pdf.text(`Metas Atingidas: ${metasAtingidas}/${totalMetas}`, margin, yPosition);

      // Rodapé
      const footerY = pageHeight - 15;
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.text('Sistema Avalia+ - Relatório gerado automaticamente', pageWidth / 2, footerY, { align: 'center' });

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