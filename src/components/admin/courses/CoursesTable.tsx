
import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Course } from "@/types";
import { MoreHorizontal, Edit, Trash, BookOpen } from "lucide-react";

interface CoursesTableProps {
  courses: Course[];
  isLoading: boolean;
  onEditCourse: (course: Course) => void;
  onDeleteCourse: (courseId: string) => void;
}

const CoursesTable: React.FC<CoursesTableProps> = ({
  courses,
  isLoading,
  onEditCourse,
  onDeleteCourse,
}) => {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <p>Carregando cursos...</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Título</TableHead>
            <TableHead>Instrutor</TableHead>
            <TableHead>Duração</TableHead>
            <TableHead className="text-right">Alunos</TableHead>
            <TableHead className="text-right">Módulos</TableHead>
            <TableHead className="w-[100px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {courses.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center">
                Nenhum curso encontrado
              </TableCell>
            </TableRow>
          ) : (
            courses.map((course) => (
              <TableRow key={course.id}>
                <TableCell className="font-medium">{course.title}</TableCell>
                <TableCell>{course.instructor}</TableCell>
                <TableCell>{course.duration}</TableCell>
                <TableCell className="text-right">
                  <Badge variant="outline">{course.enrolledCount}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant="outline">{course.modules.length}</Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEditCourse(course)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDeleteCourse(course.id)}>
                        <Trash className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => navigate(`/admin/modules?courseId=${course.id}`)}
                      >
                        <BookOpen className="h-4 w-4 mr-2" />
                        Gerenciar Módulos
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default CoursesTable;
