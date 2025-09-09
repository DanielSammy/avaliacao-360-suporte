import React from 'react';
import { Button } from '@/components/ui/button';
import { jsPDF } from 'jspdf';
import { formulas } from '@/utils/calculations';
import { FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function CalculationReportGenerator() {
  const { toast } = useToast();

  const generateReport = async () => {
    try {
      toast({
        title: "Gerando Relatório de Cálculo",
        description: "Preparando documento...",
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
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

      // Adicionar logo
      const logo = new Image();
      logo.src = './logo_doc.png';
      await new Promise((resolve, reject) => { 
        logo.onload = resolve; 
        logo.onerror = reject;
      });
      const headerWidth = pageWidth;
      const headerHeight = 45;

      pdf.addImage(logo, 'PNG', 0, 0, headerWidth, headerHeight);
      yPosition = headerHeight + 10;

      // Título
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Metodologia de Cálculo da Avaliação de Desempenho', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;
      checkPageBreak();

      // Introdução
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Este documento detalha a metodologia utilizada para o cálculo da avaliação de desempenho dos operadores de suporte, com base nos critérios e metas estabelecidos para o período.', margin, yPosition, { maxWidth: pageWidth - margin * 2 });
      yPosition += 10;
      checkPageBreak();

      const drawSectionTitle = (title: string) => {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text(title, margin, yPosition);
        yPosition += 8;
        checkPageBreak();
      };

      const drawSubSectionTitle = (title: string) => {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text(title, margin, yPosition);
        yPosition += 6;
        checkPageBreak();
      };

      const drawParagraph = (text: string) => {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        const splitText = pdf.splitTextToSize(text, pageWidth - margin * 2);
        pdf.text(splitText, margin, yPosition);
        yPosition += (splitText.length * 5) + 5;
        checkPageBreak();
      };

      const drawFormula = (text: string) => {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'italic');
        const splitText = pdf.splitTextToSize(text, pageWidth - margin * 2 - 10);
        pdf.text(splitText, margin + 5, yPosition);
        yPosition += (splitText.length * 5) + 5;
        checkPageBreak();
      };

      drawSectionTitle('1. Critérios de Avaliação');
      drawParagraph('A avaliação de desempenho é composta por um conjunto de critérios, cada um com seu respectivo peso, meta e valor de bônus. Os critérios são divididos em duas categorias: Quantitativos e Qualitativos.');

      drawSubSectionTitle('1.1. Critérios Quantitativos');
      drawParagraph('São critérios mensuráveis por meio de indicadores numéricos. A meta é definida por um valor a ser alcançado. Ex: Quantidade de atendimentos, tempo médio de atendimento, etc.');

      drawSubSectionTitle('1.2. Critérios Qualitativos');
      drawParagraph('São critérios que avaliam a qualidade do trabalho do operador, geralmente por meio de notas ou conceitos. A meta é definida por um percentual a ser atingido. Ex: Qualidade da comunicação, cordialidade, etc.');

      drawSectionTitle('2. Apuração dos Resultados');
      drawSubSectionTitle('2.1. Consolidação dos Resultados por Critério');
      drawParagraph('O resultado de cada critério é consolidado da seguinte forma:');
      drawFormula(formulas.consolidacao.gestor);
      drawFormula(formulas.consolidacao.media);

      drawSubSectionTitle('2.2. Verificação de Atingimento da Meta');
      drawParagraph('Para cada critério, o resultado consolidado é comparado com a meta definida, considerando o tipo de meta:');
      drawFormula(`- ${formulas.metaAtingida.maiorMelhor}`);
      drawFormula(`- ${formulas.metaAtingida.menorMelhor}`);

      drawSectionTitle('3. Cálculo do Valor do Bônus');
      drawSubSectionTitle('3.1. Bônus por Critério');
      drawParagraph('O cálculo do bônus para cada critério é realizado da seguinte forma:');
      drawFormula(formulas.calculoBonus.metaAtingida);
      drawParagraph('Caso a meta não seja atingida, o bônus é calculado proporcionalmente:');
      drawFormula(formulas.calculoBonus.proporcionalMaior);
      drawFormula(formulas.calculoBonus.proporcionalMenor);

      drawSubSectionTitle('3.2. Bônus Total');
      drawParagraph('O bônus total do operador é a soma dos bônus alcançados em cada um dos critérios avaliados.');
      drawFormula('Bônus Total = Σ (Bônus Alcançado por Critério)');

      drawSectionTitle('4. Performance Geral');
      drawParagraph('A performance geral do operador é calculada em percentual, e representa a proporção do bônus total alcançado em relação ao bônus total possível.');
      drawFormula(formulas.performanceGeral.formula);

      // Considerações Finais
      yPosition += 10;
      checkPageBreak();
      drawSectionTitle('5. Considerações Finais');
      drawParagraph('Este modelo de avaliação busca ser transparente e justo, incentivando o desenvolvimento contínuo de nossos colaboradores. Os critérios e metas são revisados periodicamente para garantir que estejam alinhados com os objetivos da empresa.');

      // Rodapé
      const totalPages = pageNumber;
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'italic');
        pdf.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pdf.internal.pageSize.getHeight() - 10, { align: 'right' });
        pdf.text('Sistema Avalia+ | Documento de Metodologia de Cálculo', margin, pdf.internal.pageSize.getHeight() - 10);
      }

      // Salvar PDF
      const fileName = `metodologia_de_calculo_detalhada.pdf`;
      pdf.save(fileName);

      toast({
        title: "Relatório Detalhado Gerado com Sucesso!",
        description: `O arquivo ${fileName} foi salvo.`,
        variant: "default"
      });

    } catch (error) {
      console.error('Erro ao gerar relatório de cálculo detalhado:', error);
      toast({
        title: "Erro ao Gerar Relatório Detalhado",
        description: "Não foi possível gerar o arquivo de metodologia detalhado.",
        variant: "destructive"
      });
    }
  };

  return (
    <Button onClick={generateReport} variant="outline" size="sm">
      <FileText className="h-4 w-4 mr-2" />
      Exportar Metodologia Detalhada
    </Button>
  );
}