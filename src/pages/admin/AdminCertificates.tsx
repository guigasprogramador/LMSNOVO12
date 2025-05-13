import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Certificate } from "@/types";
import { toast } from "sonner";
import { Plus, Search, RefreshCw, Loader2, MoreHorizontal, Eye, Edit, Trash } from "lucide-react";
import { useCertificateManagement } from "@/hooks/useCertificateManagement";

const AdminCertificates = () => {
  const {
    certificates,
    courses,
    isLoading,
    error,
    isDialogOpen,
    setIsDialogOpen,
    formData,
    editingCertificateId,
    isSubmitting,
    searchTerm,
    filterCourseId,
    handleUserChange,
    handleCourseChange,
    handleSubmit,
    handleEditCertificate,
    handleDeleteCertificate,
    handleGenerateCertificate,
    handleSearch,
    handleFilterCourse,
    resetForm,
    fetchCertificates,
    fetchCoursesWithEnrollments
  } = useCertificateManagement();

  // Carregar dados apenas inicialmente
  useEffect(() => {
    const loadData = async () => {
      try {
        // Carregamento inicial feito apenas uma vez
        await fetchCertificates();
        await fetchCoursesWithEnrollments();
      } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error);
      }
    };
    
    loadData();
    // Remover dependências para evitar loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Gerenciar Certificados</h1>
        <div className="flex space-x-2">
          <Button variant="outline" size="icon" onClick={fetchCertificates} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
          <Dialog 
            open={isDialogOpen} 
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button onClick={() => {
                resetForm();
                setIsDialogOpen(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Certificado
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingCertificateId ? "Editar Certificado" : "Adicionar Certificado"}
                </DialogTitle>
                <DialogDescription>
                  {editingCertificateId 
                    ? "Atualize os detalhes do certificado" 
                    : "Preencha os dados para criar um novo certificado de conclusão de curso."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="courseId" className="text-right">
                      Curso
                    </Label>
                    <div className="col-span-3">
                      <Select
                        value={formData.courseId}
                        onValueChange={(value) => {
                          const course = courses.find(c => c.id === value);
                          handleCourseChange(value, course?.title || "");
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um curso" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {courses.map((course) => (
                              <SelectItem key={course.id} value={course.id}>
                                {course.title}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {formData.courseId && (
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="userId" className="text-right">
                        Aluno
                      </Label>
                      <div className="col-span-3">
                        <Select 
                          value={formData.userId} 
                          onValueChange={(value) => {
                            const courseWithEnrollments = courses.find(c => c.id === formData.courseId);
                            const student = courseWithEnrollments?.enrolledUsers?.find(u => u.userId === value);
                            handleUserChange(value, student?.userName || "");
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um aluno" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {/* MODIFICADO: Mostrando alunos de teste diretamente no componente */}
                              {formData.courseId ? (
                                // Alunos mockados para teste
                                [
                                  {
                                    userId: '1',
                                    userName: 'Aluno Teste 1',
                                    progress: 85,
                                    hasCertificate: false,
                                    isEligible: true
                                  },
                                  {
                                    userId: '2',
                                    userName: 'Aluno Teste 2',
                                    progress: 60,
                                    hasCertificate: false,
                                    isEligible: false
                                  },
                                  {
                                    userId: '3',
                                    userName: 'Aluno Teste 3',
                                    progress: 100,
                                    hasCertificate: true,
                                    isEligible: true
                                  }
                                ].map((mockStudent) => {
                                  // Determinar o texto de status para exibir junto ao nome do aluno
                                  let statusText = `(${mockStudent.progress}% completo)`;
                                  if (mockStudent.hasCertificate) {
                                    statusText += ' [Já possui certificado]';
                                  } else if (mockStudent.isEligible) {
                                    statusText += ' [Elegível]';
                                  }
                                  
                                  return (
                                    <SelectItem 
                                      key={mockStudent.userId}
                                      value={mockStudent.userId}
                                      disabled={mockStudent.hasCertificate}
                                    >
                                      {mockStudent.userName} {statusText}
                                    </SelectItem>
                                  );
                                })
                              ) : (
                                <SelectItem value="" disabled>Selecione um curso primeiro</SelectItem>
                              )}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processando
                      </>
                    ) : (
                      "Salvar"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 flex gap-2 border-b items-center">
          <div className="flex-1">
            <div className="relative w-full">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome do aluno ou curso..."
                className="pl-8 w-full"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Select 
              value={filterCourseId} 
              onValueChange={handleFilterCourse}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por curso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os cursos</SelectItem>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          {error && (
            <div className="p-4 text-center text-destructive">
              {error}
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aluno</TableHead>
                <TableHead>Curso</TableHead>
                <TableHead>Data de Emissão</TableHead>
                <TableHead>Data de Validade</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {certificates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    {isLoading ? "Carregando certificados..." : "Nenhum certificado encontrado."}
                  </TableCell>
                </TableRow>
              ) : (
                certificates.map((certificate) => (
                  <TableRow key={certificate.id}>
                    <TableCell className="font-medium">{certificate.userName}</TableCell>
                    <TableCell>{certificate.courseName}</TableCell>
                    <TableCell>
                      {new Date(certificate.issueDate).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      {certificate.expiryDate
                        ? new Date(certificate.expiryDate).toLocaleDateString('pt-BR')
                        : "Sem validade"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => {
                              if (certificate.certificateUrl) {
                                window.open(certificate.certificateUrl, "_blank");
                              } else {
                                toast.error("URL do certificado não disponível");
                              }
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleEditCertificate(certificate)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteCertificate(certificate.id)}
                            className="text-destructive"
                          >
                            <Trash className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default AdminCertificates;
