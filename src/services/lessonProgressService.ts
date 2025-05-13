import { LessonProgress, Certificate } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { certificateService } from '@/services'; // Importar certificateService

export const lessonProgressService = {
  /**
   * Obter o progresso de todas as aulas para um usuário
   */
  async getLessonProgress(userId: string): Promise<LessonProgress[]> {
    try {
      const { data, error } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      if (!data) return [];

      return data.map(progress => ({
        id: progress.id,
        userId: progress.user_id,
        lessonId: progress.lesson_id,
        completed: progress.completed,
        completedAt: progress.completed_at
      }));
    } catch (error) {
      console.error('Erro ao buscar progresso das aulas:', error);
      throw new Error('Falha ao buscar progresso das aulas');
    }
  },

  /**
   * Obter o progresso de uma aula específica para um usuário
   */
  async getLessonProgressByLessonId(userId: string, lessonId: string): Promise<LessonProgress | null> {
    try {
      const { data, error } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('lesson_id', lessonId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        userId: data.user_id,
        lessonId: data.lesson_id,
        completed: data.completed,
        completedAt: data.completed_at
      };
    } catch (error) {
      console.error('Erro ao buscar progresso da aula:', error);
      throw new Error('Falha ao buscar progresso da aula');
    }
  },

  /**
   * Marcar uma aula como concluída e atualizar o progresso do curso
   */
  async markLessonAsCompleted(userId: string, lessonId: string): Promise<LessonProgress> {
    try {
      console.log(`PROGRESSO: Iniciando marcação da aula ${lessonId} como concluída para o usuário ${userId}`);
      
      // Obter informações da aula para saber a qual curso ela pertence
      const { data: lessonData, error: lessonError } = await supabase
        .from('lessons')
        .select('module_id')
        .eq('id', lessonId)
        .single();
      
      if (lessonError) {
        console.error('PROGRESSO: Erro ao buscar detalhes da aula:', lessonError);
        throw new Error('Falha ao obter detalhes da aula');
      }
      
      if (!lessonData || !lessonData.module_id) {
        console.error('PROGRESSO: Aula não encontrada ou módulo não associado');
        throw new Error('Aula não encontrada ou módulo não associado');
      }
      
      // Buscar o curso ao qual o módulo pertence
      const { data: moduleData, error: moduleError } = await supabase
        .from('modules')
        .select('course_id')
        .eq('id', lessonData.module_id)
        .single();
      
      if (moduleError) {
        console.error('PROGRESSO: Erro ao buscar detalhes do módulo:', moduleError);
        throw new Error('Falha ao obter detalhes do módulo');
      }
      
      if (!moduleData || !moduleData.course_id) {
        console.error('PROGRESSO: Módulo não encontrado ou curso não associado');
        throw new Error('Módulo não encontrado ou curso não associado');
      }
      
      const courseId = moduleData.course_id;
      console.log(`PROGRESSO: Aula pertence ao curso ${courseId}`);

      // Verificar se já existe um registro de progresso para esta aula
      const { data: existingProgress, error: checkError } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('lesson_id', lessonId)
        .maybeSingle();

      if (checkError) {
        console.error('PROGRESSO: Erro ao verificar progresso existente:', checkError);
        throw checkError;
      }

      const now = new Date().toISOString();
      let progressResult;

      if (existingProgress) {
        // Atualizar o registro existente
        console.log(`PROGRESSO: Atualizando registro existente de progresso para a aula ${lessonId}`);
        const { data, error } = await supabase
          .from('lesson_progress')
          .update({
            completed: true,
            completed_at: now
          })
          .eq('id', existingProgress.id)
          .select()
          .single();

        if (error) {
          console.error('PROGRESSO: Erro ao atualizar progresso existente:', error);
          throw error;
        }

        progressResult = {
          id: data.id,
          userId: data.user_id,
          lessonId: data.lesson_id,
          completed: data.completed,
          completedAt: data.completed_at
        };
      } else {
        // Criar um novo registro
        console.log(`PROGRESSO: Criando novo registro de progresso para a aula ${lessonId}`);
        const { data, error } = await supabase
          .from('lesson_progress')
          .insert({
            user_id: userId,
            lesson_id: lessonId,
            completed: true,
            completed_at: now
          })
          .select()
          .single();

        if (error) {
          console.error('PROGRESSO: Erro ao criar novo registro de progresso:', error);
          throw error;
        }
        
        progressResult = {
          id: data.id,
          userId: data.user_id,
          lessonId: data.lesson_id,
          completed: data.completed,
          completedAt: data.completed_at
        };
      }
      
      // Recalcular e atualizar o progresso do curso imediatamente
      try {
        console.log(`PROGRESSO: Recalculando progresso do curso ${courseId}`);
        
        // Calcular o progresso atual do curso (buscar total de aulas e aulas concluídas)
        // 1. Buscar todas as aulas do curso
        const { data: modules } = await supabase
          .from('modules')
          .select('id')
          .eq('course_id', courseId);
        
        if (!modules || modules.length === 0) {
          console.log(`PROGRESSO: Nenhum módulo encontrado para o curso ${courseId}`);
          return progressResult;
        }
        
        const moduleIds = modules.map(m => m.id);
        
        // 2. Buscar todas as aulas dos módulos
        const { data: lessons } = await supabase
          .from('lessons')
          .select('id')
          .in('module_id', moduleIds);
        
        if (!lessons || lessons.length === 0) {
          console.log(`PROGRESSO: Nenhuma aula encontrada para os módulos do curso ${courseId}`);
          return progressResult;
        }
        
        const totalLessons = lessons.length;
        const lessonIds = lessons.map(l => l.id);
        
        // 3. Buscar aulas concluídas
        const { data: completedLessons } = await supabase
          .from('lesson_progress')
          .select('lesson_id')
          .eq('user_id', userId)
          .eq('completed', true)
          .in('lesson_id', lessonIds);
        
        const completedCount = completedLessons?.length || 0;
        
        // 4. Calcular progresso
        const progress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
        console.log(`PROGRESSO: Progresso calculado para o curso ${courseId}: ${progress}% (${completedCount}/${totalLessons})`);
        
        // 5. Atualizar o progresso na tabela enrollments
        const { error: enrollmentError } = await supabase
          .from('enrollments')
          .update({ progress })
          .eq('user_id', userId)
          .eq('course_id', courseId);
        
        if (enrollmentError) {
          console.error('PROGRESSO: Erro ao atualizar progresso na tabela de matrículas:', enrollmentError);
        } else {
          console.log(`PROGRESSO: Progresso atualizado com sucesso na tabela de matrículas: ${progress}%`);
        }
        
        // Se o curso foi concluído (progresso = 100%), verificar se precisa registrar a data de conclusão
        if (progress === 100) {
          console.log(`PROGRESSO: Curso ${courseId} concluído! Verificando se precisa registrar data de conclusão.`);
          
          const { data: enrollment } = await supabase
            .from('enrollments')
            .select('completed_at')
            .eq('user_id', userId)
            .eq('course_id', courseId)
            .single();
          
          if (enrollment && !enrollment.completed_at) {
            console.log(`PROGRESSO: Registrando data de conclusão para o curso ${courseId}.`);
            
            await supabase
              .from('enrollments')
              .update({ completed_at: now })
              .eq('user_id', userId)
              .eq('course_id', courseId);
          }
        }
      } catch (progressError) {
        // Não interromper o fluxo se houver erro no cálculo do progresso,
        // apenas log para depuração
        console.error('PROGRESSO: Erro ao calcular progresso do curso:', progressError);
      }
      
      return progressResult;
    } catch (error) {
      console.error('PROGRESSO: Erro ao marcar aula como concluída:', error);
      throw new Error('Falha ao marcar aula como concluída');
    }
  },

  /**
   * Marcar uma aula como não concluída
   */
  async markLessonAsIncomplete(userId: string, lessonId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('lesson_progress')
        .update({
          completed: false,
          completed_at: null
        })
        .eq('user_id', userId)
        .eq('lesson_id', lessonId);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao marcar aula como não concluída:', error);
      throw new Error('Falha ao marcar aula como não concluída');
    }
  },

  /**
   * Calcular o progresso geral do curso com base nas aulas concluídas
   * e gerenciar a conclusão do curso e emissão de certificado se aplicável
   */
  async calculateCourseProgress(userId: string, courseId: string): Promise<number> {
    try {
      if (!userId || !courseId) {
        console.warn('ID do usuário ou curso não fornecido');
        return 0;
      }

      // Buscar todas as aulas do curso
      const { data: modules, error: modulesError } = await supabase
        .from('modules')
        .select('id, title')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });

      if (modulesError) {
        console.error('Erro ao buscar módulos:', modulesError);
        return 0; // Retornar 0 em vez de lançar erro
      }

      if (!modules || modules.length === 0) {
        return 0; // Curso sem módulos
      }

      const moduleIds = modules.map(m => m.id);

      // Buscar todas as aulas dos módulos
      const { data: lessons, error: lessonsError } = await supabase
        .from('lessons')
        .select('id, title, module_id')
        .in('module_id', moduleIds)
        .order('order_index', { ascending: true });

      if (lessonsError) {
        console.error('Erro ao buscar aulas:', lessonsError);
        return 0; // Retornar 0 em vez de lançar erro
      }

      if (!lessons || lessons.length === 0) {
        return 0; // Módulos sem aulas
      }

      const totalLessons = lessons.length;
      const lessonIds = lessons.map(l => l.id);

      // Buscar aulas concluídas pelo usuário
      const { data: completedLessons, error: progressError } = await supabase
        .from('lesson_progress')
        .select('lesson_id')
        .eq('user_id', userId)
        .eq('completed', true)
        .in('lesson_id', lessonIds);

      if (progressError) {
        console.error('Erro ao buscar progresso das aulas:', progressError);
        return 0; // Retornar 0 em vez de lançar erro
      }
      
      const completedCount = completedLessons?.length || 0;
      
      // Calcular porcentagem de progresso
      const progress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
      
      // Buscar matrícula atual para verificar se o curso já foi marcado como concluído
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('progress, completed_at')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .single();
        
      if (enrollmentError && enrollmentError.code !== 'PGRST116') { // Ignora erro quando não encontra resultado
        console.error('Erro ao buscar matrícula:', enrollmentError);
        throw new Error('Falha ao buscar dados da matrícula');
      }
      
      // Determinar se o curso foi recém concluído
      const wasPreviouslyCompleted = enrollment?.completed_at !== null;
      const isNowCompleted = progress === 100;
      
      // Atualizar o progresso e, se concluído, registrar data de conclusão
      const updateData: any = { progress };
      if (isNowCompleted && !wasPreviouslyCompleted) {
        updateData.completed_at = new Date().toISOString();
      }
      
      // Atualizar a tabela de matrículas
      await supabase
        .from('enrollments')
        .update(updateData)
        .eq('user_id', userId)
        .eq('course_id', courseId);

      // Gerar certificado se o curso foi concluído E é a primeira vez que isso acontece
      if (isNowCompleted) {
        try {
          // Verificar se já existe um certificado para evitar duplicidade
          const existingCertificates = await certificateService.getCertificates(userId, courseId);
          
          if (existingCertificates.length === 0) {
            const certificate = await certificateService.generateCertificate(courseId, userId);
            console.log(`Certificado gerado para o usuário ${userId} no curso ${courseId}: ${certificate.id}`);
            
            // Atualizar a tabela recent_certificates mesmo se o certificado já existir
            // (garantindo que apareça no histórico recente)
            const { data: courseData } = await supabase
              .from('courses')
              .select('title')
              .eq('id', courseId)
              .single();
              
            const { data: userData } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', userId)
              .single();
              
            if (courseData && userData) {
              await supabase
                .from('recent_certificates')
                .upsert({
                  user_id: userId,
                  course_id: courseId,
                  course_name: courseData.title,
                  user_name: userData.name,
                  issue_date: new Date().toISOString()
                });
            }
          } else {
            console.log(`Certificado já existente para o usuário ${userId} no curso ${courseId}`);
          }
        } catch (certError) {
          console.error('Erro ao gerar certificado automaticamente:', certError);
          // Não impedir o fluxo principal por erro na geração do certificado, mas registrar
        }
      }

      return progress;
    } catch (error) {
      console.error('Erro ao calcular progresso do curso:', error);
      return 0; // Retornar 0 em vez de lançar erro para evitar quebrar a UI
    }
  }
};
