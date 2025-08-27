import React, { useState, useEffect } from 'react';
import { Calendar, Clock, AlertTriangle, CheckCircle, Circle, Plus, Edit, Save, X, MessageSquare, Building2, Eye, FileText } from 'lucide-react';
import { Project, Task } from './types';
import { 
  loadProjects, 
  saveProjects, 
  loadProjectsFromStorage,
  exportCurrentDataToJSON
} from './services/dataService';

// Import html2pdf for PDF generation
import html2pdf from 'html2pdf.js';

const ProjectGanttChart = () => {
  const [currentDate] = useState(new Date());
  
  const [projects, setProjects] = useState<Project[]>([]);



  // Load data from JSON files on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Try to load from JSON files first
        const loadedProjects = await loadProjects();
        
        if (loadedProjects.length > 0) {
          setProjects(loadedProjects);
        } else {
          // Fallback to localStorage if JSON files fail
          const storedProjects = loadProjectsFromStorage();
          if (storedProjects.length > 0) {
            setProjects(storedProjects);
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
        // Fallback to localStorage
        const storedProjects = loadProjectsFromStorage();
        if (storedProjects.length > 0) setProjects(storedProjects);
      }
    };
    
    loadData();
  }, []);



  // Add browser close warning for unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Check if there are unsaved changes in localStorage
      const storedProjects = localStorage.getItem('projects');
      const storedTasks = localStorage.getItem('additionalTasks');
      
      if (storedProjects || storedTasks) {
        const message = '⚠️ WARNING: You have unsaved changes! Export to JSON or your data will be lost. Are you sure you want to close?';
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddProject, setShowAddProject] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [activeSection, setActiveSection] = useState('potential');
  const [showTodayTasks, setShowTodayTasks] = useState(false);
  const [todayTasks, setTodayTasks] = useState<any[]>([]);
  
  const [newTask, setNewTask] = useState({
    name: '',
    start: '',
    end: '',
    status: 'planned',
    project: '',
    priorityBonus: 0,
    comments: ''
  });

  const [newProject, setNewProject] = useState({
    name: '',
    projectStage: 'Planning',
    responsible: 'internal',
    potentialRevenue: 0,
    priceQuotation: null as number | null,
    priceOutsourcing: null as number | null,
    workOrderGenerated: false,
    workOrderNumber: '',
    customizedScriptRequest: false,
    customizedScriptNumber: '',
    demandFormGenerated: false,
    comments: ''
  });

  const projectStages = [
    'Planning',
    'Design', 
    'Development',
    'Testing',
    'Deployment',
    'Complete'
  ];

  const categorizeProjects = () => {
    const potential = projects.filter(p => p.projectStage === 'Planning');
    const inProgress = projects.filter(p => p.projectStage !== 'Planning' && p.projectStage !== 'Complete');
    const archived = projects.filter(p => p.projectStage === 'Complete');
    return { potential, inProgress, archived };
  };

  const { potential, inProgress, archived } = categorizeProjects();

  const calculatePriorityScore = (task: Task, taskStart: Date, taskEnd: Date) => {
    const today = new Date(currentDate);
    const startDate = new Date(taskStart);
    const endDate = new Date(taskEnd);
    
    // Calculate total days (task duration)
    const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    
    // Calculate remaining days until deadline
    const remainingDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    // Apply priority bonus (subtract from remaining days)
    const adjustedRemainingDays = Math.max(0, remainingDays - task.priorityBonus);
    
    // Calculate score using new formula
    const score = (totalDays - adjustedRemainingDays) / totalDays * 100;
    
    // Ensure score is between 0 and 100, replace NaN with 0
    return Math.min(100, Math.max(0, isNaN(score) ? 0 : score));
  };

  const getTodayTasks = () => {
    const today = new Date(currentDate);
    const fifteenDaysLater = new Date(today);
    fifteenDaysLater.setDate(today.getDate() + 15);
    
    const tasksForPeriod: any[] = [];
    
    projects.forEach(project => {
      project.tasks.forEach(task => {
        const taskStart = new Date(task.start);
        const taskEnd = new Date(task.end);
        
        if (taskStart <= fifteenDaysLater || (today >= taskStart && today <= taskEnd) || taskEnd < today) {
          const priorityScore = calculatePriorityScore(task, taskStart, taskEnd);
          
          const taskWithMetadata = {
            ...task,
            projectName: project.name,
            priorityScore: priorityScore,
            daysToDeadline: Math.ceil((taskEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
            isOverdue: taskEnd < today
          };
          
          console.log('Processing task for priority view:', {
            id: task.id,
            name: task.name,
            comments: task.comments,
            fullTask: task
          });
          
          tasksForPeriod.push(taskWithMetadata);
        }
      });
    });
    

    
    // Sort by priority score and limit to top 10 tasks
    tasksForPeriod.sort((a, b) => b.priorityScore - a.priorityScore);
    const top10Tasks = tasksForPeriod.slice(0, 10);
    
    console.log('Final priority tasks:', top10Tasks.map(t => ({ id: t.id, name: t.name, comments: t.comments })));
    
    setTodayTasks(top10Tasks);
    setShowTodayTasks(true);
  };

  const handleEditTask = (task: Task, projectId: number | null) => {
    setEditingTask({ ...task, projectId });
  };

  const handleSaveEditTask = () => {
    if (!editingTask) return;

    console.log('Saving task with comments:', editingTask.comments); // Debug log

    // If task is being marked as closed, add to project comments and remove from chart
    if (editingTask.status === 'closed') {
      const today = new Date().toLocaleDateString();
      const commentToAdd = `${editingTask.name} - ${today} - Done`;
      
      // Update project task, add comment, and remove task
      const updatedProjects = projects.map(project => {
        if (project.id === editingTask.projectId) {
          const updatedComments = project.comments ? 
            `${project.comments}\n${commentToAdd}` : 
            commentToAdd;
          
          return {
            ...project,
            comments: updatedComments,
            tasks: project.tasks.filter(task => task.id !== editingTask.id)
          };
        }
        return project;
      });
      setProjects(updatedProjects);
      saveProjects(updatedProjects);
      
      // Update priority tasks if they're currently displayed
      if (showTodayTasks) {
        getTodayTasks();
      }
    } else {
      // Normal update - preserve all task properties including comments
      const updatedProjects = projects.map(project => {
        if (project.id === editingTask.projectId) {
          return {
            ...project,
            tasks: project.tasks.map(task =>
              task.id === editingTask.id ? {
                ...editingTask,
                start: new Date(editingTask.start),
                end: new Date(editingTask.end),
                comments: editingTask.comments || '' // Ensure comments are preserved
              } : task
            )
          };
        }
        return project;
      });
      setProjects(updatedProjects);
      saveProjects(updatedProjects);
      
      console.log('Updated projects, now refreshing priority tasks...'); // Debug log
      
      // Always update priority tasks to reflect the changes
      if (showTodayTasks) {
        getTodayTasks();
      } else {
        // Force refresh priority tasks even if not currently displayed
        // This ensures they're up to date when displayed next
        setTimeout(() => {
          if (showTodayTasks) {
            getTodayTasks();
          }
        }, 100);
      }
    }

    setEditingTask(null);
  };

  const handleDeleteTask = () => {
    if (!editingTask) return;
    
    const confirmed = window.confirm("Are you sure you want to eliminate this task? This action cannot be undone.");
    
    if (confirmed) {
      // Remove from project tasks
      const updatedProjects = projects.map(project => {
        if (project.id === editingTask.projectId) {
          return {
            ...project,
            tasks: project.tasks.filter(task => task.id !== editingTask.id)
          };
        }
        return project;
      });
      setProjects(updatedProjects);
      saveProjects(updatedProjects);
      
      // Update priority tasks if they're currently displayed
      if (showTodayTasks) {
        getTodayTasks();
      }
      
      setEditingTask(null);
    }
  };

  const handleAddTask = () => {
    if (!newTask.name || !newTask.start || !newTask.end || !newTask.project) return;

    // Generate a unique task ID that won't conflict with other projects
    const allTaskIds = projects.flatMap(p => p.tasks.map(t => t.id));
    const nextTaskId = allTaskIds.length > 0 ? Math.max(...allTaskIds) + 1 : 1;

    const task = {
      id: nextTaskId,
      name: newTask.name,
      start: new Date(newTask.start),
      end: new Date(newTask.end),
      status: newTask.status,
      priorityBonus: newTask.priorityBonus,
      comments: newTask.comments
    } as Task;

    const projectIndex = projects.findIndex(p => p.id === parseInt(newTask.project));
    if (projectIndex !== -1) {
      const updatedProjects = [...projects];
      updatedProjects[projectIndex].tasks.push(task);
      setProjects(updatedProjects);
      saveProjects(updatedProjects);
      
      // Update priority tasks if they're currently displayed
      if (showTodayTasks) {
        getTodayTasks();
      }
    }

    setNewTask({ name: '', start: '', end: '', status: 'planned', project: '', priorityBonus: 0, comments: '' });
    setShowAddTask(false);
  };

  const handleAddProject = () => {
    if (!newProject.name) return;

    // Generate a unique project ID starting from 1
    const allProjectIds = projects.map(p => p.id).filter(id => id !== null && id !== undefined);
    const nextProjectId = allProjectIds.length > 0 ? Math.max(...allProjectIds) + 1 : 1;

    const project = {
      id: nextProjectId,
      ...newProject,
      tasks: []
    };

    setProjects([...projects, project]);
    saveProjects([...projects, project]);
    
    // Update priority tasks if they're currently displayed
    if (showTodayTasks) {
      getTodayTasks();
    }
    setNewProject({
      name: '',
              projectStage: 'Planning',
      responsible: 'internal',
      potentialRevenue: 0,
      priceQuotation: null,
      priceOutsourcing: null,
      workOrderGenerated: false,
      workOrderNumber: '',
      customizedScriptRequest: false,
      customizedScriptNumber: '',
      demandFormGenerated: false,
      comments: ''
    });
    setShowAddProject(false);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject({ ...project });
  };

  const handleSaveEditProject = () => {
    if (!editingProject) return;

    const updatedProjects = projects.map(project =>
      project.id === editingProject.id ? editingProject : project
    );
    setProjects(updatedProjects);
    saveProjects(updatedProjects);
    
    // Update priority tasks if they're currently displayed
    if (showTodayTasks) {
      getTodayTasks();
    }
    
    setEditingProject(null);
  };

  const handleDeleteProject = () => {
    if (!editingProject) return;
    
    const confirmed = window.confirm(`Are you sure you want to delete the project "${editingProject.name}"? This action cannot be undone and will also delete all associated tasks.`);
    
    if (confirmed) {
      const updatedProjects = projects.filter(project => project.id !== editingProject.id);
      setProjects(updatedProjects);
      saveProjects(updatedProjects);
      
      // Update priority tasks if they're currently displayed
      if (showTodayTasks) {
        getTodayTasks();
      }
      
      setEditingProject(null);
      console.log(`Project "${editingProject.name}" deleted successfully`);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'completed': 'bg-green-500',
      'in_progress': 'bg-blue-500',
      'delayed': 'bg-yellow-500',
      'failed': 'bg-red-500',
      'waiting': 'bg-orange-500',
      'planned': 'bg-gray-400',
      'closed': 'bg-gray-600'
    };
    return colors[status] || 'bg-gray-300';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'delayed': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'waiting': return <Clock className="w-4 h-4 text-orange-600" />;
      case 'closed': return <Circle className="w-4 h-4 text-gray-600" />;
      default: return <Circle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getPriorityIcon = (priorityBonus: number) => {
    switch (priorityBonus) {
      case 3: return <AlertTriangle className="w-4 h-4 text-red-600" />; // High Priority
      case 2: return <AlertTriangle className="w-4 h-4 text-yellow-600" />; // Medium Priority
      case 1: return <AlertTriangle className="w-4 h-4 text-green-600" />; // Low Priority
      case 0: return <Circle className="w-4 h-4 text-gray-400" />; // No Priority
      default: return <Circle className="w-4 h-4 text-gray-400" />; // No Priority
    }
  };

  const getResponsibleIcon = (responsible: string) => {
    return responsible === 'outsourced' ? 
      <Building2 className="w-4 h-4 text-purple-500" /> : 
      <Building2 className="w-4 h-4 text-blue-500" />;
  };



  const startDate = new Date('2025-08-15');
  const endDate = new Date('2025-10-31');
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  const getPositionAndWidth = (taskStart: Date, taskEnd: Date) => {
    const startDays = Math.max(0, Math.ceil((taskStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const endDays = Math.max(0, Math.ceil((taskEnd.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const duration = Math.max(1, endDays - startDays + 1);
    const left = (startDays / totalDays) * 100;
    const width = (duration / totalDays) * 100;
    return { 
      left: `${Math.max(0, Math.min(100, left))}%`, 
      width: `${Math.max(0.5, Math.min(100 - left, width))}%` 
    };
  };

  const generateWeekHeaders = () => {
    const headers: Date[] = [];
    let current = new Date(startDate);
    while (current <= endDate) {
      headers.push(new Date(current));
      current.setDate(current.getDate() + 7);
    }
    return headers;
  };

  const weekHeaders = generateWeekHeaders();

  const renderProjectSection = (sectionProjects: Project[], title: string, bgColor: string) => (
    <div className={`mb-6 ${bgColor} border border-gray-200 rounded-lg overflow-hidden`}>
      <div className="bg-gray-100 p-4 border-b">
        <h2 className="text-xl font-bold">{title} ({sectionProjects.length})</h2>
      </div>
      
      {sectionProjects.length === 0 ? (
        <div className="p-4 text-gray-500 text-center">No projects in this section</div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="flex bg-gray-100 border-b">
            <div className="w-80 p-3 font-semibold border-r">Project / Task</div>
            <div className="flex-1 relative">
              <div className="flex">
                {weekHeaders.map((week, index) => (
                  <div key={index} className="flex-1 p-2 text-center text-xs border-r border-gray-200">
                    {week.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {sectionProjects.map((project) => (
            <div key={project.id} className="border-b border-gray-100">
              <div className="flex bg-gray-50">
                <div className="w-80 p-3 font-semibold border-r flex items-center gap-2">
                  {getResponsibleIcon(project.responsible)}
                  {project.name}
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{project.projectStage}</span>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">€{project.potentialRevenue.toLocaleString()}</span>
                  <button 
                    className="ml-auto text-blue-500 hover:text-blue-700"
                    onClick={() => handleEditProject(project)}
                    title="View/Edit Project Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 relative h-10"></div>
              </div>
              
              {project.tasks.map((task) => (
                <div key={task.id} className="flex">
                  <div className="w-80 p-3 pl-8 text-sm border-r flex items-center gap-2">
                    {getPriorityIcon(task.priorityBonus)}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{task.name}</div>
                    </div>
                    <button 
                      className="ml-auto text-gray-400 hover:text-gray-600 flex-shrink-0"
                      onClick={() => handleEditTask(task, project.id)}
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex-1 relative h-8 bg-white">
                    <div
                      className={`absolute top-1 h-6 rounded ${getStatusColor(task.status)} flex items-center justify-center text-white text-xs font-medium`}
                      style={getPositionAndWidth(task.start, task.end)}
                    >
                      {Math.max(0, Math.ceil((task.end.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))}d
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-white">
      <div className="mb-6 flex items-start gap-6">
        <div className="flex-shrink-0">
          <img 
            src="/logo(2).png" 
            alt="Company Logo" 
            className="w-32 h-32 object-contain"
            onError={(e) => {
              // Fallback if logo doesn't load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.nextElementSibling?.classList.remove('hidden');
            }}
          />
          <div className="hidden text-blue-600 text-xs font-medium text-center">
            Your Logo
          </div>
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Project Management Dashboard</h1>
          <p className="text-gray-600">Current Date: {currentDate.toLocaleDateString()}</p>
        </div>
      </div>

      <div className="mb-6 flex justify-between items-center">
        <div className="flex gap-4">
          <button
            onClick={() => setShowAddTask(!showAddTask)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            <Plus className="w-4 h-4" />
            Add New Task
          </button>
          <button
            onClick={() => setShowAddProject(!showAddProject)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            <Plus className="w-4 h-4" />
            Add New Project
          </button>
          <button
            onClick={getTodayTasks}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Calendar className="w-4 h-4" />
            Priority Tasks
          </button>
          <button
            onClick={() => exportCurrentDataToJSON(projects)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
            title="Export current data to JSON files for manual replacement"
          >
            <Save className="w-4 h-4" />
            Export to JSON
          </button>

          <button
            onClick={async () => {
              // Create a PDF export of the Gantt chart
              const ganttSection = document.querySelector('.gantt-chart-section');
              if (ganttSection) {
                // Create a temporary container with header for PDF
                const pdfContainer = document.createElement('div');
                pdfContainer.style.padding = '20px';
                pdfContainer.style.backgroundColor = 'white';
                
                // Add header
                const header = document.createElement('div');
                header.innerHTML = `
                  <h1 style="text-align: center; color: #1f2937; margin-bottom: 10px; font-size: 24px; font-weight: bold;">
                    Project Management Dashboard - Gantt Chart
                  </h1>
                  <p style="text-align: center; color: #6b7280; margin-bottom: 20px; font-size: 14px;">
                    Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
                  </p>
                  <hr style="border: 1px solid #e5e7eb; margin-bottom: 20px;">
                `;
                
                // Clone the Gantt chart content
                const ganttClone = ganttSection.cloneNode(true) as HTMLElement;
                
                // Append header and content
                pdfContainer.appendChild(header);
                pdfContainer.appendChild(ganttClone);
                
                // Temporarily add to document for PDF generation
                document.body.appendChild(pdfContainer);
                
                const options = {
                  margin: 0.5,
                  filename: `project_gantt_chart_${new Date().toISOString().split('T')[0]}.pdf`,
                  image: { type: 'jpeg', quality: 0.98 },
                  html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
                  jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' }
                };
                
                try {
                  // Try to use File System Access API for custom save location
                  if ('showSaveFilePicker' in window) {
                    const handle = await (window as any).showSaveFilePicker({
                      suggestedName: `project_gantt_chart_${new Date().toISOString().split('T')[0]}.pdf`,
                      types: [{
                        description: 'PDF Files',
                        accept: { 'application/pdf': ['.pdf'] }
                      }]
                    });
                    
                    // Generate PDF blob
                    const pdfBlob = await html2pdf().set(options).from(pdfContainer).outputPdf('blob');
                    
                    // Write to user-selected location
                    const writable = await handle.createWritable();
                    await writable.write(pdfBlob);
                    await writable.close();
                    
                    // Show success message
                    alert(`PDF saved successfully to: ${handle.name}`);
                  } else {
                    // Fallback to download method for browsers without File System Access API
                    await html2pdf().set(options).from(pdfContainer).save();
                  }
                } catch (error) {
                  console.error('Error saving PDF:', error);
                  
                  // If File System Access API failed, try fallback download method
                  if ('showSaveFilePicker' in window) {
                    try {
                      console.log('File System Access failed, trying fallback download...');
                      await html2pdf().set(options).from(pdfContainer).save();
                    } catch (fallbackError) {
                      console.error('Fallback PDF save also failed:', fallbackError);
                      alert('Failed to save PDF. Please try again or check your browser permissions.');
                    }
                  } else {
                    // Browser doesn't support File System Access API
                    alert('Your browser doesn\'t support custom save locations. PDF will be downloaded to your default downloads folder.');
                  }
                } finally {
                  // Clean up temporary container
                  document.body.removeChild(pdfContainer);
                }
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            title="Export Gantt Chart to PDF - Choose save location"
          >
            <FileText className="w-4 h-4" />
            Export PDF
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              const confirmed = window.confirm("Are you sure you want to close the application? Your data will be automatically exported to JSON before closing.");
              if (confirmed) {
                try {
                  // Auto-export data before closing
                  await exportCurrentDataToJSON(projects);
                  // Small delay to ensure export completes
                  setTimeout(() => {
                    window.close();
                  }, 500);
                } catch (error) {
                  console.error('Error during auto-export:', error);
                  // Still close even if export fails
                  window.close();
                }
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            title="Close the application and auto-export data to JSON"
          >
            <X className="w-4 h-4" />
            Close App & Save
          </button>
        </div>
      </div>

      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setActiveSection('potential')}
          className={`px-4 py-2 rounded ${activeSection === 'potential' ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Potential ({potential.length})
        </button>
        <button
          onClick={() => setActiveSection('inProgress')}
          className={`px-4 py-2 rounded ${activeSection === 'inProgress' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          In Progress ({inProgress.length})
        </button>
        <button
          onClick={() => setActiveSection('archived')}
          className={`px-4 py-2 rounded ${activeSection === 'archived' ? 'bg-gray-500 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Archived ({archived.length})
        </button>
      </div>

      {showTodayTasks && (
        <div className="mb-6 p-4 bg-white border-2 border-blue-300 rounded-lg shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-blue-800">Priority Tasks - Top 10</h3>
            <button
              onClick={() => setShowTodayTasks(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {todayTasks.length === 0 ? (
            <p className="text-gray-600 text-center py-4">No tasks scheduled for the next 15 days!</p>
          ) : (
            <div className="space-y-3">
              {todayTasks.map((task, index) => (
                <div 
                  key={`today-${task.id}`} 
                  className="p-3 rounded-lg border-l-4 border-blue-500 bg-blue-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-lg text-blue-600">#{index + 1}</span>
                      {getPriorityIcon(task.priorityBonus)}
                      <div>
                        <div className="font-semibold text-gray-800">{task.name}</div>
                        <div className="text-sm text-gray-600">
                          Project: {task.projectName}
                        </div>
                        {task.comments && (
                          <div className="text-sm text-gray-500 mt-1">
                            💬 {task.comments}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg text-blue-600">Score: {task.priorityScore.toFixed(1)}</div>
                      <div className="text-sm text-gray-600">
                        {task.isOverdue ? `${Math.abs(task.daysToDeadline)} days overdue` : `${task.daysToDeadline} days remaining`}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
        </div>
      )}

      {showAddTask && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="font-semibold mb-4">Add New Task</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Task Name *</label>
              <input
                type="text"
                placeholder="Enter task name"
                value={newTask.name}
                onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                className="p-2 border border-gray-300 rounded w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Project *</label>
              <select
                value={newTask.project}
                onChange={(e) => setNewTask({ ...newTask, project: e.target.value })}
                className="p-2 border border-gray-300 rounded w-full"
              >
                <option value="">Select Project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Priority Bonus *</label>
              <select
                value={newTask.priorityBonus}
                onChange={(e) => setNewTask({ ...newTask, priorityBonus: parseInt(e.target.value) })}
                className="p-2 border border-gray-300 rounded w-full"
              >
                <option value={3}>High Priority</option>
                <option value={2}>Medium Priority</option>
                <option value={1}>Low Priority</option>
                <option value={0}>No Priority</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Start Date *</label>
              <input
                type="date"
                value={newTask.start}
                onChange={(e) => setNewTask({ ...newTask, start: e.target.value })}
                className="p-2 border border-gray-300 rounded w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date *</label>
              <input
                type="date"
                value={newTask.end}
                onChange={(e) => setNewTask({ ...newTask, end: e.target.value })}
                className="p-2 border border-gray-300 rounded w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={newTask.status}
                onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
                className="p-2 border border-gray-300 rounded w-full"
              >
                <option value="planned">Planned</option>
                <option value="in_progress">In Progress</option>
                <option value="waiting">Waiting</option>
                <option value="delayed">Delayed</option>
                <option value="completed">Completed</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Comments</label>
              <textarea
                placeholder="Enter task comments"
                value={newTask.comments}
                onChange={(e) => setNewTask({ ...newTask, comments: e.target.value })}
                className="p-2 border border-gray-300 rounded w-full"
                rows={2}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleAddTask}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <Save className="w-4 h-4" />
              Save Task
            </button>
            <button
              onClick={() => setShowAddTask(false)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {editingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="font-semibold mb-4">Edit Task</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Task Name</label>
                <input
                  type="text"
                  placeholder="Enter task name"
                  value={editingTask.name}
                  onChange={(e) => setEditingTask({ ...editingTask, name: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <input
                  type="date"
                  value={editingTask.start instanceof Date ? editingTask.start.toISOString().split('T')[0] : editingTask.start}
                  onChange={(e) => setEditingTask({ ...editingTask, start: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Date</label>
                <input
                  type="date"
                  value={editingTask.end instanceof Date ? editingTask.end.toISOString().split('T')[0] : editingTask.end}
                  onChange={(e) => setEditingTask({ ...editingTask, end: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={editingTask.status}
                  onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded"
                >
                  <option value="planned">Planned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="waiting">Waiting</option>
                  <option value="delayed">Delayed</option>
                  <option value="completed">Completed</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Priority Bonus</label>
                <select
                  value={editingTask.priorityBonus !== undefined ? editingTask.priorityBonus : 0}
                  onChange={(e) => setEditingTask({ ...editingTask, priorityBonus: parseInt(e.target.value) })}
                  className="w-full p-2 border border-gray-300 rounded"
                >
                  <option value={3}>High Priority</option>
                  <option value={2}>Medium Priority</option>
                  <option value={1}>Low Priority</option>
                  <option value={0}>No Priority</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Comments</label>
                <textarea
                  placeholder="Enter task comments"
                  value={editingTask.comments}
                  onChange={(e) => setEditingTask({ ...editingTask, comments: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded"
                  rows={2}
                />
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <button
                onClick={handleSaveEditTask}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
              <button
                onClick={handleDeleteTask}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                <X className="w-4 h-4" />
                Eliminate Task
              </button>
              <button
                onClick={() => setEditingTask(null)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddProject && (
        <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <h3 className="font-semibold mb-4">Add New Project</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Project Name *</label>
              <input
                type="text"
                placeholder="Enter project name"
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                className="p-2 border border-gray-300 rounded w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Project Stage *</label>
              <select
                value={newProject.projectStage}
                onChange={(e) => setNewProject({ ...newProject, projectStage: e.target.value })}
                className="p-2 border border-gray-300 rounded w-full"
              >
                {projectStages.map(stage => 
                  <option key={stage} value={stage}>{stage}</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Responsible *</label>
              <select
                value={newProject.responsible}
                onChange={(e) => setNewProject({ ...newProject, responsible: e.target.value })}
                className="p-2 border border-gray-300 rounded w-full"
              >
                <option value="internal">internal</option>
                <option value="outsourced">Outsourced</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Potential Revenue (€) *</label>
              <input
                type="number"
                step="1"
                min="0"
                placeholder="Enter revenue amount"
                value={newProject.potentialRevenue}
                onChange={(e) => setNewProject({ ...newProject, potentialRevenue: parseInt(e.target.value) || 0 })}
                className="p-2 border border-gray-300 rounded w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Price Quotation (€)</label>
              <input
                type="number"
                step="1"
                min="0"
                placeholder="Enter quotation amount"
                value={newProject.priceQuotation || ''}
                onChange={(e) => setNewProject({ ...newProject, priceQuotation: e.target.value ? parseInt(e.target.value) : null })}
                className="p-2 border border-gray-300 rounded w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Price Outsourcing (€)</label>
              <input
                type="number"
                step="1"
                min="0"
                placeholder="Enter outsourcing amount"
                value={newProject.priceOutsourcing || ''}
                onChange={(e) => setNewProject({ ...newProject, priceOutsourcing: e.target.value ? parseInt(e.target.value) : null })}
                className="p-2 border border-gray-300 rounded w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Work Order Generated</label>
              <select
                value={newProject.workOrderGenerated.toString()}
                onChange={(e) => setNewProject({ ...newProject, workOrderGenerated: e.target.value === 'true' })}
                className="p-2 border border-gray-300 rounded w-full"
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Work Order Number</label>
              <input
                type="text"
                placeholder="Enter work order number"
                value={newProject.workOrderNumber}
                onChange={(e) => setNewProject({ ...newProject, workOrderNumber: e.target.value })}
                className="p-2 border border-gray-300 rounded w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Request</label>
              <select
                value={newProject.customizedScriptRequest.toString()}
                onChange={(e) => setNewProject({ ...newProject, customizedScriptRequest: e.target.value === 'true' })}
                className="p-2 border border-gray-300 rounded w-full"
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Request Number</label>
              <input
                type="text"
                placeholder="Enter script number"
                value={newProject.customizedScriptNumber}
                onChange={(e) => setNewProject({ ...newProject, customizedScriptNumber: e.target.value })}
                className="p-2 border border-gray-300 rounded w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Demand Form Generated</label>
              <select
                value={newProject.demandFormGenerated.toString()}
                onChange={(e) => setNewProject({ ...newProject, demandFormGenerated: e.target.value === 'true' })}
                className="p-2 border border-gray-300 rounded w-full"
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Comments</label>
              <textarea
                placeholder="Enter project comments"
                value={newProject.comments}
                onChange={(e) => setNewProject({ ...newProject, comments: e.target.value })}
                className="p-2 border border-gray-300 rounded w-full"
                rows={2}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleAddProject}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              <Save className="w-4 h-4" />
              Save Project
            </button>
            <button
              onClick={() => setShowAddProject(false)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {editingProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-2xl max-h-screen overflow-y-auto">
            <h3 className="font-semibold mb-4 text-lg">Project Details: {editingProject.name}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Project Name</label>
                <input
                  type="text"
                  value={editingProject.name}
                  onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Project Stage</label>
                <select
                  value={editingProject.projectStage}
                  onChange={(e) => setEditingProject({ ...editingProject, projectStage: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded"
                >
                  {projectStages.map(stage => 
                    <option key={stage} value={stage}>{stage}</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Responsible</label>
                <select
                  value={editingProject.responsible}
                  onChange={(e) => setEditingProject({ ...editingProject, responsible: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded"
                >
                  <option value="internal">internal</option>
                  <option value="outsourced">Outsourced</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Potential Revenue (€) *</label>
                <input
                  type="number"
                  value={editingProject.potentialRevenue}
                  onChange={(e) => setEditingProject({ ...editingProject, potentialRevenue: parseInt(e.target.value) || 0 })}
                  className="w-full p-2 border border-gray-300 rounded [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Price Quotation (€)</label>
                <input
                  type="number"
                                  value={editingProject.priceQuotation || ''}
                onChange={(e) => setEditingProject({ ...editingProject, priceQuotation: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full p-2 border border-gray-300 rounded [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Price Outsourcing (€)</label>
                <input
                  type="number"
                                  value={editingProject.priceOutsourcing || ''}
                onChange={(e) => setEditingProject({ ...editingProject, priceOutsourcing: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full p-2 border border-gray-300 rounded [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Work Order Generated</label>
                <select
                                  value={editingProject.workOrderGenerated.toString()}
                onChange={(e) => setEditingProject({ ...editingProject, workOrderGenerated: e.target.value === 'true' })}
                  className="w-full p-2 border border-gray-300 rounded"
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Work Order Number</label>
                <input
                  type="text"
                  value={editingProject.workOrderNumber}
                  onChange={(e) => setEditingProject({ ...editingProject, workOrderNumber: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Request</label>
                <select
                                  value={editingProject.customizedScriptRequest.toString()}
                onChange={(e) => setEditingProject({ ...editingProject, customizedScriptRequest: e.target.value === 'true' })}
                  className="w-full p-2 border border-gray-300 rounded"
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Request Number</label>
                <input
                  type="text"
                  value={editingProject.customizedScriptNumber}
                  onChange={(e) => setEditingProject({ ...editingProject, customizedScriptNumber: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Demand Form Generated</label>
                <select
                                  value={editingProject.demandFormGenerated.toString()}
                onChange={(e) => setEditingProject({ ...editingProject, demandFormGenerated: e.target.value === 'true' })}
                  className="w-full p-2 border border-gray-300 rounded"
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Comments</label>
                <textarea
                  value={editingProject.comments}
                  onChange={(e) => setEditingProject({ ...editingProject, comments: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded"
                  rows={3}
                />
              </div>
            </div>
                         <div className="mt-6 flex gap-2">
               <button
                 onClick={handleSaveEditProject}
                 className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
               >
                 <Save className="w-4 h-4" />
                 Save Changes
               </button>
               <button
                 onClick={handleDeleteProject}
                 className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
               >
                 <X className="w-4 h-4" />
                 Delete Project
               </button>
               <button
                 onClick={() => setEditingProject(null)}
                 className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
               >
                 <X className="w-4 h-4" />
                 Cancel
               </button>
             </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <span className="text-sm">High Priority</span>
        </div>
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-600" />
          <span className="text-sm">Medium Priority</span>
        </div>
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-green-600" />
          <span className="text-sm">Low Priority</span>
        </div>
        <div className="flex items-center gap-2">
          <Circle className="w-4 h-4 text-gray-400" />
          <span className="text-sm">No Priority</span>
        </div>
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-500" />
          <span className="text-sm">internal</span>
        </div>
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-purple-500" />
          <span className="text-sm">Outsourced</span>
        </div>
      </div>

      <div className="gantt-chart-section">
        {activeSection === 'potential' && renderProjectSection(potential, "Potential Projects", "bg-yellow-50")}
        {activeSection === 'inProgress' && renderProjectSection(inProgress, "In Progress Projects", "bg-blue-50")}
        {activeSection === 'archived' && renderProjectSection(archived, "Archived Projects", "bg-gray-50")}
      </div>

      
    </div>
  );
};

export default ProjectGanttChart;