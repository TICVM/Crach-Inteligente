import { GraduationCap } from "lucide-react";

export default function PageHeader() {
  return (
    <header className="bg-card shadow-sm no-print">
      <div className="container mx-auto p-4 flex items-center gap-4">
        <GraduationCap className="h-10 w-10 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-primary">Crachá Inteligente</h1>
          <p className="text-muted-foreground">
            Sistema para criar e gerar crachás personalizados com IA.
          </p>
        </div>
      </div>
    </header>
  );
}
