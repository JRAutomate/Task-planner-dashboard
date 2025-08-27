import { Project, Task } from '../types';

// Load projects from JSON file
export const loadProjects = async (): Promise<Project[]> => {
  try {
    const response = await fetch('/data/projects.json');
    if (!response.ok) {
      throw new Error('Failed to load projects');
    }
    const projects = await response.json();
    
    // Convert date strings back to Date objects and ensure all required fields exist
    return projects.map((project: any) => ({
      ...project,
      tasks: project.tasks.map((task: any) => ({
        ...task,
        start: new Date(task.start),
        end: new Date(task.end),
        comments: task.comments || '' // Ensure comments field exists
      }))
    }));
  } catch (error) {
    console.error('Error loading projects:', error);
    return [];
  }
};

// Load additional tasks from JSON file
export const loadAdditionalTasks = async (): Promise<Task[]> => {
  try {
    const response = await fetch('/data/additional-tasks.json');
    if (!response.ok) {
      throw new Error('Failed to load additional tasks');
    }
    const tasks = await response.json();
    
    // Convert date strings back to Date objects and ensure all required fields exist
    return tasks.map((task: any) => ({
      ...task,
      start: new Date(task.start),
      end: new Date(task.end),
      comments: task.comments || '' // Ensure comments field exists
    }));
  } catch (error) {
    console.error('Error loading additional tasks:', error);
    return [];
  }
};

// Save projects to localStorage only (temporary)
export const saveProjects = async (projects: Project[]): Promise<void> => {
  try {
    // Save to localStorage only - no automatic JSON export
    localStorage.setItem('projects', JSON.stringify(projects.map(project => ({
      ...project,
      tasks: project.tasks.map(task => ({
        ...task,
        start: task.start.toISOString().split('T')[0],
        end: task.end.toISOString().split('T')[0]
      }))
    }))));
    
    console.log('Projects saved to localStorage (temporary)');
  } catch (error) {
    console.error('Error saving projects to localStorage:', error);
  }
};

// Save additional tasks to localStorage only (temporary)
export const saveAdditionalTasks = async (tasks: Task[]): Promise<void> => {
  try {
    // Save to localStorage only - no automatic JSON export
    localStorage.setItem('additionalTasks', JSON.stringify(tasks.map(task => ({
      ...task,
      start: task.start.toISOString().split('T')[0],
      end: task.end.toISOString().split('T')[0]
    }))));
    
    console.log('Additional tasks saved to localStorage (temporary)');
  } catch (error) {
    console.error('Error saving additional tasks to localStorage:', error);
  }
};

// Load from localStorage as fallback
export const loadProjectsFromStorage = (): Project[] => {
  try {
    const stored = localStorage.getItem('projects');
    if (stored) {
      const projects = JSON.parse(stored);
      return projects.map((project: any) => ({
        ...project,
        tasks: project.tasks.map((task: any) => ({
          ...task,
          start: new Date(task.start),
          end: new Date(task.end),
          comments: task.comments || '' // Ensure comments field exists
        }))
      }));
    }
  } catch (error) {
    console.error('Error loading from localStorage:', error);
  }
  return [];
};

export const loadAdditionalTasksFromStorage = (): Task[] => {
  try {
    const stored = localStorage.getItem('additionalTasks');
    if (stored) {
      const tasks = JSON.parse(stored);
      return tasks.map((task: any) => ({
        ...task,
        start: new Date(task.start),
        end: new Date(task.end),
        comments: task.comments || '' // Ensure comments field exists
      }));
    }
  } catch (error) {
    console.error('Error loading from localStorage:', error);
  }
  return [];
};

// Manual export function - only when user clicks "Export to JSON"
export const exportCurrentDataToJSON = async (): Promise<void> => {
  try {
    const projects = loadProjectsFromStorage();
    const tasks = loadAdditionalTasksFromStorage();
    
    if (projects.length > 0) {
      await saveJSONFile('projects', projects);
    }
    
    if (tasks.length > 0) {
      await saveJSONFile('additional-tasks', tasks);
    }
    
    console.log('All current data exported to JSON files');
  } catch (error) {
    console.error('Error exporting data to JSON:', error);
  }
};

// Function to save JSON file using file management system
const saveJSONFile = async (filename: string, data: any): Promise<void> => {
  try {
    // Try to use the File System Access API (modern browsers)
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: `${filename}.json`,
          types: [{
            description: 'JSON Files',
            accept: { 'application/json': ['.json'] }
          }]
        });
        
        const writable = await handle.createWritable();
        await writable.write(JSON.stringify(data, null, 2));
        await writable.close();
        
        console.log(`JSON file ${filename} saved successfully to your chosen location`);
        showExportNotification(filename, true);
        return;
        
      } catch (fileError) {
        console.log('File System Access API not available or denied, falling back to download');
      }
    }
    
    // Fallback to download if File System Access API is not available
    downloadJSONFile(filename, data);
    
  } catch (error) {
    console.error('Error saving JSON file:', error);
    // Fallback to download method
    downloadJSONFile(filename, data);
  }
};

// Function to download JSON file for manual replacement (fallback)
const downloadJSONFile = (filename: string, data: any): void => {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log(`Downloaded ${filename}.json - replace the file in your data/ folder and copy to public/data/`);
    
    // Show user-friendly notification
    showExportNotification(filename, false);
    
  } catch (error) {
    console.error('Error downloading JSON file:', error);
  }
};

// Show user notification about JSON export
const showExportNotification = (filename: string, savedToFileSystem: boolean = false): void => {
  // Create a notification element
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #10b981;
    color: white;
    padding: 16px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    max-width: 400px;
  `;
  
  if (savedToFileSystem) {
    // File was saved using file management system
    notification.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 8px;">💾 JSON File Saved</div>
      <div style="font-size: 14px; line-height: 1.4;">
        <strong>${filename}.json</strong> has been saved to your chosen location.<br>
        You can now copy it to your project's <code>data/</code> and <code>public/data/</code> folders.
      </div>
      <button onclick="this.parentElement.remove()" style="
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        padding: 8px 16px;
        border-radius: 4px;
        margin-top: 12px;
        cursor: pointer;
        font-size: 14px;
      ">Got it</button>
    `;
  } else {
    // File was downloaded (fallback)
    notification.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 8px;">📥 JSON Export Complete</div>
      <div style="font-size: 14px; line-height: 1.4;">
        <strong>${filename}.json</strong> has been downloaded.<br>
        Replace the file in your <code>data/</code> folder and copy to <code>public/data/</code>.
      </div>
      <button onclick="this.parentElement.remove()" style="
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        padding: 8px 16px;
        border-radius: 4px;
        margin-top: 12px;
        cursor: pointer;
        font-size: 14px;
      ">Got it</button>
    `;
  }
  
  document.body.appendChild(notification);
  
  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 10000);
};
