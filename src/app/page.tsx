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

export default function Home() {
  const [students, setStudents] = useState<Student[]>([]);
  const [background, setBackground] = useState<string>("");
  const [isPrinting, setIsPrinting] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const defaultBg = PlaceHolderImages.find(img => img.id === 'default-background');
    if (defaultBg) {
        setBackground(defaultBg.imageUrl);
    }
  }, []);

  const addStudent = (student: Omit<Student, "id">) => {
    setStudents(prev => [...prev, { ...student, id: new Date().toISOString() }]);
    toast({ title: "Sucesso!", description: "Aluno adicionado." });
  };

  const updateStudent = (updatedStudent: Student) => {
    setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
    toast({ title: "Sucesso!", description: "Dados do aluno atualizados." });
  };

  const deleteStudent = (studentId: string) => {
    setStudents(prev => prev.filter(s => s.id !== studentId));
    toast({ title: "Aluno removido." });
  };

  const handleBulkImport = (newStudents: Omit<Student, "id">[]) => {
    const studentsWithIds = newStudents.map(s => ({ ...s, id: new Date().toISOString() + Math.random() }));
    setStudents(prev => [...prev, ...studentsWithIds]);
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
      await generatePdf(students, background);
    } catch (error) {
      console.error("PDF Generation Error:", error);
      toast({ variant: "destructive", title: "Erro", description: "Ocorreu um erro ao gerar o PDF." });
    } finally {
      setIsPdfLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-background">
      <PageHeader />
      <main className="container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 flex flex-col gap-8 no-print">
            <AddStudentCard onAddStudent={addStudent} />
            <BulkImportCard onImport={handleBulkImport} />
            <CustomizeCard
              currentBackground={background}
              onSetBackground={setBackground}
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
                <StudentList students={students} onUpdate={updateStudent} onDelete={deleteStudent} />
            </div>

            <div className="bg-card p-6 rounded-lg shadow-sm no-print">
                <h2 className="text-2xl font-bold mb-4 text-primary">Pré-visualização dos Crachás</h2>
                {students.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {students.map((student) => (
                      <StudentBadge key={student.id} student={student} background={background} />
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Nenhum aluno adicionado ainda. Os crachás aparecerão aqui.</p>
                )}
            </div>
          </div>
        </div>

        {/* This div is only for printing */}
        <div id="printable-area" className="hidden">
           <div className="print-container">
            {students.map((student) => (
                <div key={`print-${student.id}`} className="print-item">
                    <StudentBadge student={student} background={background} />
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
