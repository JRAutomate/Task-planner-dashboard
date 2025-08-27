# Project Management Dashboard

A comprehensive, React-based project management tool designed for businesses that need to track complex projects with multiple stages, tasks, and team members. This dashboard provides visual project tracking, intelligent task prioritization, and comprehensive reporting capabilities.

## 🎯 Purpose & Why It's Needed

Modern businesses face increasing complexity in project management:
- **Multiple project stages** that need clear tracking and progression
- **Task dependencies** that require intelligent prioritization
- **Revenue tracking** and project profitability monitoring
- **Deadline management** with automated priority scoring

Traditional project management tools often lack the specific workflow customization and priority algorithms needed for specialized business processes. This dashboard fills that gap by providing:

- **Customizable project stages** that match your exact business workflow
- **Intelligent task prioritization** based on deadlines, duration, and business rules
- **Real-time Gantt chart visualization** for project timeline management
- **Comprehensive data export** for reporting and analysis
- **Local data persistence** with backup and recovery capabilities

## ✨ Key Features

### 🚀 Project Management
- **Multi-stage project tracking** with customizable workflow stages:
  - Planning → Design → Development → Testing → Deployment → Complete
- **Revenue and cost monitoring** (quotations, outsourcing costs, work orders)
- **Responsible party assignment** (internal teams vs. outsourced)
- **Project lifecycle management** from potential to completion
- **Project deletion** with confirmation and associated task cleanup
- **Automatic ID generation** starting from 1 for new projects

### 📋 Task Management
- **Intelligent priority scoring** algorithm based on deadlines and business rules
- **Task status tracking** (planned, in progress, waiting, delayed, completed, closed)
- **Priority bonus system** for critical tasks requiring immediate attention
- **Comment and documentation** support for task details
- **Task editing and deletion** with project association tracking

### 📊 Visual Dashboard
- **Interactive Gantt chart** with timeline visualization
- **Project categorization** (Potential, In Progress, Archived)
- **Priority task overview** showing top 10 critical tasks
- **Responsive design** with modern UI components
- **Custom company logo integration** in the top-left corner
- **Professional color-coded status indicators**

### 💾 Data Management
- **Local storage persistence** for offline work
- **JSON export/import** for data backup and sharing
- **PDF report generation** for stakeholder presentations
- **Data integrity protection** with unsaved changes warnings
- **Enhanced export functionality** that captures current localStorage state
- **Automatic data validation** and error handling

### 🎨 User Experience
- **Modern, responsive interface** built with Tailwind CSS
- **Intuitive navigation** between project sections
- **Real-time updates** and live data synchronization
- **Professional styling** suitable for business environments
- **Streamlined button layout** with essential functions only
- **Improved form labels** for better clarity (e.g., "Request" instead of "Customized Script Request")

## 🛠️ Technology Stack

- **Frontend**: React 19 with TypeScript
- **Styling**: Tailwind CSS for responsive design
- **Icons**: Lucide React for consistent iconography
- **PDF Generation**: html2pdf.js for report export
- **Data Persistence**: LocalStorage with JSON backup
- **Build Tool**: Create React App with optimized production builds

## 🚀 Getting Started

### Prerequisites
- Node.js (version 16 or higher)
- npm

### Installation
1. Clone or download the project files
2. Navigate to the project directory
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm start
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production
```bash
npm run build
```
The production build will be created in the `build/` folder, ready for deployment.

## 📁 Project Structure

```
src/
├── App.tsx                 # Main application wrapper
├── ProjectManagerTool.tsx  # Core dashboard component
├── types/
│   └── index.ts           # TypeScript interfaces
├── services/
│   └── dataService.ts     # Data handling and persistence
└── App.css                # Application styles

data/                      # Sample data files
├── projects.json
└── additional-tasks.json

public/
├── data/                  # Public data access
└── logo(2).png           # Company logo file
```

## 🔧 Customization

The application is designed for easy customization of business-specific elements:

- **Project Stages**: Modified workflow stages: Planning, Design, Development, Testing, Deployment, Complete
- **Responsible Parties**: Updated labels (internal vs. outsourced)
- **Currency**: Change to your local currency symbol
- **UI Labels**: Simplified labels for better user experience
- **Company Logo**: Easy integration of your company logo in the top-left corner

### Logo Integration
To add your company logo:
1. Place your logo file in the `public/` folder
2. Update the `src` attribute in `ProjectManagerTool.tsx` (around line 500)
3. Adjust the size using Tailwind classes (currently `w-32 h-32`)

## 📊 Data Management

### Adding Projects
1. Click "Add New Project" button
2. Fill in project details (name, stage, responsible party, revenue)
3. Configure additional options (work orders, scripts, demand forms)
4. Save to add to your project portfolio
5. **New projects automatically get sequential IDs starting from 1**

### Managing Tasks
1. Click "Add New Task" button
2. Select the associated project
3. Set start/end dates and priority level
4. Add comments and status information
5. Tasks automatically appear in the Gantt chart

### Project Management
- **Edit Projects**: Click the eye icon (👁️) to view and edit project details
- **Delete Projects**: Use the "Delete Project" button in the project details modal
- **Project Stages**: Move projects between stages to track progress
- **Responsible Parties**: Assign projects to internal teams or outsourced vendors

### Priority System
The dashboard uses an intelligent algorithm to calculate task priority:
- **High Priority (3)**: Critical tasks requiring immediate attention
- **Medium Priority (2)**: Important tasks with moderate urgency
- **Low Priority (1)**: Standard tasks with normal scheduling
- **No Priority (0)**: Routine tasks with flexible timing

## 📈 Business Benefits

- **Improved Project Visibility**: Clear overview of all projects and their status
- **Better Resource Allocation**: Identify critical tasks and allocate resources accordingly
- **Enhanced Communication**: Visual project timelines for stakeholder presentations
- **Data-Driven Decisions**: Priority scoring helps focus on high-impact activities
- **Professional Reporting**: PDF exports for client and management presentations
- **Offline Capability**: Work without internet connection with local data storage
- **Streamlined Workflow**: Simplified project stages for better project progression tracking
- **Enhanced Data Integrity**: Improved ID generation and data validation

## 🔒 Data Security

- **Local Storage**: All data is stored locally on your device
- **No Cloud Dependencies**: Your project information stays private
- **Export Control**: You control when and how data is shared
- **Backup Capability**: JSON export for data backup and recovery
- **Data Validation**: Enhanced error handling and data integrity checks

## 🚀 Deployment Options

### Local Development
- Run `npm start` for development with hot reloading
- Perfect for testing and customization

### Production Build
- Run `npm run build` for optimized production files
- Deploy the `build/` folder to any web server

### Static Hosting
- Compatible with GitHub Pages, Netlify, Vercel, and other static hosts
- No server-side requirements

## 🆕 Recent Updates & Improvements

### Enhanced Project Management
- **Simplified Project Stages**: Streamlined workflow from 12 stages to 6 essential stages
- **Improved Labels**: Better terminology for user understanding
- **Delete Project Functionality**: Safe project deletion with confirmation dialogs
- **Automatic ID Management**: Robust ID generation starting from 1

### Better User Experience
- **Custom Logo Integration**: Company branding in the top-left corner
- **Streamlined Interface**: Removed unnecessary buttons for cleaner UI
- **Enhanced Data Export**: Improved JSON export functionality
- **Better Error Handling**: Comprehensive logging and validation

### Data Integrity
- **Enhanced Export**: Export function now captures current localStorage state
- **Improved Validation**: Better handling of edge cases and data validation
- **Automatic Cleanup**: Proper cleanup when deleting projects and tasks

## 🤝 Contributing

This application is designed for business use and can be customized for specific organizational needs. The modular structure makes it easy to:

- Add new project stages
- Modify priority algorithms
- Extend data models
- Customize UI components
- Integrate company branding

## 📄 License

This project is designed for business use and can be customized and deployed according to your organization's needs.

## 🆘 Support

For customization assistance or feature requests, refer to the code structure and TypeScript interfaces. The application is built with modern React patterns and follows best practices for maintainability and extensibility.

---

**Built with React, TypeScript, and Tailwind CSS for modern, responsive project management.**
