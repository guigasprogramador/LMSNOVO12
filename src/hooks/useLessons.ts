
import { useMutation, useQuery } from "@tanstack/react-query";
import { lessonService, moduleService, courseService } from "@/services/api";
import { Lesson, Module, Course } from "@/types";
import { useState, useEffect } from "react";

export function useLessons(moduleId?: string) {
  const {
    data: lessons = [],
    isLoading: isLoadingLessons,
    error: lessonsError,
    refetch: refetchLessons,
  } = useQuery({
    queryKey: ["lessons", moduleId],
    queryFn: () => (moduleId ? lessonService.getLessonsByModuleId(moduleId) : Promise.resolve([])),
    enabled: !!moduleId,
  });

  return {
    lessons,
    isLoadingLessons,
    lessonsError,
    refetchLessons,
  };
}

export function useModules(courseId?: string) {
  const {
    data: modules = [],
    isLoading: isLoadingModules,
    error: modulesError,
    refetch: refetchModules,
  } = useQuery({
    queryKey: ["modules", courseId],
    queryFn: () => (courseId ? moduleService.getModulesByCourseId(courseId) : Promise.resolve([])),
    enabled: !!courseId,
  });

  return {
    modules,
    isLoadingModules,
    modulesError,
    refetchModules,
  };
}

export function useLessonMutations() {
  const createLessonMutation = useMutation({
    mutationFn: (lesson: Omit<Lesson, "id">) => lessonService.createLesson(lesson),
  });

  const updateLessonMutation = useMutation({
    mutationFn: ({
      id,
      lesson,
    }: {
      id: string;
      lesson: Partial<Lesson>;
    }) => lessonService.updateLesson(id, lesson),
  });

  const deleteLessonMutation = useMutation({
    mutationFn: (id: string) => lessonService.deleteLesson(id),
  });

  const updateLessonStatusMutation = useMutation({
    mutationFn: ({
      lessonId,
      userId,
      completed,
    }: {
      lessonId: string;
      userId: string;
      completed: boolean;
    }) => lessonService.updateLessonStatus(lessonId, userId, completed),
  });

  return {
    createLesson: createLessonMutation.mutate,
    isCreating: createLessonMutation.isPending,
    updateLesson: updateLessonMutation.mutate,
    isUpdating: updateLessonMutation.isPending,
    deleteLesson: deleteLessonMutation.mutate,
    isDeleting: deleteLessonMutation.isPending,
    updateLessonStatus: updateLessonStatusMutation.mutate,
    isUpdatingStatus: updateLessonStatusMutation.isPending,
  };
}

// New hook for admin lessons page
export function useAdminLessons() {
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedModuleId, setSelectedModuleId] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Lesson, "id"> & { id?: string }>({
    moduleId: "",
    title: "",
    description: "",
    duration: "",
    order: 0,
    videoUrl: "",
    content: "",
  });

  // Get courses
  const {
    data: courses = [],
    isLoading: isLoadingCourses,
  } = useQuery({
    queryKey: ["courses"],
    queryFn: () => courseService.getCourses(),
  });

  // Get modules filtered by selected course
  const {
    modules: allModules = [],
    isLoadingModules,
  } = useModules(selectedCourseId);

  // Get lessons filtered by selected module
  const {
    lessons,
    isLoadingLessons,
    refetchLessons,
  } = useLessons(selectedModuleId);

  const {
    createLesson,
    updateLesson,
    deleteLesson,
    isCreating,
    isUpdating,
    isDeleting,
  } = useLessonMutations();

  const isLoading = isLoadingCourses || isLoadingModules || isLoadingLessons || isCreating || isUpdating || isDeleting;
  
  const filteredModules = selectedCourseId ? allModules : [];

  const handleCourseSelect = (courseId: string) => {
    setSelectedCourseId(courseId);
    setSelectedModuleId("");
  };

  const handleModuleSelect = (moduleId: string) => {
    setSelectedModuleId(moduleId);
  };

  const resetForm = () => {
    setFormData({
      moduleId: selectedModuleId,
      title: "",
      description: "",
      duration: "",
      order: lessons.length + 1,
      videoUrl: "",
      content: "",
    });
    setEditingLessonId(null);
  };

  const handleEditLesson = (lesson: Lesson) => {
    setFormData({
      ...lesson,
      id: lesson.id,
    });
    setEditingLessonId(lesson.id);
    setIsDialogOpen(true);
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (confirm("Are you sure you want to delete this lesson?")) {
      await deleteLesson(lessonId);
      refetchLessons();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingLessonId) {
        const { id, ...lessonData } = formData;
        await updateLesson({ id: editingLessonId, lesson: lessonData });
      } else {
        await createLesson(formData);
      }
      
      setIsDialogOpen(false);
      resetForm();
      refetchLessons();
    } catch (error) {
      console.error("Error saving lesson:", error);
    }
  };

  // Initialize form when selectedModuleId changes
  useEffect(() => {
    if (selectedModuleId) {
      resetForm();
    }
  }, [selectedModuleId]);

  return {
    courses,
    lessons,
    isLoading,
    selectedCourseId,
    selectedModuleId,
    filteredModules,
    isDialogOpen,
    setIsDialogOpen,
    formData,
    setFormData,
    editingLessonId,
    handleCourseSelect,
    handleModuleSelect,
    handleEditLesson,
    handleDeleteLesson,
    handleSubmit,
    resetForm,
  };
}
