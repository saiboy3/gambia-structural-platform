import { Lock, CheckCircle, Send, RotateCcw } from 'lucide-react';
import { useUser } from '../../context/UserContext';
import { useProject } from '../../context/ProjectContext';
import type { SavedDesign } from '../../types/app';
import StatusBadge from './StatusBadge';

interface Props {
  design: SavedDesign;
}

export default function ApprovalPanel({ design }: Props) {
  const { currentUser, users } = useUser();
  const { updateDesignStatus, addRevision } = useProject();

  if (!currentUser) return null;

  const role = currentUser.role;
  const status = design.status;
  const isLocked = status === 'approved';

  const checkerName = design.checkedBy  ? users.find(u => u.id === design.checkedBy)?.name  ?? '—' : null;
  const approverName = design.approvedBy ? users.find(u => u.id === design.approvedBy)?.name ?? '—' : null;

  return (
    <div className="mt-3 border border-slate-200 rounded-xl p-3 space-y-2 bg-slate-50">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-600">Design Status</p>
        <StatusBadge status={status} />
      </div>

      {checkerName && (
        <p className="text-xs text-slate-500">
          Checked by <span className="font-medium text-slate-700">{checkerName}</span>
          {design.checkedAt && ` · ${new Date(design.checkedAt).toLocaleDateString()}`}
        </p>
      )}
      {approverName && (
        <p className="text-xs text-slate-500">
          Approved by <span className="font-medium text-slate-700">{approverName}</span>
          {design.approvedAt && ` · ${new Date(design.approvedAt).toLocaleDateString()}`}
        </p>
      )}

      {isLocked && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 rounded-lg px-2 py-1.5">
          <Lock size={11} /> This design is locked. Create a new revision to make changes.
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 pt-1">
        {/* Junior: submit for checking */}
        {status === 'draft' && (
          <button onClick={() => updateDesignStatus(design.id, 'submitted', currentUser.id)}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors">
            <Send size={11} /> Submit for Check
          </button>
        )}

        {/* Senior/Principal: mark as checked */}
        {status === 'submitted' && (role === 'senior' || role === 'principal') && (
          <button onClick={() => updateDesignStatus(design.id, 'checked', currentUser.id)}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
            <CheckCircle size={11} /> Mark Checked
          </button>
        )}

        {/* Principal: approve */}
        {status === 'checked' && role === 'principal' && (
          <button onClick={() => updateDesignStatus(design.id, 'approved', currentUser.id)}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors">
            <Lock size={11} /> Approve & Lock
          </button>
        )}

        {/* Any role with edit rights: new revision */}
        {isLocked && role !== 'junior' && (
          <button onClick={() => addRevision(design.id, 'Revision issued', currentUser.id)}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors">
            <RotateCcw size={11} /> New Revision
          </button>
        )}

        {/* Return to draft (senior/principal) */}
        {(status === 'submitted' || status === 'checked') && role !== 'junior' && (
          <button onClick={() => updateDesignStatus(design.id, 'draft', currentUser.id)}
            className="text-xs px-2 py-1.5 border border-slate-300 hover:bg-white text-slate-600 rounded-lg transition-colors">
            Return to Draft
          </button>
        )}
      </div>
    </div>
  );
}
