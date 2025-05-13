import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Course, Module, Lesson } from '@/types';
import { courseService, moduleService, lessonService } from '@/services/api';
import { supabase } from '@/integrations/supabase/client';

interface AppDataContextType {
  courses: Course[];
  isLoadingCourses: boolean;
  refreshCourses: () => Promise<void>;
  addCourse: (course: Course) => void;
  updateCourseInState: (courseId: string, updatedCourse: Partial<Course>) => void;
  removeCourse: (courseId: string) => void;
  
  getModulesByCourseId: (courseId: string) => Module[];
  isLoadingModules: boolean;
  refreshModules: (courseId: string) => Promise<void>;
  loadAllModules: () => Promise<void>;
  addModule: (module: Module) => void;
  updateModuleInState: (moduleId: string, updatedModule: Partial<Module>) => void;
  removeModule: (moduleId: string) => void;
  
  getLessonsByModuleId: (moduleId: string) => Lesson[];
  isLoadingLessons: boolean;
  refreshLessons: (moduleId: string) => Promise<void>;
  addLesson: (lesson: Lesson) => void;
  updateLessonInState: (lessonId: string, updatedLesson: Partial<Lesson>) => void;
  removeLesson: (lessonId: string) => void;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export const AppDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [isLoadingModules, setIsLoadingModules] = useState(false);
  const [isLoadingLessons, setIsLoadingLessons] = useState(false);

  // Função para buscar cursos
  const refreshCourses = useCallback(async () => {
    try {
      setIsLoadingCourses(true);
      const coursesData = await courseService.getCourses();
      // Ordenar cursos por data de criação (mais recentes primeiro)
      const sortedCourses = [...coursesData].sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setCourses(sortedCourses);
    } catch (error) {
      console.error('Erro ao buscar cursos:', error);
    } finally {
      setIsLoadingCourses(false);
    }
  }, []);

  // Função para buscar módulos por curso
  const refreshModules = useCallback(async (courseId: string) => {
    if (!courseId) return;
    
    try {
      setIsLoadingModules(true);
      console.log(`Buscando módulos para o curso ${courseId}...`);
      const modulesData = await moduleService.getModulesByCourseId(courseId);
      console.log(`Módulos encontrados para o curso ${courseId}:`, modulesData);
      
      setModules(prevModules => {
        // Manter módulos de outros cursos
        const otherModules = prevModules.filter(m => m.courseId !== courseId);
        // Ordenar módulos por ordem
        const sortedModules = [...modulesData].sort((a, b) => a.order - b.order);
        return [...otherModules, ...sortedModules];
      });
      
      // Forçar atualização dos cursos também para refletir a contagem de módulos
      refreshCourses();
    } catch (error) {
      console.error(`Erro ao buscar módulos do curso ${courseId}:`, error);
    } finally {
      setIsLoadingModules(false);
    }
  }, [refreshCourses]);

  // Função para buscar aulas por módulo
  const refreshLessons = useCallback(async (moduleId: string) => {
    if (!moduleId) return;
    
    try {
      setIsLoadingLessons(true);
      const lessonsData = await lessonService.getLessonsByModuleId(moduleId);
      setLessons(prevLessons => {
        // Manter aulas de outros módulos
        const otherLessons = prevLessons.filter(l => l.moduleId !== moduleId);
        return [...otherLessons, ...lessonsData];
      });
    } catch (error) {
      console.error(`Erro ao buscar aulas do módulo ${moduleId}:`, error);
    } finally {
      setIsLoadingLessons(false);
    }
  }, []);

  // Funções para manipular cursos no estado
  const addCourse = useCallback((course: Course) => {
    // Adicionar o novo curso no início da lista (mais recente primeiro)
    setCourses(prev => [course, ...prev]);
  }, []);

  const updateCourseInState = useCallback((courseId: string, updatedCourse: Partial<Course>) => {
    setCourses(prev => 
      prev.map(course => 
        course.id === courseId ? { ...course, ...updatedCourse } : course
      )
    );
  }, []);

  const removeCourse = useCallback((courseId: string) => {
    setCourses(prev => prev.filter(course => course.id !== courseId));
  }, []);

  // Funções para manipular módulos no estado
  const addModule = useCallback((module: Module) => {
    console.log('Adicionando novo módulo ao estado:', module);
    setModules(prev => {
      // Verificar se o módulo já existe para evitar duplicação
      const exists = prev.some(m => m.id === module.id);
      if (exists) {
        return prev.map(m => m.id === module.id ? module : m);
      } else {
        return [...prev, module];
      }
    });
  }, []);

  const updateModuleInState = useCallback((moduleId: string, updatedModule: Partial<Module>) => {
    setModules(prev => 
      prev.map(module => 
        module.id === moduleId ? { ...module, ...updatedModule } : module
      )
    );
  }, []);

  const removeModule = useCallback((moduleId: string) => {
    setModules(prev => prev.filter(module => module.id !== moduleId));
  }, []);

  // Funções para manipular aulas no estado
  const addLesson = useCallback((lesson: Lesson) => {
    setLessons(prev => [...prev, lesson]);
  }, []);

  const updateLessonInState = useCallback((lessonId: string, updatedLesson: Partial<Lesson>) => {
    setLessons(prev => 
      prev.map(lesson => 
        lesson.id === lessonId ? { ...lesson, ...updatedLesson } : lesson
      )
    );
  }, []);

  const removeLesson = useCallback((lessonId: string) => {
    setLessons(prev => prev.filter(lesson => lesson.id !== lessonId));
  }, []);

  // Funções para obter dados filtrados
  const getModulesByCourseId = useCallback((courseId: string) => {
    // Se courseId for vazio ou 'all', retornar todos os módulos
    if (!courseId || courseId === 'all') {
      return modules;
    }
    // Caso contrário, filtrar por courseId
    return modules.filter(module => module.courseId === courseId);
  }, [modules]);

  const getLessonsByModuleId = useCallback((moduleId: string) => {
    return lessons.filter(lesson => lesson.moduleId === moduleId);
  }, [lessons]);

  // Função para carregar todos os módulos
  const loadAllModules = useCallback(async () => {
    try {
      setIsLoadingModules(true);
      console.log('Carregando todos os módulos...');
      const allModules = await moduleService.getAllModules();
      console.log('Todos os módulos carregados:', allModules);
      setModules(allModules);
    } catch (error) {
      console.error('Erro ao carregar todos os módulos:', error);
    } finally {
      setIsLoadingModules(false);
    }
  }, []);

  // Inicializar dados e configurar inscrições em tempo real
  useEffect(() => {
    // Carregar cursos e todos os módulos ao inicializar
    refreshCourses();
    loadAllModules();

    // Configurar inscrições em tempo real do Supabase
    const coursesChannel = supabase
      .channel('public:courses')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'courses' 
      }, (payload) => {
        console.log('Mudança detectada em cursos:', payload);
        refreshCourses();
      })
      .subscribe();

    const modulesChannel = supabase
      .channel('public:modules')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'modules' 
      }, (payload: any) => {
        console.log('Mudança detectada em módulos:', payload);
        const courseId = payload.new?.course_id || payload.old?.course_id;
        if (courseId) {
          console.log(`Atualizando módulos para o curso ${courseId} após mudança detectada`);
          refreshModules(courseId);
          
          // Também atualizar os cursos para refletir a mudança na contagem de módulos
          refreshCourses();
        }
      })
      .subscribe();

    const lessonsChannel = supabase
      .channel('public:lessons')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'lessons' 
      }, (payload: any) => {
        console.log('Mudança detectada em aulas:', payload);
        const moduleId = payload.new?.module_id || payload.old?.module_id;
        if (moduleId) {
          refreshLessons(moduleId);
        }
      })
      .subscribe();

    // Limpar inscrições ao desmontar
    return () => {
      coursesChannel.unsubscribe();
      modulesChannel.unsubscribe();
      lessonsChannel.unsubscribe();
    };
  }, [refreshCourses, refreshModules, refreshLessons]);

  const value = {
    courses,
    isLoadingCourses,
    refreshCourses,
    addCourse,
    updateCourseInState,
    removeCourse,
    
    getModulesByCourseId,
    isLoadingModules,
    refreshModules,
    loadAllModules,
    addModule,
    updateModuleInState,
    removeModule,
    
    getLessonsByModuleId,
    isLoadingLessons,
    refreshLessons,
    addLesson,
    updateLessonInState,
    removeLesson
  };

  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  );
};

export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (context === undefined) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
};
