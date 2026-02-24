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
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
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
    if (auth && !user && !isAuthLoading) {
      signInAnonymously(auth).catch((error) => {
        console.error("Anonymous sign-in failed", error);
        toast({
          variant: "destructive",
          title: "Falha na autenticação",
          description: "Não foi possível conectar ao serviço de dados.",
        });
      });
    }
  }, [auth, user, isAuthLoading, toast]);


  useEffect(() => {
    if (configData) {
      // Config exists, load it
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
        // Config doesn't exist, create it with default values
        const defaultConfig = {
            badgeStyle: defaultBadgeStyle,
            fundoCrachaUrl: PlaceHolderImages.find(img => img.id === 'default-background')?.imageUrl || ''
        };
        setDocumentNonBlocking(configDocRef, defaultConfig, {});
    }

    setIsMounted(true);
  }, [configData, isConfigLoading, user, configDocRef]);
  

  useEffect(() => {
    // Debounced save to Firestore
    if (isMounted && configDocRef && !isConfigLoading && user) {
      const handler = setTimeout(() => {
        updateDocumentNonBlocking(configDocRef, { badgeStyle, fundoCrachaUrl: background });
      }, 1000); // 1 second debounce

      return () => {
        clearTimeout(handler);
      };
    }
  }, [badgeStyle, background, isMounted, configDocRef, isConfigLoading, user]);


  const addStudent = (student: Omit<Student, "id">) => {
    if (!alunosCollection) return;
    addDocumentNonBlocking(alunosCollection, student);
    toast({ title: "Sucesso!", description: "Aluno adicionado." });
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
    } catch (error) {
      console.error("PDF Generation Error:", error);
      toast({ variant: "destructive", title: "Erro", description: "Ocorreu um erro ao gerar o PDF." });
    } finally {
      setIsPdfLoading(false);
    }
  };
  
  const isLoading = studentsLoading || isAuthLoading || isConfigLoading;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader />
      <main className="container mx-auto p-4 md:p-8">
        {isLoading && !isMounted ? (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="animate-spin h-12 w-12 text-primary" />
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
                <div className="bg-card p-6 rounded-lg shadow-sm no-print">
                  <h2 className="text-2xl font-bold mb-4 text-primary">Ações</h2>
                  <div className="flex flex-col sm:flex-row gap-4">
                     <Button onClick={handleGeneratePdf} disabled={isPdfLoading || students.length === 0}>
                      {isPdfLoading ? <Loader2 className="animate-spin" /> : <FileDown />}
                      Gerar PDF
                    </Button>
                    <Button onClick={handlePrint} disabled={isPrinting || students.length === 0}>
                      <Printer />
                      Impressão
                    </Button>
                  </div>
                </div>

                <div className="bg-card p-6 rounded-lg shadow-sm no-print">
                    <h2 className="text-2xl font-bold mb-4 text-primary">Alunos Cadastrados</h2>
                    {(studentsLoading || isAuthLoading) ? <Loader2 className="animate-spin mx-auto"/> : <StudentList students={students} onUpdate={updateStudent} onDelete={deleteStudent} badgeStyle={badgeStyle}/>}
                </div>

                <div className="bg-card p-6 rounded-lg shadow-sm no-print">
                    <h2 className="text-2xl font-bold mb-4 text-primary">Pré-visualização dos Crachás</h2>
                    {(studentsLoading || isAuthLoading) ? <Loader2 className="animate-spin mx-auto" /> : students.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {students.map((student) => (
                          <StudentBadge key={student.id} student={student} background={background} styles={badgeStyle} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Nenhum aluno adicionado ainda. Os crachás aparecerão aqui.</p>
                    )}
                </div>
              </div>
            </div>
        )}

        {/* This div is only for printing */}
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
      <footer className="text-center py-6 text-muted-foreground text-sm no-print">
        <p>&copy; {new Date().getFullYear()} Crachá Inteligente. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
