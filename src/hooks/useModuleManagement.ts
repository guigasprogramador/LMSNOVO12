import { useState, useEffect } from 'react';
import { Module } from '@/types';
import { moduleService } from '@/services/api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

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
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<ModuleFormData>(defaultFormData);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (courseId) {
      fetchModules();
    }
  }, [courseId]);

  const fetchModules = async () => {
    try {
      setIsLoading(true);
      const modulesData = await moduleService.getModules(courseId);
      setModules(modulesData);
    } catch (error) {
      console.error('Error fetching modules:', error);
      toast.error('Erro ao carregar os módulos');
    } finally {
      setIsLoading(false);
    }
  };

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

    setIsSubmitting(true);

    try {
      if (editingModuleId) {
        await moduleService.updateModule(editingModuleId, formData);
        toast.success('Módulo atualizado com sucesso');
      } else {
        await moduleService.createModule(courseId, formData);
        toast.success('Módulo criado com sucesso');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchModules();
    } catch (error: any) {
      toast.error(`Erro ao salvar módulo: ${error.message}`);
    } finally {
      setIsSubmitting(false);
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

  const handleDeleteModule = async (moduleId: string) => {
    if (!isAdmin()) {
      toast.error('Você não tem permissão para excluir módulos');
      return;
    }

    if (!confirm('Tem certeza que deseja excluir este módulo?')) {
      return;
    }

    try {
      await moduleService.deleteModule(moduleId);
      toast.success('Módulo excluído com sucesso');
      fetchModules();
    } catch (error: any) {
      toast.error(`Erro ao excluir módulo: ${error.message}`);
    }
  };

  const resetForm = () => {
    setFormData(defaultFormData);
    setEditingModuleId(null);
  };

  return {
    modules,
    isLoading,
    isDialogOpen,
    setIsDialogOpen,
    formData,
    editingModuleId,
    isSubmitting,
    handleInputChange,
    handleEditModule,
    handleDeleteModule,
    handleSubmit,
    resetForm,
  };
}