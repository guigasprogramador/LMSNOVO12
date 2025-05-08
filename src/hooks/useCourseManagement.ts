import { useState, useEffect } from "react";
import { Course } from "@/types";
import { courseService } from "@/services/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export interface CourseFormData {
  title: string;
  description: string;
  instructor: string;
  duration: string;
  thumbnail: string;
  enrolledCount: number;
  rating: number;
}

const defaultFormData: CourseFormData = {
  title: "",
  description: "",
  instructor: "",
  duration: "",
  thumbnail: "/placeholder.svg",
  enrolledCount: 0,
  rating: 0,
};

export function useCourseManagement() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<CourseFormData>(defaultFormData);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setIsLoading(true);
      const coursesData = await courseService.getCourses();
      setCourses(coursesData);
    } catch (error) {
      console.error("Error fetching courses:", error);
      toast.error("Erro ao carregar os cursos");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAdmin()) {
      toast.error("Você não tem permissão para gerenciar cursos");
      return;
    }

    if (!formData.title || !formData.instructor) {
      toast.error("Título e instrutor são obrigatórios");
      return;
    }

    setIsSubmitting(true);

    try {
      const courseData = {
        ...formData,
        enrolledCount: formData.enrolledCount || 0,
        rating: formData.rating || 0,
      };

      if (editingCourseId) {
        await courseService.updateCourse(editingCourseId, courseData);
        toast.success("Curso atualizado com sucesso");
      } else {
        await courseService.createCourse(courseData);
        toast.success("Curso criado com sucesso");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchCourses();
    } catch (error: any) {
      toast.error(`Erro ao salvar curso: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditCourse = (course: Course) => {
    setFormData({
      title: course.title,
      description: course.description,
      instructor: course.instructor,
      duration: course.duration,
      thumbnail: course.thumbnail,
      enrolledCount: course.enrolledCount,
      rating: course.rating,
    });
    setEditingCourseId(course.id);
    setIsDialogOpen(true);
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!isAdmin()) {
      toast.error("Você não tem permissão para excluir cursos");
      return;
    }

    if (!confirm("Tem certeza que deseja excluir este curso?")) {
      return;
    }

    try {
      await courseService.deleteCourse(courseId);
      toast.success("Curso excluído com sucesso");
      fetchCourses();
    } catch (error: any) {
      toast.error(`Erro ao excluir curso: ${error.message}`);
    }
  };

  const resetForm = () => {
    setFormData(defaultFormData);
    setEditingCourseId(null);
  };

  return {
    courses,
    isLoading,
    isDialogOpen,
    setIsDialogOpen,
    formData,
    editingCourseId,
    isSubmitting,
    handleInputChange,
    handleEditCourse,
    handleDeleteCourse,
    handleSubmit,
    resetForm,
  };
}
