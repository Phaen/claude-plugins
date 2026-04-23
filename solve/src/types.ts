export type SolutionStatus = 'pending' | 'researching' | 'researched' | 'resolved' | 'failed';
export type ProblemStatus  = 'pending' | 'investigating' | 'investigated' | 'blocked';

export interface SolutionNode {
  type:           'solution';
  id:             string;
  parent_problem: string | null;
  text:           string;
  status:         SolutionStatus;
  research_text:  string;
  resolved_text:  string;
}

export interface ProblemNode {
  type:             'problem';
  id:               string;
  parent_solution:  string | null;
  text:             string;
  status:           ProblemStatus;
  investigate_text: string;
  blocked_text:     string | null;
}

export type SolveNode = SolutionNode | ProblemNode;

export interface SolveState {
  session_id:       string;
  cwd:              string;
  status:           'solving' | 'resolved' | 'blocked';
  root_problem:     string;
  root_investigate: string;
  nodes:            Record<string, SolveNode>;
  selected_id:      string | null;
  compare_text:     string | null;
  blocked_text:     string | null;
  updated_at:       number;
}

export interface Session {
  solve_id:     string;
  session_id:   string;
  project_path: string;
  project_name: string;
  started_at:   number;
}
