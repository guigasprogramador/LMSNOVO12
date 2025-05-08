import { useState, useEffect } from "react";
import { User } from "@/types";
import { userService } from "@/services/api";
import { toast } from "sonner";

export interface UserFormData {
  name: string;
  email: string;
  role: 'admin' | 'student';
}

const defaultFormData: UserFormData = {
  name: "",
  email: "",
  role: "student",
};

export function useUserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<UserFormData>(defaultFormData);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const usersData = await userService.getUsers();
      setUsers(usersData);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Erro ao carregar usuários");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser = (user: User) => {
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role as 'admin' | 'student',
    });
    setEditingUserId(user.id);
    setIsDialogOpen(true);
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm("Tem certeza de que deseja excluir este usuário?")) {
      try {
        await userService.deleteUser(userId);
        toast.success("Usuário excluído com sucesso");
        fetchUsers();
      } catch (error) {
        console.error("Error deleting user:", error);
        toast.error("Erro ao excluir o usuário");
      }
    }
  };

  const handleSubmit = async (data: UserFormData) => {
    try {
      if (editingUserId) {
        await userService.updateUser(editingUserId, data);
        toast.success("Usuário atualizado com sucesso");
      } else if (data.email) {
        if (data.role === 'admin') {
          await userService.updateUserRoleByEmail(data.email, 'admin');
          toast.success("Privilégios de administrador concedidos com sucesso");
        } else {
          await userService.createUser(data);
          toast.success("Usuário criado com sucesso");
        }
      }
      
      setIsDialogOpen(false);
      setFormData(defaultFormData);
      setEditingUserId(null);
      fetchUsers();
      return true;
    } catch (error: any) {
      console.error("Error saving user:", error);
      toast.error(`Erro ao salvar usuário: ${error.message}`);
      return false;
    }
  };

  const resetForm = () => {
    setFormData(defaultFormData);
    setEditingUserId(null);
  };

  const openNewUserDialog = () => {
    setFormData(defaultFormData);
    setEditingUserId(null);
    setIsDialogOpen(true);
  };

  return {
    users,
    isLoading,
    isDialogOpen,
    setIsDialogOpen,
    formData,
    editingUserId,
    handleEditUser,
    handleDeleteUser,
    handleSubmit,
    resetForm,
    openNewUserDialog,
  };
}
