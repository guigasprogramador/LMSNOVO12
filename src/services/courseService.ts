import { Course, Module, Lesson } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { requestQueue } from '@/utils/requestQueue';

export const courseService = {
  async getCourses(): Promise<Course[]> {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, description, thumbnail, duration, instructor, enrolledcount, rating, created_at, updated_at')
        .order('title', { ascending: true });

      if (error) throw error;
      if (!data) return [];

      return data.map(course => ({
        id: course.id,
        title: course.title,
        description: course.description || '',
        thumbnail: course.thumbnail || '/placeholder.svg',
        duration: course.duration || '',
        instructor: course.instructor,
        enrolledCount: course.enrolledcount || 0,
        rating: course.rating || 0,
        modules: [],
        createdAt: course.created_at,
        updatedAt: course.updated_at,
        isEnrolled: false,
        progress: 0
      }));
    } catch (error) {
      console.error('Erro ao buscar cursos:', error);
      throw new Error('Falha ao buscar cursos');
    }
  },

  async createCourse(courseData: {
    title: string;
    description?: string;
    thumbnail?: string;
    duration?: string;
    instructor: string;
  }): Promise<Course> {
    if (!courseData?.title?.trim()) throw new Error('Título do curso é obrigatório');
    if (!courseData?.instructor?.trim()) throw new Error('Nome do instrutor é obrigatório');

    try {
      const { data, error } = await supabase
        .from('courses')
        .insert({
          title: courseData.title.trim(),
          description: courseData.description?.trim() || '',
          thumbnail: courseData.thumbnail?.trim() || '',
          duration: courseData.duration?.trim() || '',
          instructor: courseData.instructor.trim(),
          enrolledcount: 0,
          rating: 0
        })
        .select('id, title, description, thumbnail, duration, instructor, enrolledcount, rating, created_at, updated_at')
        .single();

      if (error) throw error;
      if (!data) throw new Error('Nenhum dado retornado após criar o curso');

      return {
        id: data.id,
        title: data.title,
        description: data.description || '',
        thumbnail: data.thumbnail || '',
        duration: data.duration || '',
        instructor: data.instructor,
        enrolledCount: data.enrolledcount || 0,
        rating: data.rating || 0,
        modules: [],
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        isEnrolled: false,
        progress: 0
      };
    } catch (error) {
      console.error('Erro ao criar curso:', error);
      throw new Error('Falha ao criar curso');
    }
  },

  async updateCourse(courseId: string, courseData: {
    title?: string;
    description?: string;
    thumbnail?: string;
    duration?: string;
    instructor?: string;
  }): Promise<void> {
    if (!courseId) throw new Error('ID do curso é obrigatório');

    const updates: Record<string, any> = {};

    if (courseData.title !== undefined) {
      if (!courseData.title.trim()) {
        throw new Error('Título do curso não pode ficar vazio');
      }
      updates.title = courseData.title.trim();
    }

    if (courseData.description !== undefined) {
      updates.description = courseData.description.trim();
    }

    if (courseData.thumbnail !== undefined) {
      updates.thumbnail = courseData.thumbnail.trim();
    }

    if (courseData.duration !== undefined) {
      updates.duration = courseData.duration.trim();
    }

    if (courseData.instructor !== undefined) {
      if (!courseData.instructor.trim()) {
        throw new Error('Nome do instrutor não pode ficar vazio');
      }
      updates.instructor = courseData.instructor.trim();
    }

    try {
      const { error } = await supabase
        .from('courses')
        .update(updates)
        .eq('id', courseId);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao atualizar curso:', error);
      throw new Error('Falha ao atualizar curso');
    }
  },

  async deleteCourse(courseId: string): Promise<void> {
    if (!courseId) throw new Error('ID do curso é obrigatório');

    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao excluir curso:', error);
      throw new Error('Falha ao excluir curso');
    }
  },

  async getCourseById(courseId: string): Promise<Course | null> {
    if (!courseId) throw new Error('ID do curso é obrigatório');

    try {
      // Usar a fila de requisições para evitar problemas de rate limit

      // Primeiro, buscar o curso
      const courseDataPromise = requestQueue.enqueue(() => 
        supabase
          .from('courses')
          .select('*')
          .eq('id', courseId)
          .single()
      );
      
      const { data: courseData, error: courseError } = await courseDataPromise;
      
      if (courseError) throw courseError;
      if (!courseData) throw new Error('Curso não encontrado');
      
      // Depois, buscar os módulos relacionados ao curso
      const modulesDataPromise = requestQueue.enqueue(() => 
        supabase
          .from('modules')
          .select('*')
          .eq('course_id', courseId)
          .order('order_number', { ascending: true })
      );
      
      const { data: modulesData, error: modulesError } = await modulesDataPromise;
      
      if (modulesError) throw modulesError;
      
      // Para cada módulo, buscar suas aulas de forma controlada
      const modulesWithLessonsPromises = (modulesData || []).map(async (module) => {
        // Usar a fila para cada requisição de aulas
        const lessonsDataPromise = requestQueue.enqueue(() => 
          supabase
            .from('lessons')
            .select('*')
            .eq('module_id', module.id)
            .order('order_number', { ascending: true })
        );
        
        const { data: lessonsData, error: lessonsError } = await lessonsDataPromise;
        
        if (lessonsError) throw lessonsError;
        
        return {
          ...module,
          lessons: lessonsData || []
        };
      });
      
      // Aguardar todas as requisições de aulas serem concluídas
      const modulesWithLessons = await Promise.all(modulesWithLessonsPromises);

      // Mapear os módulos e aulas para o formato esperado pela aplicação
      const formattedModules = modulesWithLessons.map((module: any) => ({
        id: module.id,
        courseId: module.course_id,
        title: module.title,
        description: module.description || '',
        order: module.order_number,
        lessons: (module.lessons || []).map((lesson: any) => ({
          id: lesson.id,
          moduleId: lesson.module_id,
          title: lesson.title,
          description: lesson.description || '',
          duration: lesson.duration || '',
          videoUrl: lesson.video_url || '',
          content: lesson.content || '',
          order: lesson.order_number,
          isCompleted: false
        }))
      }));
      
      // Retornar o curso com seus mu00f3dulos e aulas
      return {
        id: courseData.id,
        title: courseData.title,
        description: courseData.description || '',
        thumbnail: courseData.thumbnail || '/placeholder.svg',
        duration: courseData.duration || '',
        instructor: courseData.instructor,
        enrolledCount: courseData.enrolledcount || 0,
        rating: courseData.rating || 0,
        modules: formattedModules,
        createdAt: courseData.created_at,
        updatedAt: courseData.updated_at,
        isEnrolled: false,
        progress: 0
      };
    } catch (error) {
      console.error('Erro ao buscar curso:', error);
      
      // Tratamento de erros mais detalhado
      if (error instanceof Error) {
        // Se for um erro de relacionamento entre tabelas, fornecer uma mensagem mais clara
        if (error.message.includes('relationship between') && error.message.includes('courses') && error.message.includes('modules')) {
          throw new Error('Erro no banco de dados: Relacionamento entre cursos e mu00f3dulos nu00e3o encontrado. Verifique a estrutura do banco de dados.');
        }
        
        // Se for um erro de rede, fornecer uma mensagem mais clara
        if (error.message.includes('network') || error.message.includes('Network')) {
          throw new Error('Erro de conexu00e3o: Verifique sua conexu00e3o com a internet e tente novamente.');
        }
        
        // Passar a mensagem original se for um erro conhecido
        throw new Error(`Erro ao buscar curso: ${error.message}`);
      }
      
      // Erro genu00e9rico
      throw new Error('Falha ao buscar curso. Tente novamente mais tarde.');
    }
  }
};
