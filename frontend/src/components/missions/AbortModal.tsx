import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { AlertOctagon, AlertTriangle } from 'lucide-react';

interface AbortModalProps {
  missionId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (missionId: string) => Promise<void>;
}

export const AbortModal: React.FC<AbortModalProps> = ({
  missionId,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!missionId) return null;

  const handleAbort = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(missionId);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Mission Abort Signal"
      subtitle="Critical flight safety intervention"
    >
      <div className="space-y-4">
        <div className="p-3.5 rounded-lg bg-rose-950/60 border border-rose-800/70 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-200 leading-relaxed">
            Sending an abort signal will command Temporal workflow{' '}
            <strong className="font-mono">{missionId}</strong> to cease waypoint progression. The
            assigned drone will initiate an emergency hover or immediate controlled return to base.
          </div>
        </div>

        <p className="text-xs text-slate-400">
          Are you sure you want to abort this autonomous mission? This action cannot be undone.
        </p>

        <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleAbort}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-md transition-colors disabled:opacity-50"
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Signaling Abort...' : 'Confirm Abort'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
