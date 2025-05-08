import { Lesson } from '@/types';
import { supabase } from '@/integrations/supabase/client';

export const lessonService = {
  async getLessonsByModuleId(moduleId: string): Promise<Lesson[]> {
    if (!moduleId) throw new Error('ID do módulo é obrigatório');

    try {
      const { data, error } = await supabase
        .from('lessons')
        .select('id, module_id, title, description, duration, video_url, content, order_number')
        .eq('module_id', moduleId)
        .order('order_number', { ascending: true });

      if (error) throw error;
      if (!data) throw new Error('Nenhuma aula encontrada para este módulo');

      return data.map(lesson => ({
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
    } catch (error) {
      console.error('Erro ao buscar aulas:', error);
      throw new Error('Falha ao buscar aulas');
    }
  },

  async createLesson(moduleId: string, lessonData: {
    title: string;
    description?: string;
    duration?: string;
    videoUrl?: string;
    content?: string;
    order: number;
  }): Promise<Lesson> {
    if (!moduleId) throw new Error('ID do módulo é obrigatório');
    if (!lessonData?.title?.trim()) throw new Error('Título da aula é obrigatório');

    try {
      const { data, error } = await supabase
        .from('lessons')
        .insert({
          module_id: moduleId,
          title: lessonData.title.trim(),
          description: lessonData.description?.trim() || '',
          duration: lessonData.duration?.trim() || '',
          video_url: lessonData.videoUrl?.trim() || '',
          content: lessonData.content?.trim() || '',
          order_number: lessonData.order
        })
        .select('id, module_id, title, description, duration, video_url, content, order_number')
        .single();

      if (error) throw error;
      if (!data) throw new Error('Nenhum dado retornado após criar a aula');

      return {
        id: data.id,
        moduleId: data.module_id,
        title: data.title,
        description: data.description || '',
        duration: data.duration || '',
        videoUrl: data.video_url || '',
        content: data.content || '',
        order: data.order_number,
        isCompleted: false
      };
    } catch (error) {
      console.error('Erro ao criar aula:', error);
      throw new Error('Falha ao criar aula');
    }
  },

  async updateLesson(lessonId: string, lessonData: {
    title?: string;
    description?: string;
    duration?: string;
    videoUrl?: string;
    content?: string;
    order?: number;
  }): Promise<void> {
    if (!lessonId) throw new Error('ID da aula é obrigatório');

    const updates: Record<string, any> = {};
    
    if (lessonData.title !== undefined) {
      if (!lessonData.title.trim()) {
        throw new Error('Título da aula não pode ficar vazio');
      }
      updates.title = lessonData.title.trim();
    }
    
    if (lessonData.description !== undefined) {
      updates.description = lessonData.description.trim();
    }
    
    if (lessonData.duration !== undefined) {
      updates.duration = lessonData.duration.trim();
    }
    
    if (lessonData.videoUrl !== undefined) {
      updates.video_url = lessonData.videoUrl.trim();
    }
    
    if (lessonData.content !== undefined) {
      updates.content = lessonData.content.trim();
    }
    
    if (lessonData.order !== undefined) {
      updates.order_number = lessonData.order;
    }

    try {
      const { error } = await supabase
        .from('lessons')
        .update(updates)
        .eq('id', lessonId);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao atualizar aula:', error);
      throw new Error('Falha ao atualizar aula');
    }
  },

  async deleteLesson(lessonId: string): Promise<void> {
    if (!lessonId) throw new Error('ID da aula é obrigatório');

    try {
      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', lessonId);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao excluir aula:', error);
      throw new Error('Falha ao excluir aula');
    }
  }
};
