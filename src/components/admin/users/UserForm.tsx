
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User } from "@/types";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface UserFormData {
  name: string;
  email: string;
  role: "admin" | "student";
  password?: string;
}

interface UserFormProps {
  initialData: UserFormData;
  isEditing: boolean;
  onSubmit: (formData: UserFormData) => Promise<void>;
}

const UserForm = ({ initialData, isEditing, onSubmit }: UserFormProps) => {
  const [formData, setFormData] = useState<UserFormData>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (value: "admin" | "student") => {
    setFormData((prev) => ({ ...prev, role: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>
          {isEditing ? "Editar Usuário" : "Criar Novo Usuário"}
        </DialogTitle>
        <DialogDescription>
          {isEditing
            ? "Atualize as informações do usuário abaixo."
            : "Preencha as informações do novo usuário abaixo."}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Nome completo"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="email@exemplo.com"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Função</Label>
          <Select
            value={formData.role}
            onValueChange={(value) => handleRoleChange(value as "admin" | "student")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma função" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Administrador</SelectItem>
              <SelectItem value="student">Aluno</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {!isEditing && (
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={formData.password || ""}
              onChange={handleInputChange}
              placeholder="******"
              required
            />
          </div>
        )}
        <DialogFooter>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting 
              ? "Processando..." 
              : isEditing 
                ? "Atualizar" 
                : "Criar"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
};

export default UserForm;
