
// Define custom type for Supabase database interface
export interface Database {
  public: {
    Tables: {
      certificates: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          course_name: string;
          user_name: string;
          issue_date: string;
          expiry_date: string | null;
          certificate_url: string | null;
        };
      };
      courses: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          thumbnail: string | null;
          duration: string | null;
          instructor: string;
          enrolledcount: number;
          rating: number;
          created_at: string;
          updated_at: string;
        };
      };
      modules: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          description: string | null;
          order_number: number;
          created_at: string;
          updated_at: string;
        };
      };
      lessons: {
        Row: {
          id: string;
          module_id: string;
          title: string;
          description: string | null;
          duration: string | null;
          video_url: string | null;
          content: string | null;
          order_number: number;
          created_at: string;
          updated_at: string;
        };
      };
      enrollments: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          progress: number;
          enrolled_at: string;
          completed_at: string | null;
        };
      };
      lesson_progress: {
        Row: {
          id: string;
          user_id: string;
          lesson_id: string;
          completed: boolean;
          completed_at: string | null;
        };
      };
      profiles: {
        Row: {
          id: string;
          name: string | null;
          bio: string | null;
          avatar_url: string | null;
          job_title: string | null;
          company: string | null;
          location: string | null;
          website: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      recent_certificates: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          issue_date: string;
          course_name: string;
          user_name: string;
        };
      };
    };
  };
}
