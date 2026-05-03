import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Project, SavedDesign, DesignStatus, RevisionLabel, DesignRevision } from '../types/app';
import { getItem, setItem, generateId, KEYS } from '../utils/storage';

const REVISION_ORDER: RevisionLabel[] = ['A','B','C','D','E','F'];

interface ProjectContextType {
  projects: Project[];
  currentProject: Project | null;
  setCurrentProject: (id: string | null) => void;
  createProject: (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Project;
  updateProject: (id: string, data: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  // Designs
  designs: SavedDesign[];
  saveDesign: (data: Omit<SavedDesign, 'id' | 'createdAt' | 'updatedAt'>) => SavedDesign;
  updateDesign: (id: string, data: Partial<SavedDesign>) => void;
  updateDesignStatus: (id: string, status: DesignStatus, userId: string) => void;
  addRevision: (designId: string, note: string, engineerId: string) => void;
  getProjectDesigns: (projectId: string) => SavedDesign[];
}

const ProjectContext = createContext<ProjectContextType | null>(null);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [designs, setDesigns] = useState<SavedDesign[]>([]);
  const [currentProject, _setCurrentProject] = useState<Project | null>(null);

  useEffect(() => {
    setProjects(getItem<Project[]>(KEYS.PROJECTS, []));
    setDesigns(getItem<SavedDesign[]>(KEYS.DESIGNS, []));
  }, []);

  const setCurrentProject = (id: string | null) => {
    if (!id) { _setCurrentProject(null); return; }
    _setCurrentProject(projects.find(p => p.id === id) ?? null);
  };

  const createProject = (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Project => {
    const now = new Date().toISOString();
    const project: Project = { ...data, id: generateId(), createdAt: now, updatedAt: now };
    const next = [...projects, project];
    setProjects(next);
    setItem(KEYS.PROJECTS, next);
    return project;
  };

  const updateProject = (id: string, data: Partial<Project>) => {
    const next = projects.map(p =>
      p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p
    );
    setProjects(next);
    setItem(KEYS.PROJECTS, next);
    if (currentProject?.id === id) _setCurrentProject(next.find(p => p.id === id) ?? null);
  };

  const deleteProject = (id: string) => {
    const next = projects.filter(p => p.id !== id);
    setProjects(next);
    setItem(KEYS.PROJECTS, next);
    const nextDesigns = designs.filter(d => d.projectId !== id);
    setDesigns(nextDesigns);
    setItem(KEYS.DESIGNS, nextDesigns);
    if (currentProject?.id === id) _setCurrentProject(null);
  };

  const saveDesign = (data: Omit<SavedDesign, 'id' | 'createdAt' | 'updatedAt'>): SavedDesign => {
    const now = new Date().toISOString();
    const design: SavedDesign = { ...data, id: generateId(), createdAt: now, updatedAt: now };
    const next = [...designs, design];
    setDesigns(next);
    setItem(KEYS.DESIGNS, next);
    return design;
  };

  const updateDesign = (id: string, data: Partial<SavedDesign>) => {
    const next = designs.map(d =>
      d.id === id ? { ...d, ...data, updatedAt: new Date().toISOString() } : d
    );
    setDesigns(next);
    setItem(KEYS.DESIGNS, next);
  };

  const updateDesignStatus = (id: string, status: DesignStatus, userId: string) => {
    const now = new Date().toISOString();
    const extra: Partial<SavedDesign> =
      status === 'checked'  ? { checkedBy: userId,  checkedAt: now }  :
      status === 'approved' ? { approvedBy: userId, approvedAt: now } : {};
    updateDesign(id, { status, ...extra });
  };

  const addRevision = (designId: string, note: string, engineerId: string) => {
    const design = designs.find(d => d.id === designId);
    if (!design) return;
    const currentIdx = REVISION_ORDER.indexOf(design.currentRevision);
    const nextRevision = REVISION_ORDER[Math.min(currentIdx + 1, REVISION_ORDER.length - 1)];
    const rev: DesignRevision = {
      revision: nextRevision,
      date: new Date().toISOString(),
      engineerId,
      note,
    };
    updateDesign(designId, {
      currentRevision: nextRevision,
      revisions: [...design.revisions, rev],
      status: 'draft', // reset to draft on new revision
      checkedBy: undefined, checkedAt: undefined,
      approvedBy: undefined, approvedAt: undefined,
    });
  };

  const getProjectDesigns = (projectId: string) =>
    designs.filter(d => d.projectId === projectId);

  return (
    <ProjectContext.Provider value={{
      projects, currentProject, setCurrentProject,
      createProject, updateProject, deleteProject,
      designs, saveDesign, updateDesign,
      updateDesignStatus, addRevision, getProjectDesigns,
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be inside ProjectProvider');
  return ctx;
}
