
export interface BaseStyle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TextStyle extends BaseStyle {
  fontSize: number;
  color: string;
  fontWeight: 'normal' | 'bold';
  textAlign: 'left' | 'center' | 'right';
  backgroundColor: string;
  backgroundOpacity: number;
  backgroundRadius: number;
}

export interface PhotoStyle extends BaseStyle {
  borderRadius: number;
}

export interface CustomField extends TextStyle {
  id: string;
  text: string;
}

export interface BadgeStyleConfig {
  photo: PhotoStyle;
  name: TextStyle;
  turma: TextStyle;
  customFields: CustomField[];
}

// These values are in pixels, based on a 1063x768 design
export const defaultBadgeStyle: BadgeStyleConfig = {
  photo: {
    x: 38,
    y: 195,
    width: 292,
    height: 376,
    borderRadius: 20,
  },
  name: {
    x: 378,
    y: 334,
    width: 630,
    height: 50,
    fontSize: 32,
    color: '#ffffff',
    fontWeight: 'bold',
    textAlign: 'left',
    backgroundColor: '#000000',
    backgroundOpacity: 0,
    backgroundRadius: 6,
  },
  turma: {
    x: 378,
    y: 420,
    width: 298,
    height: 50,
    fontSize: 32,
    color: '#ffffff',
    fontWeight: 'bold',
    textAlign: 'left',
    backgroundColor: '#000000',
    backgroundOpacity: 0,
    backgroundRadius: 6,
  },
  customFields: [],
};
