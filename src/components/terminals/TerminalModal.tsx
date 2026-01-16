import Modal from "../sessions/Modal";
import TerminalForm from "./TerminalForm";
import type { TerminalManagementResponse, CreateTerminalRequest, UpdateTerminalRequest } from "../../services/terminal.api";

interface TerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateTerminalRequest | UpdateTerminalRequest) => Promise<void>;
  mode: 'create' | 'edit';
  terminal?: TerminalManagementResponse | null;
}

export default function TerminalModal({
  isOpen,
  onClose,
  onSave,
  mode,
  terminal,
}: TerminalModalProps) {
  if (!isOpen) return null;

  return (
    <Modal onClose={onClose} title={mode === 'create' ? 'Add New Terminal' : 'Edit Terminal'}>
      <TerminalForm
        mode={mode}
        onSubmit={onSave}
        initialData={terminal ?? undefined}
        onClose={onClose}
      />
    </Modal>
  );
}

