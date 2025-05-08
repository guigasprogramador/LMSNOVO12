
import { useState, useEffect } from "react";
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
import { Certificate, User, Course } from "@/types";
import { certificateService } from "@/services";
import { userService } from "@/services";
import { courseService } from "@/services";
import { toast } from "sonner";
import { Plus, Download, Search, RefreshCw, Loader2, MoreHorizontal, Eye, Edit, Trash } from "lucide-react";
import { CreateCertificateData } from "@/services/certificateService";

interface CertificateFormData {
  userId: string;
  courseId: string;
  userName: string;
  courseName: string;
}

const defaultFormData: CertificateFormData = {
  userId: "",
  courseId: "",
  userName: "",
  courseName: "",
};

const AdminCertificates = () => {
  // State management
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<CertificateFormData>(defaultFormData);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterCourse, setFilterCourse] = useState<string>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingCertificateId, setEditingCertificateId] = useState<string | null>(null);

  // Load data on initial render
  useEffect(() => {
    fetchCertificates();
    fetchUsers();
    fetchCourses();
  }, []);

  // Separate data fetching functions to avoid Promise.all failures
  const fetchCertificates = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await certificateService.getCertificates();
      setCertificates(data || []);
    } catch (err) {
      console.error("Error fetching certificates:", err);
      setError("Não foi possível carregar os certificados");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await userService.getAllUsers();
      setUsers(data || []);
    } catch (err) {
      console.error("Error fetching users:", err);
      // Don't show error toast for users, just log it
    }
  };

  const fetchCourses = async () => {
    try {
      const data = await courseService.getCourses();
      setCourses(data || []);
    } catch (err) {
      console.error("Error fetching courses:", err);
      // Don't show error toast for courses, just log it
    }
  };

  // Filter certificates based on search criteria
  const filteredCertificates = certificates.filter(cert => {
    if (!cert) return false; // Safety check
    
    const matchesSearch = !searchTerm || 
      (cert.userName && cert.userName.toLowerCase().includes(searchTerm.toLowerCase())) || 
      (cert.courseName && cert.courseName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCourse = filterCourse === 'all' || cert.courseId === filterCourse;
    
    return matchesSearch && matchesCourse;
  });

  // Handlers
  const handleUserChange = (userId: string) => {
    const selectedUser = users.find(user => user.id === userId);
    setFormData(prev => ({
      ...prev,
      userId,
      userName: selectedUser?.name || "",
    }));
  };

  const handleCourseChange = (courseId: string) => {
    const selectedCourse = courses.find(course => course.id === courseId);
    setFormData(prev => ({
      ...prev,
      courseId,
      courseName: selectedCourse?.title || "",
    }));
  };

  const resetForm = () => {
    setFormData(defaultFormData);
    setEditingCertificateId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.userId || !formData.courseId) {
      toast.error("Selecione um aluno e um curso");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const certificateData: CreateCertificateData = {
        ...formData,
        issueDate: new Date().toISOString()
      };
      
      if (editingCertificateId) {
        await certificateService.updateCertificate(editingCertificateId, certificateData);
        toast.success("Certificado atualizado com sucesso");
      } else {
        await certificateService.createCertificate(certificateData);
        toast.success("Certificado criado com sucesso");
      }
      
      setIsDialogOpen(false);
      resetForm();
      await fetchCertificates(); // Refresh certificates
    } catch (error: any) {
      toast.error(error.message || "Erro ao processar certificado");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateCertificate = (userId: string, courseId: string) => {
    try {
      certificateService.generateCertificate(userId, courseId);
      toast.success("Certificado em processamento");
      setTimeout(() => fetchCertificates(), 2000); // Refresh after a delay
    } catch (error: any) {
      toast.error(error.message || "Erro ao gerar certificado");
    }
  };

  const handleEditCertificate = (certificate: Certificate) => {
    setEditingCertificateId(certificate.id);
    setFormData({
      userId: certificate.userId,
      courseId: certificate.courseId,
      userName: certificate.userName || "",
      courseName: certificate.courseName || ""
    });
    setIsDialogOpen(true);
  };

  const handleDeleteCertificate = async (certificateId: string) => {
    if (window.confirm("Tem certeza que deseja excluir este certificado?")) {
      try {
        await certificateService.deleteCertificate(certificateId);
        toast.success("Certificado excluído com sucesso");
        fetchCertificates();
      } catch (error: any) {
        toast.error(error.message || "Erro ao excluir certificado");
      }
    }
  };

  const handleDownloadCertificate = (certificateId: string) => {
    window.open(`/certificates/${certificateId}/download`, '_blank');
  };

  // Helper function to render certificates with error handling
  const renderCertificates = () => {
    if (isLoading) {
      return (
        <TableRow>
          <TableCell colSpan={4} className="text-center py-8">
            <div className="flex justify-center items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Carregando certificados...</span>
            </div>
          </TableCell>
        </TableRow>
      );
    }

    if (error) {
      return (
        <TableRow>
          <TableCell colSpan={4} className="text-center py-8 text-red-500">
            {error}
            <Button 
              variant="link" 
              className="ml-2 underline" 
              onClick={() => fetchCertificates()}
            >
              Tentar novamente
            </Button>
          </TableCell>
        </TableRow>
      );
    }

    if (!certificates || certificates.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={4} className="text-center py-8">
            Nenhum certificado encontrado
          </TableCell>
        </TableRow>
      );
    }

    if (filteredCertificates.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={4} className="text-center py-8">
            Nenhum certificado corresponde aos filtros aplicados
          </TableCell>
        </TableRow>
      );
    }

    return filteredCertificates.map((cert) => (
      <TableRow key={cert.id}>
        <TableCell>{cert.userName || "Nome não disponível"}</TableCell>
        <TableCell>{cert.courseName || "Curso não disponível"}</TableCell>
        <TableCell>{cert.issueDate ? new Date(cert.issueDate).toLocaleDateString() : "Data não disponível"}</TableCell>
        <TableCell className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => window.open(`/certificates/${cert.id}`, '_blank')}>
                <Eye className="h-4 w-4 mr-2" />
                Visualizar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownloadCertificate(cert.id)}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEditCertificate(cert)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-destructive" 
                onClick={() => handleDeleteCertificate(cert.id)}
              >
                <Trash className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Certificados</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Emitir Certificado
            </Button>
          </DialogTrigger>
          <DialogContent className="w-full max-w-md sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl sm:text-2xl">
                {editingCertificateId ? "Editar Certificado" : "Emitir Novo Certificado"}
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                {editingCertificateId
                  ? "Atualize as informações do certificado abaixo."
                  : "Preencha as informações para emitir um novo certificado."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="userId">Aluno</Label>
                {users.length > 0 ? (
                  <Select
                    value={formData.userId || undefined}
                    onValueChange={handleUserChange}
                  >
                    <SelectTrigger id="userId">
                      <SelectValue placeholder="Selecione um aluno" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {users.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name || 'Usuário sem nome'}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
                    Carregando usuários...
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="courseId">Curso</Label>
                {courses.length > 0 ? (
                  <Select
                    value={formData.courseId || undefined}
                    onValueChange={handleCourseChange}
                  >
                    <SelectTrigger id="courseId">
                      <SelectValue placeholder="Selecione um curso" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {courses.map(course => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.title || 'Curso sem título'}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
                    Carregando cursos...
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={isSubmitting || !formData.userId || !formData.courseId}
                >
                  {isSubmitting 
                    ? "Salvando..." 
                    : editingCertificateId 
                      ? "Atualizar" 
                      : "Emitir Certificado"
                  }
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros simplificados */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por aluno ou curso..."
              className="pl-8 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="w-full sm:w-64">
            {courses ? (
              <Select
                value={filterCourse}
                onValueChange={setFilterCourse}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os cursos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">Todos os cursos</SelectItem>
                    {courses.length > 0 && courses.map(course => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title || 'Curso sem título'}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            ) : (
              <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
                Carregando cursos...
              </div>
            )}
          </div>
          
          <Button 
            variant="outline" 
            onClick={() => {
              setSearchTerm('');
              setFilterCourse('all');
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Limpar
          </Button>
        </div>
      </Card>

      {/* Tabela de Certificados */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aluno</TableHead>
                <TableHead>Curso</TableHead>
                <TableHead>Data de Emissão</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {renderCertificates()}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default AdminCertificates;
