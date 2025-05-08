import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Certificate as CertificateType } from "@/types";
import { certificateService } from "@/services";
import { toast } from "sonner";
import { Download, Printer, ChevronLeft, Award, Share2 } from "lucide-react";
import jsPDF from "jspdf";

const Certificate = () => {
  const { certificateId } = useParams<{ certificateId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [certificate, setCertificate] = useState<CertificateType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const certificateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchCertificate = async () => {
      try {
        if (certificateId) {
          setIsLoading(true);
          const certificateData = await certificateService.getCertificateById(certificateId);
          setCertificate(certificateData);
        }
      } catch (error) {
        console.error("Error fetching certificate:", error);
        // O toast de erro já é exibido pelo serviço
        navigate("/aluno/certificados");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCertificate();
  }, [certificateId, navigate]);

  // Verificar se o usuário tem permissão para visualizar o certificado
  useEffect(() => {
    if (!isLoading && certificate && user && certificate.userId !== user.id) {
      toast.error("Você não tem permissão para visualizar este certificado");
      navigate("/aluno/certificados");
    }
  }, [certificate, user, isLoading, navigate]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!certificate) return;
    
    try {
      // Criar um PDF com jsPDF
      const doc = new jsPDF();
      
      // Adicionar um título
      doc.setFontSize(20);
      doc.text('Certificado de Conclusão', 105, 20, { align: 'center' });
      
      // Adicionar uma linha decorativa
      doc.setDrawColor(0, 0, 0);
      doc.line(50, 25, 160, 25);
      
      // Adicionar informações do certificado
      doc.setFontSize(16);
      doc.text('Este certificado é concedido a:', 105, 40, { align: 'center' });
      
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(certificate.userName, 105, 50, { align: 'center' });
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text('por concluir com sucesso o curso:', 105, 65, { align: 'center' });
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(certificate.courseName, 105, 75, { align: 'center' });
      
      // Adicionar data de emissão
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Emitido em: ${new Date(certificate.issueDate).toLocaleDateString('pt-BR')}`, 105, 95, { align: 'center' });
      
      // Adicionar ID do certificado para verificação
      doc.setFontSize(8);
      doc.text(`ID do Certificado: ${certificate.id}`, 105, 120, { align: 'center' });
      
      // Salvar o PDF
      doc.save(`certificado-${certificate.courseName.replace(/\s+/g, '-').toLowerCase()}.pdf`);
      
      toast.success('Certificado baixado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar o PDF do certificado');
    }
  };
  
  const handleShare = async () => {
    if (!certificate) return;
    
    try {
      // Verificar se a API de compartilhamento está disponível
      if (navigator.share) {
        await navigator.share({
          title: `Certificado de ${certificate.courseName}`,
          text: `Certificado de conclusão do curso ${certificate.courseName} por ${certificate.userName}`,
          url: window.location.href,
        });
        toast.success('Certificado compartilhado com sucesso!');
      } else {
        // Fallback para copiar o link
        navigator.clipboard.writeText(window.location.href);
        toast.success('Link do certificado copiado para a área de transferência!');
      }
    } catch (error) {
      console.error('Erro ao compartilhar certificado:', error);
      toast.error('Erro ao compartilhar certificado');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Carregando certificado...</p>
      </div>
    );
  }

  if (!certificate) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p>Certificado não encontrado</p>
        <Button className="mt-4" onClick={() => navigate("/aluno/certificados")}>
          Voltar para Meus Certificados
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/aluno/certificados")}
            className="mr-2"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Certificado</h1>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            className="flex-1 sm:flex-none"
            onClick={handleShare}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Compartilhar
          </Button>
          <Button
            variant="outline"
            className="flex-1 sm:flex-none"
            onClick={handlePrint}
          >
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
          <Button
            className="flex-1 sm:flex-none"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4 mr-2" />
            Baixar PDF
          </Button>
        </div>
      </div>

      {/* Certificate Card */}
      <div className="flex items-center justify-center p-4 print:p-0">
        <Card
          ref={certificateRef}
          className="w-full max-w-3xl p-8 sm:p-12 border-4 border-primary print:border-4 shadow-lg"
        >
          <div className="flex flex-col items-center text-center space-y-8">
            <div className="flex items-center justify-center">
              <Award className="h-12 w-12 text-yellow-500" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold uppercase tracking-wider">Certificado de Conclusão</h2>
              <p className="text-muted-foreground">Este certificado é concedido a</p>
            </div>
            
            <div className="space-y-3">
              <h3 className="text-3xl sm:text-4xl font-serif font-bold">{certificate.userName}</h3>
              <div className="w-40 h-1 bg-primary mx-auto"></div>
            </div>
            
            <div className="space-y-2">
              <p className="text-lg">por concluir com sucesso o curso</p>
              <h4 className="text-2xl sm:text-3xl font-medium">{certificate.courseName}</h4>
            </div>
            
            <div className="pt-4">
              <p className="text-muted-foreground">
                Emitido em{" "}
                <span className="font-medium">
                  {new Date(certificate.issueDate).toLocaleDateString("pt-BR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </p>
            </div>
            
            <div className="flex justify-between w-full pt-8 print:pt-12">
              <div className="text-center">
                <div className="w-32 h-px bg-border mb-2"></div>
                <p className="text-sm">Assinatura do Instrutor</p>
              </div>
              
              <div className="text-center">
                <div className="w-32 h-px bg-border mb-2"></div>
                <p className="text-sm">Diretor da Instituição</p>
              </div>
            </div>
            
            <div className="pt-4">
              <p className="text-xs text-muted-foreground">
                ID do Certificado: <span className="font-mono">{certificate.id}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Verifique a autenticidade em <span className="font-medium">plataforma.com.br/verificar</span>
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Certificate;
