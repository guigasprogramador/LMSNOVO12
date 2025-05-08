
import React from "react";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import CourseForm from "@/components/admin/courses/CourseForm";
import CoursesTable from "@/components/admin/courses/CoursesTable";
import { useCourseManagement } from "@/hooks/useCourseManagement";

const AdminCourses = () => {
  const {
    courses,
    isLoading,
    isDialogOpen,
    setIsDialogOpen,
    formData,
    editingCourseId,
    isSubmitting,
    handleInputChange,
    handleEditCourse,
    handleDeleteCourse,
    handleSubmit,
    resetForm,
  } = useCourseManagement();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Gerenciar Cursos</h1>
        <Dialog 
          open={isDialogOpen} 
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={() => {
              resetForm();
              setIsDialogOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Curso
            </Button>
          </DialogTrigger>
          <CourseForm
            formData={formData}
            handleInputChange={handleInputChange}
            handleSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            editingCourseId={editingCourseId}
          />
        </Dialog>
      </div>

      <Card>
        <CoursesTable
          courses={courses}
          isLoading={isLoading}
          onEditCourse={handleEditCourse}
          onDeleteCourse={handleDeleteCourse}
        />
      </Card>
    </div>
  );
};

export default AdminCourses;
