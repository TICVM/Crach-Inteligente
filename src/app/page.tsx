"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { type Student } from "@/lib/types";
import { generatePdf } from "@/lib/pdf-generator";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import PageHeader from "@/components/page-header";
import AddStudentCard from "@/components/add-student-card";
import BulkImportCard from "@/components/bulk-import-card";
import CustomizeCard from "@/components/customize-card";
import StudentList from "@/components/student-list";
import StudentBadge from "@/components/student-badge";
import { Button } from "@/components/ui/button";
import { FileDown, Printer, Loader2 } from "lucide-react";
import { type BadgeStyleConfig, defaultBadgeStyle } from "@/lib/badge-styles";
import { useFirestore, useCollection, useDoc, useAuth, useMemoFirebase, useUser } from "@/firebase";
import { deleteDocumentNonBlocking, updateDocumentNonBlocking, setDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { collection, doc } from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";

export default function Home() {
  const [background, setBackground] = useState<string>("");
  const [badgeStyle, setBadgeStyle] = useState<BadgeStyleConfig>(defaultBadgeStyle);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);

  const firestore = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading: isAuthLoading } = useUser();
  
  const alunosCollection = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'alunos');
  }, [firestore, user]);

  const { data: studentsData, isLoading: studentsLoading } = useCollection<Student>(alunosCollection);
  const students = studentsData || [];

  const configDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'configuracaoCracha', 'global');
  }, [firestore, user]);
  
  const { data: configData, isLoading: isConfigLoading } = useDoc<any>(configDocRef);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (auth && !user && !isAuthLoading) {
      signInAnonymously(auth).catch((error) => {
        console.error("Falha na autenticação anônima", error);
        toast({
          variant: "destructive",
          title: "Falha na conexão",
          description: "Não foi possível conectar ao banco de dados.",
        });
      });
    }
  }, [auth, user, isAuthLoading, toast]);

  useEffect(() => {
    if (configData) {
      if (configData.badgeStyle) {
        const parsed = configData.badgeStyle;
        const mergedStyle = {
            ...defaultBadgeStyle,
            ...parsed,
            photo: { ...defaultBadgeStyle.photo, ...parsed.photo },
            name: { ...defaultBadgeStyle.name, ...parsed.name },
            turma: { ...defaultBadgeStyle.turma, ...parsed.turma },
            customFields: parsed.customFields?.map((field: any) => ({
              ...defaultBadgeStyle.name,
              id: '',
              label: '',
              ...field,
            })) || [],
        };
        setBadgeStyle(mergedStyle);
      }
      setBackground(configData.fundoCrachaUrl || PlaceHolderImages.find(img => img.id === 'default-background')?.imageUrl || '');
    } else if (configDocRef && !isConfigLoading && user) {
        const defaultConfig = {
            badgeStyle: defaultBadgeStyle,
            fundoCrachaUrl: PlaceHolderImages.find(img => img.id === 'default-background')?.imageUrl || ''
        };
        setDocumentNonBlocking(configDocRef, defaultConfig, {});
    }
  }, [configData, isConfigLoading, user, configDocRef]);
  
  useEffect(() => {
    if (isMounted && configDocRef && !isConfigLoading && user && configData) {
      const handler = setTimeout(() => {
        // Only update if there's an actual change to avoid loops
        if (JSON.stringify(configData.badgeStyle) !== JSON.stringify(badgeStyle) || configData.fundoCrachaUrl !== background) {
          updateDocumentNonBlocking(configDocRef, { badgeStyle, fundoCrachaUrl: background });
        }
      }, 1500);

      return () => clearTimeout(handler);
    }
  }, [badgeStyle, background, isMounted, configDocRef, isConfigLoading, user, configData]);

  const addStudent = (student: Omit<Student, "id">) => {
    if (!alunosCollection) return;
    addDocumentNonBlocking(alunosCollection, student);
    toast({ title: "Sucesso!", description: "Aluno adicionado com sucesso." });
  };

  const updateStudent = (updatedStudent: Student) => {
    if (!firestore || !updatedStudent.id) return;
    const studentDocRef = doc(firestore, 'alunos', updatedStudent.id);
    const { id, ...dataToUpdate } = updatedStudent;
    updateDocumentNonBlocking(studentDocRef, dataToUpdate);
    toast({ title: "Sucesso!", description: "Dados do aluno atualizados." });
  };

  const deleteStudent = (studentId: string) => {
    if (!firestore) return;
    const studentDocRef = doc(firestore, 'alunos', studentId);
    deleteDocumentNonBlocking(studentDocRef);
    toast({ title: "Aluno removido." });
  };

  const handleBulkImport = (newStudents: Omit<Student, "id">[]) => {
     if (!alunosCollection) return;
     newStudents.forEach(student => {
        addDocumentNonBlocking(alunosCollection, student);
     });
     toast({ title: "Sucesso!", description: `${newStudents.length} alunos importados.` });
  };

  const handlePrint = () => {
    if (students.length === 0) {
      toast({ variant: "destructive", title: "Atenção", description: "Adicione pelo menos um aluno para imprimir." });
      return;
    }
    setIsPrinting(true);
    document.body.classList.add("print-mode");
    setTimeout(() => {
      window.print();
      document.body.classList.remove("print-mode");
      setIsPrinting(false);
    }, 500);
  };
  
  const handleGeneratePdf = async () => {
    if (students.length === 0) {
      toast({ variant: "destructive", title: "Atenção", description: "Adicione pelo menos um aluno para gerar o PDF." });
      return;
    }
    setIsPdfLoading(true);
    try {
      await generatePdf(students, background, badgeStyle);
      toast({ title: "Sucesso!", description: "PDF gerado e baixado." });
    } catch (error) {
      console.error("Erro na geração do PDF:", error);
      toast({ variant: "destructive", title: "Erro", description: "Ocorreu um erro ao processar o arquivo PDF." });
    } finally {
      setIsPdfLoading(false);
    }
  };
  
  const isLoading = (studentsLoading || isAuthLoading || isConfigLoading) && !isMounted;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader />
      <main className="container mx-auto p-4 md:p-8">
        {isLoading ? (
            <div className="flex flex-col justify-center items-center h-64 gap-4">
                <Loader2 className="animate-spin h-12 w-12 text-primary" />
                <p className="text-muted-foreground animate-pulse">Carregando dados do sistema...</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 flex flex-col gap-8 no-print">
                <AddStudentCard onAddStudent={addStudent} badgeStyle={badgeStyle} />
                <BulkImportCard onImport={handleBulkImport} />
                <CustomizeCard
                  currentBackground={background}
                  onSetBackground={setBackground}
                  badgeStyle={badgeStyle}
                  onStyleChange={setBadgeStyle}
                />
              </div>

              <div className="lg:col-span-2 flex flex-col gap-8">
                <div className="bg-card p-6 rounded-lg shadow-sm no-print border">
                  <h2 className="text-xl font-bold mb-4 text-primary flex items-center gap-2">
                    Ações de Saída
                  </h2>
                  <div className="flex flex-col sm:flex-row gap-4">
                     <Button className="flex-1" onClick={handleGeneratePdf} disabled={isPdfLoading || students.length === 0}>
                      {isPdfLoading ? <Loader2 className="animate-spin mr-2" /> : <FileDown className="mr-2" />}
                      Exportar para PDF
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={handlePrint} disabled={isPrinting || students.length === 0}>
                      <Printer className="mr-2" />
                      Imprimir Crachás
                    </Button>
                  </div>
                </div>

                <div className="bg-card p-6 rounded-lg shadow-sm border">
                    <h2 className="text-xl font-bold mb-4 text-primary">Lista de Alunos</h2>
                    {students.length > 0 ? (
                      <StudentList students={students} onUpdate={updateStudent} onDelete={deleteStudent} badgeStyle={badgeStyle}/>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed">
                        Nenhum aluno cadastrado. Use o formulário lateral ou a importação em massa.
                      </div>
                    )}
                </div>

                <div className="bg-card p-6 rounded-lg shadow-sm border no-print">
                    <h2 className="text-xl font-bold mb-4 text-primary">Pré-visualização do Design</h2>
                    {students.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {students.slice(0, 4).map((student) => (
                          <StudentBadge key={student.id} student={student} background={background} styles={badgeStyle} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground italic">Cadastre alunos para ver a prévia real aqui.</p>
                    )}
                </div>
              </div>
            </div>
        )}

        <div id="printable-area" className="hidden">
           <div className="print-container">
            {students.map((student) => (
                <div key={`print-${student.id}`} className="print-item">
                    <StudentBadge student={student} background={background} styles={badgeStyle} />
                </div>
            ))}
           </div>
        </div>
      </main>
      
      {isMounted && (
        <footer className="text-center py-8 text-muted-foreground text-sm no-print">
          <p>&copy; {new Date().getFullYear()} Crachá Inteligente. Sistema Profissional para Escolas.</p>
        </footer>
      )}
    </div>
  );
}