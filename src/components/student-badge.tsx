import { type Student } from "@/lib/types";
import Image from "next/image";

interface StudentBadgeProps {
  student: Student;
  background: string;
}

export default function StudentBadge({ student, background }: StudentBadgeProps) {
  return (
    <div 
      className="relative aspect-[1000/723] w-full overflow-hidden rounded-lg shadow-md bg-card bg-cover bg-center"
      style={{ backgroundImage: `url(${background})` }}
      data-ai-hint="school badge"
    >
      {/* Content Wrapper */}
      <div className="absolute inset-0 z-10">
        {/* Student Photo */}
        <div
          className="absolute overflow-hidden bg-white shadow-lg"
          style={{
            left: '8.5%',
            top: '47%',
            width: '25%',
            height: '42%',
            borderRadius: '8px',
            border: '2px solid white',
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
          className="absolute flex items-center px-2 font-bold text-left truncate"
          style={{
            left: '48%',
            top: '56.5%',
            width: '45%',
            height: '7%',
            fontSize: 'clamp(0.8rem, 2.5vw, 1.1rem)',
            color: '#FFFFFF',
            textShadow: '0px 1px 3px rgba(0, 0, 0, 0.7)'
          }}
        >
          {student.name}
        </div>

        {/* Student Class (Turma) */}
        <div
          className="absolute flex items-center px-2 font-bold text-left"
          style={{
            left: '48%',
            top: '68.5%',
            width: '50%',
            height: '7%',
            fontSize: 'clamp(0.8rem, 2.5vw, 1.1rem)',
            color: '#FFFFFF',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            textShadow: '0px 1px 3px rgba(0, 0, 0, 0.7)'
          }}
        >
          {student.turma}
        </div>
      </div>
    </div>
  );
}
