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
    
    // Usamos porcentagem para manter a escala em qualquer tamanho de container, inclusive na impressão
    const scaledFontSize = `${(style.fontSize / BADGE_BASE_HEIGHT) * 100}%`;
    
    return (
      <div
        className="absolute flex items-center overflow-hidden"
        style={{
          left: `${(style.x / BADGE_BASE_WIDTH) * 100}%`,
          top: `${(style.y / BADGE_BASE_HEIGHT) * 100}%`,
          width: `${(style.width / BADGE_BASE_WIDTH) * 100}%`,
          height: `${(style.height / BADGE_BASE_HEIGHT) * 100}%`,
          fontSize: scaledFontSize,
          color: style.color,
          fontWeight: style.fontWeight,
          textAlign: style.textAlign,
          backgroundColor: rgba,
          borderRadius: `${(style.backgroundRadius / BADGE_BASE_WIDTH) * 100}cqw`,
          padding: '0 0.2em',
          justifyContent: style.textAlign === 'center' ? 'center' : style.textAlign === 'right' ? 'flex-end' : 'flex-start',
          zIndex: 20,
          lineHeight: 1
        }}
      >
        <span className="truncate w-full leading-tight">{text}</span>
      </div>
    );
  };

  const photoStyle: React.CSSProperties = {
    left: `${(styles.photo.x / BADGE_BASE_WIDTH) * 100}%`,
    top: `${(styles.photo.y / BADGE_BASE_HEIGHT) * 100}%`,
    width: `${(styles.photo.width / BADGE_BASE_WIDTH) * 100}%`,
    height: `${(styles.photo.height / BADGE_BASE_HEIGHT) * 100}%`,
    borderRadius: `${(styles.photo.borderRadius / BADGE_BASE_WIDTH) * 100}cqw`,
    boxSizing: 'border-box',
    zIndex: 10,
    overflow: 'hidden',
    position: 'absolute'
  };

  if (styles.photo.hasBorder && styles.photo.borderWidth > 0) {
    const borderColorRgb = hexToRgb(styles.photo.borderColor);
    const borderColorRgba = borderColorRgb
      ? `rgba(${borderColorRgb.r}, ${borderColorRgb.g}, ${borderColorRgb.b}, ${styles.photo.borderOpacity})`
      : 'transparent';
    
    photoStyle.border = `${(styles.photo.borderWidth / BADGE_BASE_WIDTH) * 100}cqw solid ${borderColorRgba}`;
  }

  return (
    <div
      className="relative aspect-[1063/768] w-full overflow-hidden bg-white shadow-md [container-type:size]"
      data-ai-hint="crachá estudante"
    >
      {/* Background Image - Tag IMG real para garantir renderização na impressão */}
      <div className="absolute inset-0 z-0">
        {background && (
          <Image 
            src={background} 
            alt="Fundo do Crachá" 
            fill 
            className="object-cover" 
            priority
            unoptimized
          />
        )}
      </div>

      <div className="absolute inset-0 z-10 pointer-events-none">
        <div style={photoStyle}>
          {student.fotoUrl && (
            <Image
              src={student.fotoUrl}
              alt={`Foto de ${student.nome}`}
              fill
              className="object-cover"
              unoptimized
            />
          )}
        </div>

        {renderText(student.nome, styles.name)}
        {renderText(student.turma, styles.turma)}
        
        {styles.customFields.map((field) => {
            const value = student.customData?.[field.id];
            if (!value) return null;
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