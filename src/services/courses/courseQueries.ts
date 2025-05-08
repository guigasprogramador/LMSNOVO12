import { Course } from '@/types';
import { supabase } from '@/integrations/supabase/client';

/**
 * Get all courses
 */
export const getCourses = async (): Promise<Course[]> => {
  try {
    // Buscar todos os cursos
    const { data: coursesData, error: coursesError } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });

    if (coursesError) throw coursesError;
    if (!coursesData || coursesData.length === 0) return [];

    // Mapear os cursos para o formato desejado
    const courses = await Promise.all(coursesData.map(async (course) => {
      // Buscar mu00f3dulos para este curso
      const { data: modulesData, error: modulesError } = await supabase
        .from('modules')
        .select('*')
        .eq('course_id', course.id)
        .order('order_number', { ascending: true });

      if (modulesError) throw modulesError;
      
      // Mapear mu00f3dulos e buscar aulas para cada mu00f3dulo
      const modules = await Promise.all((modulesData || []).map(async (module) => {
        const { data: lessonsData, error: lessonsError } = await supabase
          .from('lessons')
          .select('*')
          .eq('module_id', module.id)
          .order('order_number', { ascending: true });

        if (lessonsError) throw lessonsError;

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
          isCompleted: false
        }));

        // Retornar mu00f3dulo com suas aulas
        return {
          id: module.id,
          courseId: module.course_id,
          title: module.title,
          description: module.description || '',
          order: module.order_number,
          lessons: lessons
        };
      }));

      // Retornar curso com seus mu00f3dulos e aulas
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
        isEnrolled: false,
        progress: 0
      };
    }));

    return courses;
  } catch (error) {
    console.error('Error fetching courses:', error);
    throw error;
  }
};

/**
 * Get course by ID
 */
export const getCourseById = async (courseId: string): Promise<Course> => {
  try {
    // Buscar o curso pelo ID
    const { data: courseData, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (courseError) throw courseError;
    if (!courseData) throw new Error('Curso nu00e3o encontrado');

    // Buscar mu00f3dulos para este curso
    const { data: modulesData, error: modulesError } = await supabase
      .from('modules')
      .select('*')
      .eq('course_id', courseId)
      .order('order_number', { ascending: true });

    if (modulesError) throw modulesError;
    
    // Mapear mu00f3dulos e buscar aulas para cada mu00f3dulo
    const modules = await Promise.all((modulesData || []).map(async (module) => {
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .eq('module_id', module.id)
        .order('order_number', { ascending: true });

      if (lessonsError) throw lessonsError;

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
        isCompleted: false
      }));

      // Retornar mu00f3dulo com suas aulas
      return {
        id: module.id,
        courseId: module.course_id,
        title: module.title,
        description: module.description || '',
        order: module.order_number,
        lessons: lessons
      };
    }));

    // Retornar curso com seus mu00f3dulos e aulas
    return {
      id: courseData.id,
      title: courseData.title,
      description: courseData.description || '',
      thumbnail: courseData.thumbnail || '/placeholder.svg',
      duration: courseData.duration || '',
      instructor: courseData.instructor,
      enrolledCount: courseData.enrolledcount || 0,
      rating: courseData.rating || 0,
      modules: modules,
      createdAt: courseData.created_at,
      updatedAt: courseData.updated_at,
      isEnrolled: false,
      progress: 0
    };
  } catch (error) {
    console.error('Error fetching course by ID:', error);
    throw error;
  }
};
