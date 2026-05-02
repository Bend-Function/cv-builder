export interface Profile {
  full_name: string;
  email: string;
  github_url: string;
  linkedin_url: string;
  portfolio_url: string;
}

export interface WorkExperience {
  id: string;
  company: string;
  title: string;
  narrative: string;
  technologies: string[];
}

export interface Project {
  id: string;
  name: string;
  type: string;
  technologies: string[];
  narrative: string;
  tier: string;
}

export interface MasterCv {
  profile: Profile;
  work_experience: WorkExperience[];
  projects: Project[];
}
