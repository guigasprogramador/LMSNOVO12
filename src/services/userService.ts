import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types';
import { toast } from 'sonner';

interface UserFormData {
  name: string;
  email: string;
  role: 'admin' | 'student';
}

// Helper function to get the current user
async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

export const userService = {
  // Get users accessible to the current user
  async getUsers(): Promise<User[]> {
    try {
      // Get current user to check if admin
      const currentUser = await getCurrentUser();
      
      // Get profiles from the database
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*');

      if (error) {
        console.error('Erro ao buscar perfis:', error);
        throw error;
      }

      // Convert profiles to User type
      return profiles.map(profile => ({
        id: profile.id,
        name: profile.name || profile.username || '',
        email: profile.email || '', // Email may not be accessible
        // Use metadata from profile if available, otherwise assume student
        role: profile.role || 'student',
        avatarUrl: profile.avatar_url || '',
        bio: profile.bio || '',
        jobTitle: profile.job_title || '',
        company: profile.company || '',
        location: profile.location || '',
        website: profile.website || '',
        createdAt: profile.created_at
      }));
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      throw error;
    }
  },

  // Create a new user using sign-up
  async createUser(userData: UserFormData): Promise<User> {
    try {
      // Check if current user is admin
      const currentUser = await getCurrentUser();
      if (!currentUser || currentUser.app_metadata?.role !== 'admin') {
        throw new Error('Apenas administradores podem criar novos usuários');
      }

      // In a real app, you would use an admin API to create users
      // For now, we'll use a regular sign-up - note that this requires server-side admin functions
      // which aren't available in the browser
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: 'Temp' + Math.random().toString(36).substring(2, 10),
        options: {
          data: { 
            name: userData.name,
            role: userData.role 
          }
        }
      });

      if (error) {
        // Fallback to a less privileged approach if admin API fails
        toast.error('Não foi possível criar o usuário como administrador. Entre em contato com o suporte.');
        throw error;
      }

      // Return a mock User object since we can't get the actual user yet
      return {
        id: 'pending-invitation',
        name: userData.name,
        email: userData.email,
        role: userData.role,
        avatarUrl: '',
        createdAt: new Date().toISOString()
      };
    } catch (error: any) {
      console.error('Erro ao criar usuário:', error);
      throw new Error(`Falha ao criar usuário: ${error.message}`);
    }
  },

  // Update user profile (client-friendly)
  async updateUser(userId: string, userData: UserFormData): Promise<User> {
    try {
      // Check if current user is admin
      const currentUser = await getCurrentUser();
      if (!currentUser || currentUser.id !== userId && currentUser.app_metadata?.role !== 'admin') {
        throw new Error('Você não tem permissão para editar este usuário');
      }

      // Update profile (we can only update the profile, not auth data)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .update({
          name: userData.name,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (profileError) throw profileError;

      // Return updated user
      return {
        id: userId,
        name: userData.name,
        email: userData.email, // Keep the email from form data
        role: userData.role,   // Keep the role from form data
        avatarUrl: profileData.avatar_url || '',
        createdAt: profileData.created_at
      };
    } catch (error: any) {
      console.error('Erro ao atualizar usuário:', error);
      throw new Error(`Falha ao atualizar usuário: ${error.message}`);
    }
  },

  // Delete user (client-friendly version)
  async deleteUser(userId: string): Promise<void> {
    try {
      // Check if current user is admin
      const currentUser = await getCurrentUser();
      if (!currentUser || currentUser.app_metadata?.role !== 'admin') {
        throw new Error('Apenas administradores podem excluir usuários');
      }

      // In a real app with admin permissions, you would delete the auth user
      // For now, we'll just delete the profile
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      
      toast.success('Usuário excluído com sucesso');
    } catch (error: any) {
      console.error('Erro ao excluir usuário:', error);
      throw new Error(`Falha ao excluir usuário: ${error.message}`);
    }
  },

  // Update user role (client-friendly version)
  async updateUserRoleByEmail(email: string, role: 'admin' | 'student'): Promise<void> {
    try {
      // Check if current user is admin
      const currentUser = await getCurrentUser();
      if (!currentUser || currentUser.app_metadata?.role !== 'admin') {
        throw new Error('Apenas administradores podem atribuir funções de administrador');
      }

      // Get the user profile by email
      const { data: profiles, error: findError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email);

      if (findError) throw findError;
      if (!profiles || profiles.length === 0) {
        throw new Error(`Usuário com email ${email} não encontrado`);
      }

      // Update the role in the profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role })
        .eq('email', email);

      if (updateError) throw updateError;
      
      toast.success(`Papel de ${role} atribuído com sucesso ao usuário ${email}`);
    } catch (error: any) {
      console.error('Erro ao atualizar papel do usuário:', error);
      throw new Error(`Falha ao atualizar papel do usuário: ${error.message}`);
    }
  },

  // Original method kept for backwards compatibility
  async getAllUsers(): Promise<User[]> {
    return this.getUsers();
  }
};
