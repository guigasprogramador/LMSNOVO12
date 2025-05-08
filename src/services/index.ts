// Exportau00e7u00e3o centralizada de todos os serviu00e7os

// Serviu00e7os principais
export { courseService } from './courseService';
export { moduleService } from './moduleService';
export { lessonService } from './lessonService';
export { lessonProgressService } from './lessonProgressService';
export { certificateService } from './certificateService';
export { profileService } from './profileService';
export { userService } from './userService';

// Serviu00e7os de integrau00e7u00e3o
export { integrationService } from './integrationService';
export { databaseRelationsService } from './databaseRelationsService';

// Serviu00e7os de cursos
export * from './courses/courseQueries';
export * from './courses/courseAdminService';
export * from './courses/enrollmentService';

// Cliente Supabase
export { supabase } from '@/integrations/supabase/client';
