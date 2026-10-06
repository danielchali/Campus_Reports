declare module '*.svg' {
  const content: React.FC<React.SVGProps<SVGElement>>;
  export default content;
}

interface Window {
  navigator: Navigator;
}

interface Navigator {
  onLine: boolean;
}

declare global {
  interface GoogleCredentialResponse {
    credential: string;
    select_by?: string;
  }

  interface GoogleIdentityServices {
    accounts: {
      id: {
        initialize: (options: {
          client_id: string;
          callback: (response: GoogleCredentialResponse) => void;
          auto_select?: boolean;
          cancel_on_tap_outside?: boolean;
        }) => void;
        renderButton: (element: HTMLElement, options: {
          type?: 'standard' | 'icon';
          theme?: 'outline' | 'filled_blue' | 'filled_black';
          size?: 'small' | 'medium' | 'large';
          shape?: 'rectangular' | 'pill' | 'circle' | 'square';
          width?: number;
          text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
        }) => void;
        disableAutoSelect?: () => void;
      };
    };
  }

  interface Window {
    google?: GoogleIdentityServices;
  }
}

export interface User {
  id: string;
  username: string;
  role: string;
  name?: string;
  [key: string]: unknown;
}

export interface Student {
  _id?: string;
  studentId: string;
  fullName: string;
  program?: string;
  year?: string;
  gender?: string;
  disciplinaryHistory?: Case[];
}

export interface Case {
  _id: string;
  student: Student;
  incidentDate: string;
  description: string;
  offenseType: string;
  severity: string;
  status: string;
  sanctions?: string;
  attachments?: string[];
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Evidence {
  _id: string;
  fileName: string;
  filePath: string;
  case: Case;
  uploadedBy: User;
  uploadedAt: string;
}

export interface AuditLog {
  _id: string;
  user: { name: string } | string;
  action: string;
  target?: string;
  targetId?: string;
  details?: string;
  createdAt: string;
}
