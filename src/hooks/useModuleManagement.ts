import { useState, useEffect } from 'react';
import { Module } from '@/types';
import { moduleService } from '@/services/api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppData } from '@/contexts/AppDataContext';

export interface ModuleFormData {
  title: string;
  description: string;
  order: number;
}

const defaultFormData: ModuleFormData = {
  title: '',
  description: '',
  order: 0,
};

export function useModuleManagement(courseId: string) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<ModuleFormData>(defaultFormData);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  // Usar o contexto de dados da aplicação
  const { 
    getModulesByCourseId,
    isLoadingModules: isLoading,
    refreshModules,
    addModule,
    updateModuleInState,
    removeModule
  } = useAppData();
  
  // Obter módulos do curso atual
  const modules = getModulesByCourseId(courseId);

  // Mutação para criar módulo
  const createModuleMutation = useMutation({
    mutationFn: (moduleData: ModuleFormData) => moduleService.createModule(courseId, moduleData),
    onSuccess: (newModule) => {
      toast.success('Módulo criado com sucesso');
      // Adicionar o novo módulo ao estado local imediatamente
      addModule(newModule);
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar módulo: ${error.message}`);
    }
  });

  // Mutação para atualizar módulo
  const updateModuleMutation = useMutation({
    mutationFn: ({ moduleId, moduleData }: { moduleId: string, moduleData: any }) => 
      moduleService.updateModule(moduleId, moduleData),
    onSuccess: (_, variables) => {
      toast.success('Módulo atualizado com sucesso');
      // Atualizar o estado local imediatamente
      updateModuleInState(variables.moduleId, variables.moduleData);
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar módulo: ${error.message}`);
    }
  });

  // Mutação para excluir módulo
  const deleteModuleMutation = useMutation({
    mutationFn: moduleService.deleteModule,
    onSuccess: (_, moduleId) => {
      toast.success('Módulo excluído com sucesso');
      // Remover o módulo do estado local imediatamente
      removeModule(moduleId);
    },
    onError: (error: any) => {
      toast.error(`Erro ao excluir módulo: ${error.message}`);
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'order' ? parseInt(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAdmin()) {
      toast.error('Você não tem permissão para gerenciar módulos');
      return;
    }

    if (!formData.title) {
      toast.error('Título é obrigatório');
      return;
    }

    if (editingModuleId) {
      updateModuleMutation.mutate({ moduleId: editingModuleId, moduleData: formData });
    } else {
      createModuleMutation.mutate(formData);
    }
  };

  const handleEditModule = (module: Module) => {
    setFormData({
      title: module.title,
      description: module.description,
      order: module.order,
    });
    setEditingModuleId(module.id);
    setIsDialogOpen(true);
  };

  const handleDeleteModule = (moduleId: string) => {
    if (!isAdmin()) {
      toast.error('Você não tem permissão para excluir módulos');
      return;
    }

    if (!confirm('Tem certeza que deseja excluir este módulo?')) {
      return;
    }

    deleteModuleMutation.mutate(moduleId);
  };

  const resetForm = () => {
    setFormData(defaultFormData);
    setEditingModuleId(null);
  };

  return {
    modules,
    isLoading: isLoading || createModuleMutation.isPending || updateModuleMutation.isPending || deleteModuleMutation.isPending,
    isDialogOpen,
    setIsDialogOpen,
    formData,
    editingModuleId,
    isSubmitting: createModuleMutation.isPending || updateModuleMutation.isPending,
    handleInputChange,
    handleEditModule,
    handleDeleteModule,
    handleSubmit,
    resetForm,
  };
}