
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const loginSchema = z.object({
  email: z.string().email({ message: "Email inválido" }),
  password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      toast.success("Login realizado com sucesso!");
      navigate("/dashboard");
    } catch (error) {
      toast.error("Falha ao fazer login. Verifique suas credenciais.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-8 px-2 sm:px-4">
      <Card className="w-full max-w-md shadow-lg dark:bg-gray-800">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <img src="/placeholder.svg" alt="Logo" className="h-12 w-12 rounded-full bg-blue-600 p-2 dark:bg-gray-700" />
          </div>
          <CardTitle className="text-2xl text-center font-bold text-blue-700 dark:text-gray-100">Entrar na plataforma</CardTitle>
          <CardDescription className="text-center text-gray-600 dark:text-gray-300">
            Entre com suas credenciais abaixo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="dark:text-gray-200">Email</FormLabel>
                    <FormControl>
                      <Input placeholder="seu@email.com" {...field} className="dark:bg-gray-700 dark:text-gray-100" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="dark:text-gray-200">Senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="******" {...field} className="dark:bg-gray-700 dark:text-gray-100" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full bg-blue-600 text-white dark:bg-blue-700 dark:text-gray-100 hover:bg-blue-700 dark:hover:bg-blue-800" disabled={isLoading}>
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-300">
            Não tem uma conta?{" "}
            <Link to="/register" className="text-blue-600 dark:text-blue-400 hover:underline">
              Registrar
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;
