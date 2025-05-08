import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { moduleService, lessonService, lessonProgressService } from "@/services";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Lesson, Module } from "@/types";
import VideoPlayer from "@/components/VideoPlayer";

const CoursePlayer = () => {
  const { id } = useParams<{ id: string }>();
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchModulesAndLessons = async () => {
      setLoading(true);
      setError(null);
      
      if (!id) {
        setError('ID do curso não fornecido');
        setLoading(false);
        return;
      }
      
      console.log('Carregando curso com ID:', id);
      
      try {
        // Obter os módulos do curso - as aulas já estão incluídas nesta resposta
        const mods = await moduleService.getModulesByCourseId(id);
        console.log('Módulos carregados:', mods);
        
        // Definir os módulos
        setModules(mods);
        
        // Selecionar o primeiro módulo e aula, se disponíveis
        if (mods.length > 0) {
          const firstModule = mods[0];
          setSelectedModule(firstModule);
          
          if (firstModule.lessons && firstModule.lessons.length > 0) {
            console.log('Primeira aula:', firstModule.lessons[0]);
            setSelectedLesson(firstModule.lessons[0]);
          } else {
            console.warn('O módulo não tem aulas');
            setSelectedLesson(null);
          }
        } else {
          console.warn('O curso não tem módulos');
        }
        
        // Carregar o progresso do curso
        fetchProgress();
      } catch (error) {
        console.error('Erro ao carregar módulos e aulas:', error);
        setError(error instanceof Error ? error.message : 'Erro ao carregar o conteúdo do curso');
        toast.error('Erro ao carregar o conteúdo do curso');
      } finally {
        setLoading(false);
      }
    };
    
    fetchModulesAndLessons();
    
    // eslint-disable-next-line
  }, [id]);

  const fetchProgress = async () => {
    try {
      // Obter o ID do usuário atual
      const userId = localStorage.getItem('userId');
      
      if (!userId || !id) {
        setProgress(0);
        return;
      }
      
      // Usar try/catch interno para evitar que erros interrompam o fluxo
      try {
        const prog = await lessonProgressService.calculateCourseProgress(userId, id);
        setProgress(prog || 0);
      } catch {
        // Silenciosamente falhar e definir progresso como 0
        setProgress(0);
      }
    } catch (error) {
      // Capturar qualquer outro erro e definir progresso como 0
      setProgress(0);
    }
  };

  const handleSelectLesson = (mod, lesson) => {
    setSelectedModule(mod);
    setSelectedLesson(lesson);
  };

  const handleMarkAsCompleted = async () => {
    try {
      if (!selectedLesson) return;
      
      // Obter o ID do usuário atual (você pode precisar ajustar isso com base na sua lógica de autenticação)
      const userId = localStorage.getItem('userId') || 'current-user';
      
      await lessonProgressService.markLessonAsCompleted(userId, selectedLesson.id);
      toast.success("Aula marcada como concluída!");
      fetchProgress();
    } catch (error) {
      console.error('Erro ao marcar aula como concluída:', error);
      toast.error("Erro ao marcar aula como concluída");
    }
  };

  const handleNextLesson = () => {
    if (!selectedModule || !selectedLesson) return;
    const currentLessonIdx = selectedModule.lessons.findIndex(l => l.id === selectedLesson.id);
    if (currentLessonIdx < selectedModule.lessons.length - 1) {
      setSelectedLesson(selectedModule.lessons[currentLessonIdx + 1]);
    } else {
      const currentModuleIdx = modules.findIndex(m => m.id === selectedModule.id);
      if (currentModuleIdx < modules.length - 1 && modules[currentModuleIdx + 1].lessons.length > 0) {
        setSelectedModule(modules[currentModuleIdx + 1]);
        setSelectedLesson(modules[currentModuleIdx + 1].lessons[0]);
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold mb-2">Player de Aulas</h1>
      
      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Erro! </strong>
          <span className="block sm:inline">{error}</span>
          <button
            className="bg-red-100 hover:bg-red-200 text-red-700 font-bold py-1 px-2 rounded mt-2"
            onClick={() => window.location.reload()}
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <Progress value={progress} className="mb-4" />
      )}
      <div className="flex gap-6">
        <div className="w-1/3 space-y-4">
          {modules.length === 0 ? (
            <Card className="p-4">
              <div className="text-center py-6">
                <div className="rounded-full bg-gray-100 p-3 mx-auto w-fit mb-3">
                  <svg className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium">Nenhum mu00f3dulo encontrado</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Este curso ainda nu00e3o possui mu00f3dulos ou aulas disponu00edveis.
                </p>
              </div>
            </Card>
          ) : (
            modules.map((mod) => (
              <Card key={mod.id} className="p-2">
                <h2 className="font-semibold mb-2">{mod.title}</h2>
                {mod.lessons && mod.lessons.length > 0 ? (
                  <ul>
                    {mod.lessons.map((lesson) => (
                      <li key={lesson.id}>
                        <Button
                          variant={selectedLesson?.id === lesson.id ? "default" : "ghost"}
                          className="w-full justify-start mb-1"
                          onClick={() => handleSelectLesson(mod, lesson)}
                        >
                          {lesson.title}
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground italic p-2">
                    Este mu00f3dulo ainda nu00e3o possui aulas.
                  </p>
                )}
              </Card>
            ))
          )}
        </div>
        <div className="flex-1">
          {loading ? (
            <Card className="p-6 flex justify-center items-center min-h-[300px]">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p>Carregando aula...</p>
              </div>
            </Card>
          ) : !selectedLesson ? (
            <Card className="p-6 flex flex-col items-center justify-center min-h-[300px] text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 text-gray-400 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                />
              </svg>
              <h3 className="text-lg font-medium mb-2">Nenhuma aula selecionada</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Selecione uma aula no menu ao lado para começar a assistir o conteúdo do curso.
              </p>
            </Card>
          ) : (
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-2">{selectedLesson.title}</h2>
              <p className="mb-2 text-muted-foreground">{selectedLesson.description}</p>
              {selectedLesson.videoUrl && (
                <div className="mb-4">
                  <VideoPlayer
                    url={selectedLesson.videoUrl}
                    title={selectedLesson.title}
                    height={360}
                  />
                </div>
              )}
              {selectedLesson.content && (
                <div className="mb-4">
                  <div dangerouslySetInnerHTML={{ __html: selectedLesson.content }} />
                </div>
              )}
              <Button onClick={handleMarkAsCompleted} className="mr-2">Marcar como concluída</Button>
              <Button variant="outline" onClick={handleNextLesson}>Próxima aula</Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoursePlayer;
