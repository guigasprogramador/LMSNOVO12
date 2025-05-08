
import { Certificate } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { requestThrottler } from '@/utils/requestThrottler';

/**
 * Interface para os dados de certificado no banco de dados
 */
interface CertificateDB {
  id: string;
  user_id: string;
  course_id: string;
  course_name: string;
  user_name: string;
  issue_date: string;
  expiry_date?: string;
  certificate_url?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Interface para os dados de criação de certificado
 */
export interface CreateCertificateData {
  userId: string;
  courseId: string;
  userName: string;
  courseName: string;
  issueDate?: string;
  expiryDate?: string;
  certificateUrl?: string;
}

/**
 * Converte um registro do banco de dados para o tipo Certificate
 */
const mapToCertificate = (cert: CertificateDB): Certificate => ({
  id: cert.id,
  userId: cert.user_id,
  courseId: cert.course_id,
  courseName: cert.course_name,
  userName: cert.user_name,
  issueDate: cert.issue_date,
  expiryDate: cert.expiry_date,
  certificateUrl: cert.certificate_url
});

/**
 * Busca todos os certificados, opcionalmente filtrados por usuário
 * @param userId ID do usuário (opcional)
 * @param courseId ID do curso (opcional)
 * @returns Lista de certificados
 */
const getCertificates = async (userId?: string, courseId?: string): Promise<Certificate[]> => {
  try {
    let query = supabase.from('certificates').select('*');
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    if (courseId) {
      query = query.eq('course_id', courseId);
    }
    
    const { data, error } = await query.order('issue_date', { ascending: false });

    if (error) throw error;
    if (!data) return [];

    return data.map(mapToCertificate);
  } catch (error) {
    console.error('Error fetching certificates:', error);
    toast.error('Erro ao buscar certificados');
    return [];
  }
};

/**
 * Cria um novo certificado
 * @param certificateData Dados do certificado a ser criado
 * @returns O certificado criado
 */
const createCertificate = async (certificateData: CreateCertificateData): Promise<Certificate> => {
  try {
    if (!certificateData.userId || !certificateData.courseId || !certificateData.userName || !certificateData.courseName) {
      throw new Error('Dados incompletos para criar certificado');
    }
    
    // Verificar se já existe um certificado para este usuário e curso
    console.log(`Verificando certificados existentes para usuário ${certificateData.userId} e curso ${certificateData.courseId}`);
    const existingCerts = await getCertificates(certificateData.userId, certificateData.courseId);
    
    if (existingCerts.length > 0) {
      // Em vez de lançar um erro, retornamos o certificado existente
      console.log('Certificado já existente, retornando-o em vez de criar um novo');
      return existingCerts[0];
    }
    
    console.log('Nenhum certificado existente encontrado, continuando com a criação...');

    try {
      // Atualizar a tabela recent_certificates também para manter o histórico recente
      console.log('Atualizando tabela recent_certificates...');
      await supabase
        .from('recent_certificates')
        .upsert({
          user_id: certificateData.userId,
          course_id: certificateData.courseId,
          course_name: certificateData.courseName,
          user_name: certificateData.userName,
          issue_date: certificateData.issueDate || new Date().toISOString()
        })
        .select();
      
      console.log('Inserindo certificado na tabela principal...');
      const { data, error } = await supabase
        .from('certificates')
        .insert({
          user_id: certificateData.userId,
          course_id: certificateData.courseId,
          course_name: certificateData.courseName,
          user_name: certificateData.userName,
          issue_date: certificateData.issueDate || new Date().toISOString(),
          expiry_date: certificateData.expiryDate,
          certificate_url: certificateData.certificateUrl || `/certificates/${certificateData.userId}-${certificateData.courseId}-${Date.now()}`
        })
        .select()
        .single();

      if (error) {
        // Verificar se o erro é devido a uma violação de chave única
        if (error.code === '23505') { // Código para violação de restrição única no PostgreSQL
          // Se já existir um certificado (que pode ter sido criado concorrentemente),
          // buscamos e retornamos este certificado existente
          console.log('Detectada violação de unicidade, verificando certificados existentes...');
          const existingCerts = await getCertificates(certificateData.userId, certificateData.courseId);
          if (existingCerts.length > 0) {
            console.log('Retornando certificado existente após violação de unicidade');
            return existingCerts[0];
          }
        }
        
        // Verificar se o erro é de rate limit
        if (error.message?.includes('429') || error.message?.includes('rate limit')) {
          console.warn('Erro de rate limit ao criar certificado, aguardando e tentando novamente...');
          throw new Error('Rate limit atingido ao criar certificado. Por favor, tente novamente em alguns instantes.');
        }
        
        console.error('Erro ao inserir certificado:', error);
        throw error;
      }
      
      if (!data) throw new Error('Falha ao criar certificado');

      console.log('Certificado criado com sucesso!');
      return mapToCertificate(data);
    } catch (dbError: any) {
      // Verificar se o erro é de rate limit para operações de banco de dados
      if (dbError.message?.includes('429') || dbError.message?.includes('rate limit')) {
        console.warn('Erro de rate limit nas operações de banco de dados, aguardando...');
        throw new Error('Rate limit atingido nas operações. Por favor, tente novamente em alguns instantes.');
      }
      
      throw dbError;
    }
  } catch (error) {
    console.error('Erro ao criar certificado:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao criar certificado';
    toast.error(errorMessage);
    throw error;
  }
};

/**
 * Gera um certificado para conclusão de curso
 * @param courseId ID do curso
 * @param userId ID do usuário
 * @returns O certificado gerado
 */


/**
 * Gera um certificado para conclusão de curso
 * @param courseId ID do curso
 * @param userId ID do usuário
 * @returns O certificado gerado
 */
/**
 * Gera um certificado para conclusão de curso otimizado com cache e throttling
 * @param courseId ID do curso
 * @param userId ID do usuário
 * @returns O certificado gerado
 */
const generateCertificate = async (courseId: string, userId: string): Promise<Certificate> => {
  if (!courseId || !userId) {
    throw new Error('ID do curso e ID do usuário são obrigatórios');
  }

  // Chave para cache do certificado
  const certCacheKey = `certificate-${userId}-${courseId}`;
  const cachedCert = requestThrottler.getCachedItem(certCacheKey);
  if (cachedCert) {
    return cachedCert;
  }
  
  try {
    // 1. Verificar se já existe um certificado (buscar diretamente para evitar throttling extra)
    const { data: existingCert } = await supabase
      .from('certificates')
      .select('*')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .maybeSingle();
    
    if (existingCert) {
      const certificate = mapToCertificate(existingCert);
      // Armazenar em cache para futuras requisições
      requestThrottler.cacheItem(certCacheKey, certificate);
      return certificate;
    }
    
    // 2. Verificar elegibilidade usando cache quando possível
    const eligibilityCacheKey = `eligibility-${userId}-${courseId}`;
    let isEligible = requestThrottler.getCachedItem(eligibilityCacheKey);
    
    if (isEligible === undefined) {
      isEligible = await isEligibleForCertificate(userId, courseId);
      requestThrottler.cacheItem(eligibilityCacheKey, isEligible);
    }
    
    if (!isEligible) {
      throw new Error('Usuário não é elegível para receber certificado. O curso deve estar 100% concluído.');
    }
    
    // 3. Buscar dados do curso e do usuário simultaneamente usando cache
    const courseCacheKey = `course-${courseId}`;
    const userCacheKey = `user-${userId}`;
    
    let courseData = requestThrottler.getCachedItem(courseCacheKey);
    let userData = requestThrottler.getCachedItem(userCacheKey);
    
    const fetchPromises = [];
    
    if (!courseData) {
      fetchPromises.push(
        supabase
          .from('courses')
          .select('id,title')
          .eq('id', courseId)
          .single()
          .then(result => {
            if (!result.error && result.data) {
              courseData = result.data;
              requestThrottler.cacheItem(courseCacheKey, courseData);
            }
            return result;
          })
      );
    }
    
    if (!userData) {
      fetchPromises.push(
        supabase
          .from('profiles')
          .select('id,name,full_name,username')
          .eq('id', userId)
          .single()
          .then(result => {
            if (!result.error && result.data) {
              userData = result.data;
              requestThrottler.cacheItem(userCacheKey, userData);
            }
            return result;
          })
      );
    }
    
    // Executar buscas apenas se necessário
    if (fetchPromises.length > 0) {
      await Promise.all(fetchPromises);
    }
    
    if (!courseData || !userData) {
      throw new Error('Dados do curso ou usuário não encontrados');
    }
    
    // 4. Criar dados do certificado
    const certificateData = {
      userId: userId,
      courseId: courseId,
      userName: userData.full_name || userData.name || userData.username || 'Aluno',
      courseName: courseData.title,
      issueDate: new Date().toISOString()
    };
    
    // 5. Criar o certificado com captura de erros
    try {
      const newCertificate = await createCertificate(certificateData);
      requestThrottler.cacheItem(certCacheKey, newCertificate);
      return newCertificate;
    } catch (error: any) {
      // Se for erro de duplicação (corrida paralela de criação), buscar o existente
      if (error.message?.includes('duplicate') || error.message?.includes('23505')) {
        const { data: existingCert } = await supabase
          .from('certificates')
          .select('*')
          .eq('user_id', userId)
          .eq('course_id', courseId)
          .maybeSingle();
          
        if (existingCert) {
          const certificate = mapToCertificate(existingCert);
          requestThrottler.cacheItem(certCacheKey, certificate);
          return certificate;
        }
      }
      
      // Propagar erro de rate limit para o throttler tratar
      throw error;
    }
  } catch (error: any) {
    // Propagar erros para o throttler se for rate limit
    if (error.message?.includes('429') || error.message?.includes('rate limit')) {
      throw error;
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Erro ao gerar certificado';
    toast.error(errorMessage);
    throw error;
  }
};

/**
 * Busca um certificado pelo ID
 * @param certificateId ID do certificado
 * @returns O certificado encontrado
 */
const getCertificateById = async (certificateId: string): Promise<Certificate> => {
  try {
    if (!certificateId) {
      throw new Error('ID do certificado é obrigatório');
    }

    const { data, error } = await supabase
      .from('certificates')
      .select('*')
      .eq('id', certificateId)
      .single();

    if (error) {
      console.error('Erro ao buscar certificado por ID:', error);
      throw new Error('Falha ao buscar certificado');
    }
    
    if (!data) {
      throw new Error('Certificado não encontrado');
    }

    return mapToCertificate(data);
  } catch (error) {
    console.error('Erro ao buscar certificado:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar certificado';
    toast.error(errorMessage);
    throw error;
  }
};

/**
 * Atualiza um certificado existente
 * @param certificateId ID do certificado a ser atualizado
 * @param certificateData Dados atualizados do certificado
 * @returns O certificado atualizado
 */
const updateCertificate = async (certificateId: string, certificateData: Partial<CreateCertificateData>): Promise<Certificate> => {
  try {
    if (!certificateId) {
      throw new Error('ID do certificado u00e9 obrigatu00f3rio');
    }

    // Verificar se o certificado existe
    await getCertificateById(certificateId);
    
    // Preparar dados para atualizau00e7u00e3o
    const updateData: Record<string, any> = {};
    
    if (certificateData.userName) updateData.user_name = certificateData.userName;
    if (certificateData.courseName) updateData.course_name = certificateData.courseName;
    if (certificateData.issueDate) updateData.issue_date = certificateData.issueDate;
    if (certificateData.expiryDate) updateData.expiry_date = certificateData.expiryDate;
    if (certificateData.certificateUrl) updateData.certificate_url = certificateData.certificateUrl;
    
    // Nu00e3o permitir alterar o usu00e1rio ou curso associado ao certificado
    // Isso evita inconsistenciu00e3cias nos dados
    
    const { data, error } = await supabase
      .from('certificates')
      .update(updateData)
      .eq('id', certificateId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Falha ao atualizar certificado');

    return mapToCertificate(data);
  } catch (error) {
    console.error('Error updating certificate:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar certificado';
    toast.error(errorMessage);
    throw error;
  }
};

/**
 * Exclui um certificado
 * @param certificateId ID do certificado a ser excluído
 * @returns Booleano indicando sucesso da operau00e7u00e3o
 */
const deleteCertificate = async (certificateId: string): Promise<boolean> => {
  try {
    if (!certificateId) {
      throw new Error('ID do certificado u00e9 obrigatu00f3rio');
    }

    // Verificar se o certificado existe
    await getCertificateById(certificateId);
    
    const { error } = await supabase
      .from('certificates')
      .delete()
      .eq('id', certificateId);

    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error deleting certificate:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao excluir certificado';
    toast.error(errorMessage);
    throw error;
  }
};

/**
 * Verifica se um aluno completou um curso e é elegível para receber um certificado
 * @param userId ID do usuário
 * @param courseId ID do curso
 * @returns Booleano indicando se o aluno é elegível para receber certificado
 */
const isEligibleForCertificate = async (userId: string, courseId: string): Promise<boolean> => {
  try {
    if (!userId || !courseId) {
      return false;
    }
    
    // Verificar primeiro se já existe um certificado para evitar erros de duplicidade
    const existingCerts = await getCertificates(userId, courseId);
    if (existingCerts.length > 0) {
      // Já tem certificado, então é elegível (já que já recebeu um)
      return true;
    }
    
    // Verificar o progresso no curso
    const { data, error } = await supabase
      .from('enrollments')
      .select('progress, completed_at')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .single();
    
    if (error) {
      console.error('Erro ao verificar matrícula:', error);
      return false;
    }
    
    if (!data) {
      console.error('Matrícula não encontrada');
      return false;
    }
    
        // Considerar elegível se o progresso for 100% (curso completamente concluído)
    // Isso garante consistência com o processo de geração automática
    return data.progress === 100 && data.completed_at !== null;
  } catch (error) {
    console.error('Erro ao verificar elegibilidade para certificado:', error);
    return false;
  }
};

/**
 * Serviço de certificados
 */
export const certificateService = {
  getCertificates,
  getCertificateById,
  createCertificate,
  generateCertificate,
  updateCertificate,
  deleteCertificate,
  isEligibleForCertificate
};
