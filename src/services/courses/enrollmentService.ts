import { Course } from '@/types';
import { supabase } from '@/integrations/supabase/client';

/**
 * Get enrolled courses for user
 */
export const getEnrolledCourses = async (userId: string): Promise<Course[]> => {
  try {
    // Buscar todas as matrículas do usuário
    const { data: enrollmentsData, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select('*')
      .eq('user_id', userId);

    if (enrollmentsError) throw enrollmentsError;
    if (!enrollmentsData || enrollmentsData.length === 0) return [];

    // Obter os IDs dos cursos em que o usuário está matriculado
    const courseIds = enrollmentsData.map(enrollment => enrollment.course_id);
    
    // Criar um mapa de progresso por curso
    const progressMap = new Map();
    enrollmentsData.forEach(enrollment => {
      progressMap.set(enrollment.course_id, enrollment.progress || 0);
    });

    // Buscar os cursos
    const { data: coursesData, error: coursesError } = await supabase
      .from('courses')
      .select('*')
      .in('id', courseIds);

    if (coursesError) throw coursesError;
    if (!coursesData || coursesData.length === 0) return [];

    // Mapear os cursos para o formato desejado
    const courses = await Promise.all(coursesData.map(async (course) => {
      // Buscar módulos para este curso
      const { data: modulesData, error: modulesError } = await supabase
        .from('modules')
        .select('*')
        .eq('course_id', course.id)
        .order('order_number', { ascending: true });

      if (modulesError) throw modulesError;
      
      // Mapear módulos e buscar aulas para cada módulo
      const modules = await Promise.all((modulesData || []).map(async (module) => {
        const { data: lessonsData, error: lessonsError } = await supabase
          .from('lessons')
          .select('*')
          .eq('module_id', module.id)
          .order('order_number', { ascending: true });

        if (lessonsError) throw lessonsError;

        // Buscar progresso das aulas para este usuário
        const { data: progressData, error: progressError } = await supabase
          .from('lesson_progress')
          .select('*')
          .eq('user_id', userId)
          .in('lesson_id', lessonsData?.map(l => l.id) || []);

        if (progressError) throw progressError;
        
        // Criar mapa de progresso das aulas
        const lessonProgressMap = new Map();
        (progressData || []).forEach(progress => {
          lessonProgressMap.set(progress.lesson_id, progress.completed);
        });

        // Mapear aulas para o formato desejado
        const lessons = (lessonsData || []).map(lesson => ({
          id: lesson.id,
          moduleId: lesson.module_id,
          title: lesson.title,
          description: lesson.description || '',
          duration: lesson.duration || '',
          videoUrl: lesson.video_url || '',
          content: lesson.content || '',
          order: lesson.order_number,
          isCompleted: lessonProgressMap.get(lesson.id) || false
        }));

        // Retornar módulo com suas aulas
        return {
          id: module.id,
          courseId: module.course_id,
          title: module.title,
          description: module.description || '',
          order: module.order_number,
          lessons: lessons
        };
      }));

      // Retornar curso com seus módulos e aulas
      return {
        id: course.id,
        title: course.title,
        description: course.description || '',
        thumbnail: course.thumbnail || '/placeholder.svg',
        duration: course.duration || '',
        instructor: course.instructor,
        enrolledCount: course.enrolledcount || 0,
        rating: course.rating || 0,
        modules: modules,
        createdAt: course.created_at,
        updatedAt: course.updated_at,
        isEnrolled: true,
        progress: progressMap.get(course.id) || 0
      };
    }));

    return courses;
  } catch (error) {
    console.error('Error fetching enrolled courses:', error);
    throw error;
  }
};

/**
 * Enroll in a course (optimized)
 */
export const enrollCourse = async (courseId: string, userId: string): Promise<{ success: boolean; message: string; enrollment?: any }> => {
  try {
    // Verifica se já existe matrícula
    const { data: existing, error: checkError } = await supabase
      .from('enrollments')
      .select('*')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .maybeSingle();
    if (checkError) throw checkError;
    if (existing) {
      return { success: false, message: 'Você já está matriculado neste curso.' };
    }

    // Cria matrícula
    const { data, error } = await supabase
      .from('enrollments')
      .insert({
        user_id: userId,
        course_id: courseId,
        progress: 0,
        enrolled_at: new Date().toISOString()
      })
      .select()
      .single();
    if (error) throw error;

    // Atualiza enrolledCount do curso (opcional, se existir função RPC)
    // await supabase.rpc('increment_enrolled_count', { course_id_input: courseId });

    return { success: true, message: 'Matrícula realizada com sucesso!', enrollment: data };
  } catch (error) {
    console.error('Error enrolling in course:', error);
    return { success: false, message: 'Erro ao realizar matrícula.' };
  }
};

/**
 * Update course progress
 */
export const updateCourseProgress = async (courseId: string, userId: string, progress: number): Promise<void> => {
  try {
    const { error } = await supabase
      .from('enrollments')
      .update({ progress })
      .eq('user_id', userId)
      .eq('course_id', courseId);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating course progress:', error);
    throw error;
  }
};
