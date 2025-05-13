import { Module, Lesson } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { requestQueue } from '@/utils/requestQueue';
import { cacheManager } from '@/utils/cacheManager';

export const moduleService = {
  async getAllModules(): Promise<Module[]> {
    try {
      // Primeiro, buscar todos os módulos
      const { data, error } = await supabase
        .from('modules')
        .select('id, title, description, order_number, course_id')
        .order('title', { ascending: true });

      if (error) throw error;
      if (!data) throw new Error('Nenhum módulo encontrado');

      // Para cada módulo, buscar suas aulas
      const modulesWithLessons = await Promise.all(data.map(async (module) => {
        try {
          // Buscar aulas para este módulo
          const { data: lessons, error: lessonsError } = await supabase
            .from('lessons')
            .select('id, module_id, title, description, duration, video_url, content, order_number')
            .eq('module_id', module.id)
            .order('order_number', { ascending: true });

          if (lessonsError) {
            console.error(`Erro ao buscar aulas para o módulo ${module.id}:`, lessonsError);
            return {
              id: module.id,
              title: module.title,
              description: module.description || '',
              order: module.order_number,
              courseId: module.course_id,
              lessons: []
            };
          }

          return {
            id: module.id,
            title: module.title,
            description: module.description || '',
            order: module.order_number,
            courseId: module.course_id,
            lessons: (lessons || []).map(lesson => ({
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
          };
        } catch (error) {
          console.error(`Erro ao processar módulo ${module.id}:`, error);
          return {
            id: module.id,
            title: module.title,
            description: module.description || '',
            order: module.order_number,
            courseId: module.course_id,
            lessons: []
          };
        }
      }));

      return modulesWithLessons;
    } catch (error) {
      console.error('Erro ao buscar módulos:', error);
      throw new Error('Falha ao buscar módulos');
    }
  },

  async getModulesByCourseId(courseId: string): Promise<Module[]> {
    if (!courseId) throw new Error('ID do curso é obrigatório');

    // Chave de cache para este curso
    const cacheKey = `modules_${courseId}`;
    
    // Tentar obter do cache primeiro, com expiração de 10 minutos
    try {
      // Buscar diretamente do Supabase sem usar o cacheManager ou requestQueue
      // para evitar problemas de throttling e cache que estão causando erros HTTP 400
      console.log(`Buscando módulos do curso ${courseId} do servidor...`);
      
      const { data: modules, error: modulesError } = await supabase
        .from('modules')
        .select('id, title, description, order_number, course_id')
        .eq('course_id', courseId)
        .order('order_number', { ascending: true });
      
      if (modulesError) {
        console.error(`Erro ao buscar módulos do curso ${courseId}:`, modulesError);
        return []; // Retornar array vazio em caso de erro em vez de lançar erro
      }
      
      if (!modules || modules.length === 0) {
        console.log('Nenhum módulo encontrado para o curso:', courseId);
        return []; // Retornar array vazio em vez de lançar erro
      }

          // Processar módulos sequencialmente para evitar muitas requisições simultâneas
          const modulesWithLessons: Module[] = [];
          
          for (const module of modules) {
            try {
              // Buscar aulas diretamente do Supabase sem usar requestQueue
              // para evitar problemas de throttling que estão causando erros HTTP 400
              const { data: lessons, error: lessonsError } = await supabase
                .from('lessons')
                .select('id, module_id, title, description, duration, video_url, content, order_number')
                .eq('module_id', module.id)
                .order('order_number', { ascending: true });
              
              if (lessonsError) {
                console.error(`Erro ao buscar aulas para o módulo ${module.id}:`, lessonsError);
                // Continuar com lista vazia de aulas em vez de lançar erro
                modulesWithLessons.push({
                  id: module.id,
                  title: module.title,
                  description: module.description || '',
                  order: module.order_number,
                  courseId: module.course_id,
                  lessons: []
                });
                continue;
              }

              modulesWithLessons.push({
                id: module.id,
                title: module.title,
                description: module.description || '',
                order: module.order_number,
                courseId: module.course_id,
                lessons: (lessons || []).map(lesson => ({
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
              });
            } catch (error) {
              console.error(`Erro ao processar módulo ${module.id}:`, error);
              // Continuar com próximo módulo em vez de falhar completamente
              modulesWithLessons.push({
                id: module.id,
                title: module.title,
                description: module.description || '',
                order: module.order_number,
                courseId: module.course_id,
                lessons: []
              });
            }
          }

          return modulesWithLessons.sort((a, b) => a.order - b.order);
    } catch (error) {
      console.error('Erro ao buscar módulos do curso:', error);
      // Retornar array vazio em vez de lançar erro para evitar quebrar a UI
      return [];
    }
  },

  async createModule(courseId: string, moduleData: { 
    title: string; 
    description?: string; 
    order: number 
  }): Promise<Module> {
    if (!courseId) throw new Error('ID do curso é obrigatório');
    if (!moduleData?.title?.trim()) throw new Error('Título do módulo é obrigatório');

    try {
      const { data, error } = await supabase
        .from('modules')
        .insert({
          course_id: courseId,
          title: moduleData.title.trim(),
          description: moduleData.description?.trim() || '',
          order_number: moduleData.order
        })
        .select('id, title, description, order_number, course_id')
        .single();

      if (error) throw error;
      if (!data) throw new Error('Nenhum dado retornado após criar o módulo');

      // Limpar o cache para este curso
      cacheManager.remove(`modules_${courseId}`);

      return {
        id: data.id,
        title: data.title,
        description: data.description || '',
        order: data.order_number,
        courseId: data.course_id,
        lessons: []
      };
    } catch (error) {
      console.error('Erro ao criar módulo:', error);
      throw new Error('Falha ao criar módulo');
    }
  },

  async updateModule(moduleId: string, moduleData: { 
    title?: string; 
    description?: string; 
    order?: number 
  }): Promise<void> {
    if (!moduleId) throw new Error('ID do módulo é obrigatório');

    const updates: Record<string, any> = {};
    
    if (moduleData.title !== undefined) {
      if (!moduleData.title.trim()) {
        throw new Error('Título do módulo não pode ficar vazio');
      }
      updates.title = moduleData.title.trim();
    }
    
    if (moduleData.description !== undefined) {
      updates.description = moduleData.description.trim();
    }
    
    if (moduleData.order !== undefined) {
      updates.order_number = moduleData.order;
    }

    try {
      // Primeiro, obter o módulo para saber o courseId
      const { data: moduleInfo, error: moduleError } = await supabase
        .from('modules')
        .select('course_id')
        .eq('id', moduleId)
        .single();

      if (moduleError) throw moduleError;
      if (!moduleInfo) throw new Error('Módulo não encontrado');

      const courseId = moduleInfo.course_id;

      // Atualizar o módulo
      const { error } = await supabase
        .from('modules')
        .update(updates)
        .eq('id', moduleId);

      if (error) throw error;

      // Limpar o cache para este curso
      cacheManager.remove(`modules_${courseId}`);
    } catch (error) {
      console.error('Erro ao atualizar módulo:', error);
      throw new Error('Falha ao atualizar módulo');
    }
  },

  async deleteModule(moduleId: string): Promise<void> {
    if (!moduleId) throw new Error('ID do módulo é obrigatório');

    try {
      // Primeiro, obter o módulo para saber o courseId
      const { data: moduleInfo, error: moduleError } = await supabase
        .from('modules')
        .select('course_id')
        .eq('id', moduleId)
        .single();

      if (moduleError) throw moduleError;
      if (!moduleInfo) throw new Error('Módulo não encontrado');

      const courseId = moduleInfo.course_id;

      // Excluir o módulo
      const { error } = await supabase
        .from('modules')
        .delete()
        .eq('id', moduleId);

      if (error) throw error;

      // Limpar o cache para este curso
      cacheManager.remove(`modules_${courseId}`);
    } catch (error) {
      console.error('Erro ao excluir módulo:', error);
      throw new Error('Falha ao excluir módulo');
    }
  }
};
