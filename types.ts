
export enum FieldType {
  TEXT = 'text',
  TEXTAREA = 'textarea',
  NUMBER = 'number',
  DATE = 'date',
  TABLE = 'table',
  BULLET = 'bullet',
  SIGNATURE = 'signature',
  PHOTOS = 'photos',
}

export interface FormField {
  id: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  columns?: string[];
  rows?: any[];
  defaultValue?: any;
  editableFirstColumn?: boolean;
  hasPhotoUploads?: boolean;
  tooltip?: string;
}

export interface FormSection {
  id: string;
  title: string;
  fields: FormField[];
}

export interface ReportTemplate {
  key: string;
  name:string;
  title: string;
  sections: FormSection[];
}

export type ReportTemplates = {
  [key: string]: ReportTemplate;
};

export interface SavedReport {
  id: string;
  templateKey: string;
  templateName: string;
  reportName: string;
  formData: any;
  savedAt: string;
}

export interface PptPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  text_light: string;
}
export interface PptTheme {
  key: string;
  name: string;
  palette: PptPalette;
}