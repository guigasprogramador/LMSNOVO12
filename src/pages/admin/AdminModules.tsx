import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Module, Course } from "@/types";
import { moduleService, courseService } from "@/services/api";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Edit, Trash, BookOpen } from "lucide-react";

interface ModuleFormData {
  title: string;
  description: string;
  courseId: string;
  order: number;
}

const defaultFormData: ModuleFormData = {
  title: "",
  description: "",
  courseId: "",
  order: 1,
};

const AdminModules = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const coursePrefillId = queryParams.get("courseId");
  
  const [modules, setModules] = useState<Module[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(coursePrefillId || "");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<ModuleFormData>({
    ...defaultFormData,
    courseId: coursePrefillId || "",
  });
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const coursesData = await courseService.getCourses();
      setCourses(coursesData);
      
      if (selectedCourseId) {
        fetchModulesByCourse(selectedCourseId);
      } else {
        // If no course is selected, show all modules
        const allModules = await Promise.all(
          coursesData.map((course) => moduleService.getModulesByCourseId(course.id))
        );
        setModules(allModules.flat());
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
      setIsLoading(false);
    }
  };

  const fetchModulesByCourse = async (courseId: string) => {
    try {
      const modulesData = await moduleService.getModulesByCourseId(courseId);
      setModules(modulesData);
    } catch (error) {
      console.error("Error fetching modules:", error);
      toast.error("Erro ao carregar módulos");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCourseSelect = (courseId: string) => {
    setSelectedCourseId(courseId);
    fetchModulesByCourse(courseId);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditModule = (module: Module) => {
    setFormData({
      title: module.title,
      description: module.description,
      courseId: module.courseId,
      order: module.order,
    });
    setEditingModuleId(module.id);
    setIsDialogOpen(true);
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (confirm("Tem certeza de que deseja excluir este módulo?")) {
      try {
        await moduleService.deleteModule(moduleId);
        toast.success("Módulo excluído com sucesso");
        
        // Remover o módulo do estado local imediatamente
        setModules(prevModules => prevModules.filter(module => module.id !== moduleId));
        
        // Atualizar os dados em segundo plano para garantir sincronização
        setTimeout(() => {
          if (selectedCourseId) {
            fetchModulesByCourse(selectedCourseId);
          } else {
            fetchData();
          }
        }, 1000); // Atraso de 1 segundo para dar tempo à UI de renderizar primeiro
      } catch (error) {
        console.error("Error deleting module:", error);
        toast.error("Erro ao excluir o módulo");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("Título do módulo é obrigatório");
      return;
    }
    if (!formData.courseId) {
      toast.error("Selecione um curso para o módulo");
      return;
    }
    
    // Criar um ID temporário para o novo módulo
    const tempId = `temp-${Date.now()}`;
    
    // Se estiver criando um novo módulo, adicione-o imediatamente ao estado com um ID temporário
    if (!editingModuleId) {
      const tempModule: Module = {
        id: tempId,
        title: formData.title.trim(),
        description: formData.description?.trim() || '',
        order: Number(formData.order) || 1,
        courseId: formData.courseId,
        lessons: []
      };
      
      // Adicionar o módulo temporário ao estado imediatamente
      console.log('Adicionando módulo temporário ao estado:', tempModule);
      setModules(prevModules => [...prevModules, tempModule]);
    }
    
    setIsLoading(true);
    try {
      if (editingModuleId) {
        // Atualizar módulo existente
        const updatedModuleData = {
          title: formData.title.trim(),
          description: formData.description?.trim() || '',
          order: Number(formData.order) || 1,
        };
        
        await moduleService.updateModule(editingModuleId, updatedModuleData);
        toast.success("Módulo atualizado com sucesso");
        
        // Atualizar o módulo no estado local imediatamente
        setModules(prevModules => 
          prevModules.map(module => 
            module.id === editingModuleId 
              ? { ...module, ...updatedModuleData }
              : module
          )
        );
      } else {
        // Criar novo módulo
        const moduleData = {
          title: formData.title.trim(),
          description: formData.description?.trim() || '',
          order: Number(formData.order) || 1,
        };
        
        const newModule = await moduleService.createModule(formData.courseId, moduleData);
        toast.success("Módulo criado com sucesso");
        
        // Substituir o módulo temporário pelo módulo real
        setModules(prevModules => 
          prevModules.map(module => 
            module.id === tempId 
              ? {
                  id: newModule.id,
                  title: newModule.title,
                  description: newModule.description || '',
                  order: newModule.order,
                  courseId: newModule.courseId,
                  lessons: []
                }
              : module
          )
        );
      }
      
      setIsDialogOpen(false);
      setFormData({ ...defaultFormData, courseId: selectedCourseId });
      setEditingModuleId(null);
      
      // Atualizar os dados em segundo plano para garantir sincronização
      setTimeout(() => {
        if (selectedCourseId) {
          fetchModulesByCourse(selectedCourseId);
        } else {
          fetchData();
        }
      }, 1000); // Atraso de 1 segundo para dar tempo à UI de renderizar primeiro
    } catch (error: any) {
      // Se ocorrer um erro e estiver criando um novo módulo, remova o módulo temporário
      if (!editingModuleId) {
        setModules(prevModules => prevModules.filter(module => module.id !== tempId));
      }
      toast.error(error.message || "Erro ao salvar o módulo");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      ...defaultFormData,
      courseId: selectedCourseId,
    });
    setEditingModuleId(null);
  };

  return (
    <div className="space-y-8 px-4 py-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Gerenciar Módulos</h1>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              resetForm();
              setIsDialogOpen(true);
            }} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md px-4 py-2 flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Novo Módulo
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                {editingModuleId ? "Editar Módulo" : "Criar Novo Módulo"}
              </DialogTitle>
              <DialogDescription>
                Preencha os detalhes do módulo abaixo.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="courseId">Curso</Label>
                <Select
                  value={formData.courseId}
                  onValueChange={(value) => 
                    setFormData((prev) => ({ ...prev, courseId: value }))
                  }
                  required
                >
                  <SelectTrigger id="courseId" className="rounded-md">
                    <SelectValue placeholder="Selecione um curso" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Título do módulo"
                  required
                  className="rounded-md"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Descreva o módulo"
                  rows={3}
                  required
                  className="rounded-md"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="order">Ordem</Label>
                <Input
                  id="order"
                  name="order"
                  type="number"
                  min="1"
                  value={formData.order}
                  onChange={handleInputChange}
                  placeholder="Ordem de exibição"
                  required
                  className="rounded-md"
                />
              </div>
              <DialogFooter>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                  {editingModuleId ? "Atualizar" : "Criar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-4">
        <div className="w-full sm:w-[320px]">
          <Label htmlFor="filterCourse">Filtrar por Curso</Label>
          <Select value={selectedCourseId} onValueChange={handleCourseSelect}>
            <SelectTrigger id="filterCourse" className="w-full rounded-md">
              <SelectValue placeholder="Todos os cursos" />
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

      <Card className="rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <p className="text-lg text-gray-500">Carregando módulos...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-800">
                  <TableHead className="py-3 px-4 text-left font-semibold text-gray-700 dark:text-gray-200">Ordem</TableHead>
                  <TableHead className="py-3 px-4 text-left font-semibold text-gray-700 dark:text-gray-200">Título</TableHead>
                  <TableHead className="py-3 px-4 text-left font-semibold text-gray-700 dark:text-gray-200">Curso</TableHead>
                  <TableHead className="py-3 px-4 text-left font-semibold text-gray-700 dark:text-gray-200">Aulas</TableHead>
                  <TableHead className="py-3 px-4 text-center font-semibold text-gray-700 dark:text-gray-200 w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                      {selectedCourseId
                        ? "Este curso ainda não possui módulos"
                        : "Nenhum módulo encontrado"}
                    </TableCell>
                  </TableRow>
                ) : (
                  modules.map((module) => {
                    const course = courses.find(c => c.id === module.courseId);
                    return (
                      <TableRow key={module.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition rounded-lg">
                        <TableCell className="py-3 px-4 font-mono text-sm text-gray-700 dark:text-gray-200">{module.order}</TableCell>
                        <TableCell className="py-3 px-4 font-medium text-gray-900 dark:text-white">{module.title}</TableCell>
                        <TableCell className="py-3 px-4 text-gray-700 dark:text-gray-200">{course ? course.title : "Curso não encontrado"}</TableCell>
                        <TableCell className="py-3 px-4">
                          <Badge variant="outline" className="rounded-full px-3 py-1 text-sm bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-100 dark:border-blue-700">
                            {module.lessons.length}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 px-4 text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-lg shadow-lg">
                              <DropdownMenuItem onClick={() => handleEditModule(module)} className="flex items-center gap-2">
                                <Edit className="h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteModule(module.id)} className="flex items-center gap-2 text-red-600">
                                <Trash className="h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => window.location.href = `/admin/lessons?moduleId=${module.id}`}
                                className="flex items-center gap-2"
                              >
                                <BookOpen className="h-4 w-4" />
                                Gerenciar Aulas
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminModules;
