import { type Student } from "@/lib/types";
import Image from "next/image";

interface StudentBadgeProps {
  student: Student;
  background: string;
}

export default function StudentBadge({ student, background }: StudentBadgeProps) {
  return (
    <div
      className="relative aspect-[1063/768] w-full overflow-hidden rounded-lg shadow-md bg-card bg-cover bg-center"
      style={{ backgroundImage: `url(${background})` }}
      data-ai-hint="school badge"
    >
      {/* Content Wrapper */}
      <div className="absolute inset-0 z-10">
        {/* Student Photo */}
        <div
          className="absolute overflow-hidden"
          style={{
            left: '3.5%',
            top: '37.1%',
            width: '27.4%',
            height: '49%',
            borderRadius: '12px',
            border: '3px solid white',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
          }}
        >
          <Image
            src={student.photo}
            alt={`Foto de ${student.name}`}
            fill
            sizes="30vw"
            className="object-cover"
          />
        </div>

        {/* Student Name */}
        <div
          className="absolute flex items-center px-3 font-bold text-left truncate"
          style={{
            left: '34.8%',
            top: '53.4%',
            width: '62%',
            height: '6.4%',
            fontSize: 'clamp(0.7rem, 2vw, 1rem)',
            color: '#2a4d7a',
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
            borderRadius: '6px',
          }}
        >
          {student.name}
        </div>

        {/* Student Class (Turma) */}
        <div
          className="absolute flex items-center px-3 font-bold text-left"
          style={{
            left: '34.8%',
            top: '67.3%',
            width: '21.4%',
            height: '6.4%',
            fontSize: 'clamp(0.7rem, 2vw, 1rem)',
            color: '#2a4d7a',
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
            borderRadius: '6px',
          }}
        >
          {student.turma}
        </div>
      </div>
    </div>
  );
}
