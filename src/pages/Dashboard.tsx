import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Course, Certificate } from "@/types";
import { courseService, certificateService } from "@/services/api";
import { BookOpen, Award, GraduationCap, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Dashboard = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const handleNavigateToCourses = () => {
    // Redirecionar para a seção "Meus Cursos" no dashboard
    if (window.location.pathname === "/dashboard") {
      // Se já estiver na página dashboard, apenas role para a seção
      const myCoursesSection = document.getElementById("my-courses");
      if (myCoursesSection) {
        myCoursesSection.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      // Se estiver em outra página, navegue para dashboard com o hash
      navigate("/dashboard#my-courses");
    }
  };
  
  const handleNavigateToCompletedCourses = () => {
    navigate("/courses", { state: { filter: "completed" } });
  };
  
  const handleNavigateToCertificates = () => {
    navigate("/certificates");
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        if (user) {
          const [enrolledCoursesData, certificatesData] = await Promise.all([
            courseService.getEnrolledCourses(user.id),
            certificateService.getCertificates(user.id)
          ]);
          setEnrolledCourses(enrolledCoursesData);
          setCertificates(certificatesData);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        // Considerar adicionar um toast de erro para o usuário aqui
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 transition-colors duration-300">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Bem-vindo(a), {user?.name || 'Aluno'}!</p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow duration-200" 
          onClick={handleNavigateToCourses}
          data-component-name="_c8"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cursos em Andamento</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-component-name="Dashboard">{enrolledCourses.length}</div>
            <p className="text-xs text-muted-foreground" data-component-name="Dashboard">
              Cursos que você está matriculado
            </p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow duration-200" 
          onClick={handleNavigateToCompletedCourses}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cursos Concluídos</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{certificates.length}</div>
            <p className="text-xs text-muted-foreground">
              Cursos que você completou
            </p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow duration-200" 
          onClick={handleNavigateToCertificates}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Certificados</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{certificates.length}</div>
            <p className="text-xs text-muted-foreground">
              Certificados disponíveis
            </p>
          </CardContent>
        </Card>
      </div>

      {/* My Courses Section */}
      <div className="space-y-4" id="my-courses">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Meus Cursos</h2>
          <Link to="/courses">
            <Button variant="outline">Ver todos os cursos</Button>
          </Link>
        </div>
        
        {enrolledCourses.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <p className="mb-4 text-muted-foreground">Você ainda não está matriculado em nenhum curso.</p>
              <Link to="/courses">
                <Button>Explorar Cursos</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {enrolledCourses.map((course) => (
              <Link to={`/courses/${course.id}`} key={course.id}>
                <Card className="h-full course-card">
                  <div className="aspect-video relative">
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-full object-cover rounded-t-lg"
                    />
                    <Badge className="absolute top-2 right-2">
                      {course.progress}% Concluído
                    </Badge>
                  </div>
                  <CardHeader className="pb-2">
                    <CardTitle>{course.title}</CardTitle>
                    <CardDescription>
                      {course.instructor} • {course.duration}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="progress-bar">
                      <div className="progress-value" style={{ width: `${course.progress}%` }}></div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Certificates Section */}
      <div className="space-y-4" id="certificates">
        <h2 className="text-2xl font-bold tracking-tight">Meus Certificados</h2>
        
        {certificates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <p className="text-muted-foreground">Complete cursos para obter certificados.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {certificates.map((certificate) => (
              <Card key={certificate.id} className="course-card">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">{certificate.courseName}</CardTitle>
                    <Award className="h-5 w-5 text-yellow-500" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Data de emissão:</p>
                    <p>{new Date(certificate.issueDate).toLocaleDateString()}</p>
                  </div>
                  <Link to={`/certificates/${certificate.id}`}>
                    <Button variant="outline" className="w-full">Ver Certificado</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
