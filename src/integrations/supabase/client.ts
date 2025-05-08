
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { requestThrottler } from '@/utils/requestThrottler';

// Enhanced cache for responses with longer TTL for better performance
const responseCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 15; // 15 minutes

// Track paths that had errors to avoid hammering them
const errorPaths = new Set<string>();
const ERROR_COOLDOWN = 1000 * 10; // 10 seconds

const supabaseUrl = 'https://pyhhvxugnyywoklhqjbz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5aGh2eHVnbnl5d29rbGhxamJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1NDgzODMsImV4cCI6MjA2MjEyNDM4M30.JkxVH0scEUm5TRGTNYr-x8EXOolMYAcKssetWlaYTvQ';

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'lms-auth-token',
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'X-Requested-With': 'XMLHttpRequest'
    },
    fetch: async (url: string, options: RequestInit) => {
      // Gerar uma chave de cache baseada na URL e no método
      const cacheKey = JSON.stringify({ url, method: options.method, body: options.body || '' });
      const urlPath = url.split('?')[0]; // URL sem query params para tracking de erros
      
      // Verificar se este path está em período de cooldown por erro
      if (errorPaths.has(urlPath)) {
        // Para caminhos com erro recente, usar cache se disponível ou criar resposta vazia
        const cachedResponse = responseCache.get(cacheKey);
        if (cachedResponse) {
          // console.log('Usando cache para path com erro recente:', urlPath);
          return new Response(JSON.stringify(cachedResponse.data), {
            headers: new Headers({ 'Content-Type': 'application/json' }),
            status: 200
          });
        }
        
        // Se não tiver cache e o path estiver em cooldown, retornar uma resposta vazia
        if (options.method === 'GET') {
          // console.log('Retornando dados vazios para path em cooldown:', urlPath);
          return new Response(JSON.stringify({data: []}), {
            headers: new Headers({ 'Content-Type': 'application/json' }),
            status: 200
          });
        }
      }
      
      // Verificar no cache para requisições GET (priorizar cache para melhor desempenho)
      if (options.method === 'GET') {
        const cachedResponse = responseCache.get(cacheKey);
        if (cachedResponse && Date.now() - cachedResponse.timestamp < CACHE_TTL) {
          // console.log('Usando resposta em cache para:', url);
          return new Response(JSON.stringify(cachedResponse.data), {
            headers: new Headers({ 'Content-Type': 'application/json' }),
            status: 200
          });
        }
      }
      
      // Usar o throttler para limitar requisições e lidar com rate limits
      return requestThrottler.enqueue(async () => {
        try {
          // Timeout mais curto para evitar travamentos
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 segundos de timeout (reduzido de 15s)
          
          const fetchOptions = {
            ...options,
            signal: controller.signal
          };
          
          try {
            // Remover log detalhado para diminuir a poluição do console
            // console.log(`Enviando requisição para ${url} [${options.method}]`);
            const response = await fetch(url, fetchOptions);
            clearTimeout(timeoutId);
            
            // Se for uma resposta de erro 429 (rate limit), lançar um erro específico
            if (response.status === 429) {
              // Marcar o path como tendo erro recente para evitar requisições desnecessárias
              errorPaths.add(urlPath);
              setTimeout(() => errorPaths.delete(urlPath), ERROR_COOLDOWN);
              
              const errorData = await response.json().catch(() => ({}));
              const retryAfter = response.headers.get('Retry-After') || '10';
              const errorMsg = `Rate limit excedido. Tente novamente em ${retryAfter}s. ${errorData.msg || ''}`;
              throw new Error(errorMsg);
            }
            
            // Se for uma resposta HTTP bem-sucedida de uma requisição GET, armazenar em cache
            if (response.ok && options.method === 'GET') {
              const clonedResponse = response.clone();
              const responseData = await clonedResponse.json().catch(() => null);
              if (responseData) {
                responseCache.set(cacheKey, {
                  data: responseData,
                  timestamp: Date.now()
                });
                // Armazenar o resultado com o throttler para compartilhar entre componentes
                requestThrottler.cacheItem(url, responseData);
              }
            }
            
            if (!response.ok) {
              const errorText = await response.text();
              
              // Marcar o path como tendo erro recente para evitar requisições desnecessárias
              errorPaths.add(urlPath);
              setTimeout(() => errorPaths.delete(urlPath), ERROR_COOLDOWN);
              
              // Verificar se o erro é relacionado a certificados ou unicidade
              if (errorText.includes('certificate') || 
                  errorText.includes('certificado') || 
                  errorText.includes('23505') || 
                  errorText.includes('duplicate')) {
                throw new Error(`Erro de certificado: ${errorText}`);
              }
              
              // Mensagem de erro genérica para reduzir complexidade
              throw new Error(`Erro HTTP: ${response.status}`);
            }
            
            return response;
          } catch (fetchError) {
            clearTimeout(timeoutId);
            
            // Marcar o path como tendo erro para evitar requisições desnecessárias
            errorPaths.add(urlPath);
            setTimeout(() => errorPaths.delete(urlPath), ERROR_COOLDOWN);
            
            if (fetchError.name === 'AbortError') {
              // Usar cache se disponível em caso de timeout
              const cachedResponse = responseCache.get(cacheKey);
              if (cachedResponse) {
                return new Response(JSON.stringify(cachedResponse.data), {
                  headers: new Headers({ 'Content-Type': 'application/json' }),
                  status: 200
                });
              }
              throw new Error('A conexão expirou.');
            }
            
            throw fetchError;
          }
        } catch (error: any) {
          // Usar o cache em caso de qualquer erro para métodos GET
          if (options.method === 'GET') {
            const cachedResponse = responseCache.get(cacheKey);
            if (cachedResponse) {
              return new Response(JSON.stringify(cachedResponse.data), {
                headers: new Headers({ 'Content-Type': 'application/json' }),
                status: 200
              });
            }
          }
          
          // Propagar erros de rate limit para que possam ser tratados pelo throttler
          if (error.message?.includes('429') || error.message?.includes('rate limit')) {
            throw error;
          }
          
          // Propagar outros erros com mensagens simplificadas
          throw error;
        }
      });
    }
  }
});
