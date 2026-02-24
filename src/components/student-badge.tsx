import { type Student } from "@/lib/types";
import Image from "next/image";

interface StudentBadgeProps {
  student: Student;
  background: string;
  slogan: string;
}

export default function StudentBadge({ student, background, slogan }: StudentBadgeProps) {
  return (
    <div className="relative aspect-[400/289] w-full overflow-hidden rounded-lg shadow-md bg-card">
      {/* Background Image */}
      <Image
        src={background}
        alt="Fundo do crachá"
        fill
        sizes="100%"
        className="object-cover"
        priority
        data-ai-hint="abstract blue"
      />

      {/* Content Wrapper */}
      <div className="absolute inset-0 z-10">
        {/* Student Photo */}
        <div
          className="absolute overflow-hidden bg-white shadow-lg"
          style={{
            left: '3.5%', // 14px / 400px
            top: '37.02%', // 107px / 289px
            width: '27.5%', // 110px / 400px
            height: '49.13%', // 142px / 289px
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
            left: '34%', // 136px / 400px
            top: '51.9%', // 150px / 289px
            width: '59.5%', // 238px / 400px
            height: '9.68%', // 28px / 289px
            fontSize: 'calc(0.0375 * 100vmin)', // 15px on a 400px wide element
            color: '#2a4d7a',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            borderRadius: '4px',
            textShadow: '1px 1px 2px #fff',
          }}
        >
          {student.name}
        </div>

        {/* Student Class (Turma) */}
        <div
          className="absolute flex items-center px-2 font-bold text-left"
          style={{
            left: '34%', // 136px / 400px
            top: '69.2%', // 200px / 289px
            width: '20%', // 80px / 400px
            height: '8.3%', // 24px / 289px
            fontSize: 'calc(0.0375 * 100vmin)',
            color: '#2a4d7a',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderRadius: '4px',
          }}
        >
          {student.turma}
        </div>

        {/* Slogan */}
        <div
          className="absolute flex items-center px-2 text-left italic"
          style={{
            left: '34%', // 136px / 400px
            top: '80.2%', // 232px / 289px
            width: '59.5%', // 238px / 400px
            height: '8.3%', // 24px / 289px
            fontSize: 'calc(0.03 * 100vmin)', // 12px on 400px
            color: '#2a4d7a',
          }}
        >
          &ldquo;{slogan}&rdquo;
        </div>
      </div>
    </div>
  );
}
