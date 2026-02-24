import { type Student } from "@/lib/types";
import { type BadgeStyleConfig, type TextStyle } from "@/lib/badge-styles";
import Image from "next/image";

interface StudentBadgeProps {
  student: Student;
  background: string;
  styles: BadgeStyleConfig;
}

const BADGE_BASE_WIDTH = 1063;
const BADGE_BASE_HEIGHT = 768;

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

export default function StudentBadge({ student, background, styles }: StudentBadgeProps) {
  
  const renderText = (text: string, style: TextStyle) => {
    const rgb = hexToRgb(style.backgroundColor);
    const rgba = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${style.backgroundOpacity})` : 'transparent';
    
    return (
      <div
        className="absolute flex items-center"
        style={{
          left: `${(style.x / BADGE_BASE_WIDTH) * 100}%`,
          top: `${(style.y / BADGE_BASE_HEIGHT) * 100}%`,
          width: `${(style.width / BADGE_BASE_WIDTH) * 100}%`,
          height: `${(style.height / BADGE_BASE_HEIGHT) * 100}%`,
          fontSize: `clamp(0.5rem, ${(style.fontSize / BADGE_BASE_WIDTH) * 100}vw, 2rem)`,
          color: style.color,
          fontWeight: style.fontWeight,
          textAlign: style.textAlign,
          backgroundColor: rgba,
          borderRadius: `${style.backgroundRadius}px`,
          padding: '0 0.5em'
        }}
      >
        <span className="truncate w-full">{text}</span>
      </div>
    );
  };

  const photoStyle: React.CSSProperties = {
    left: `${(styles.photo.x / BADGE_BASE_WIDTH) * 100}%`,
    top: `${(styles.photo.y / BADGE_BASE_HEIGHT) * 100}%`,
    width: `${(styles.photo.width / BADGE_BASE_WIDTH) * 100}%`,
    height: `${(styles.photo.height / BADGE_BASE_HEIGHT) * 100}%`,
    borderRadius: `${styles.photo.borderRadius}px`,
    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
    boxSizing: 'border-box',
  };

  if (styles.photo.hasBorder && styles.photo.borderWidth > 0) {
    const borderColorRgb = hexToRgb(styles.photo.borderColor);
    const borderColorRgba = borderColorRgb
      ? `rgba(${borderColorRgb.r}, ${borderColorRgb.g}, ${borderColorRgb.b}, ${styles.photo.borderOpacity})`
      : 'transparent';
    
    photoStyle.border = `${styles.photo.borderWidth}px solid ${borderColorRgba}`;
  }

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
          style={photoStyle}
        >
          <Image
            src={student.photo}
            alt={`Foto de ${student.name}`}
            fill
            sizes="30vw"
            className="object-cover"
          />
        </div>

        {renderText(student.name, styles.name)}
        {renderText(student.turma, styles.turma)}
        
        {styles.customFields.map((field) => {
            const value = student.customData?.[field.id];
            if (!value) {
                return null;
            }
            return (
                <div key={field.id}>
                    {renderText(value, field)}
                </div>
            );
        })}
      </div>
    </div>
  );
}
