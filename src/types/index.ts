export interface Task {
  id: number;
  name: string;
  start: Date;
  end: Date;
  status: string;
  priorityBonus: number;
  comments: string;
}

export interface Project {
  id: number;
  name: string;
  projectStage: string;
  responsible: string;
  potentialRevenue: number;
  priceQuotation: number | null;
  priceOutsourcing: number | null;
  workOrderGenerated: boolean;
  workOrderNumber: string;
  customizedScriptRequest: boolean;
  customizedScriptNumber: string;
  demandFormGenerated: boolean;
  comments: string;
  tasks: Task[];
}
