import Modal from "../sessions/Modal";
import CreateAccountForm from "../CreateAccountForm";
import type { UserRole, UserAccount } from "../../types/user";

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  mode: 'create' | 'edit';
  account?: UserAccount | null;
  allowedRoles: UserRole[];
}

export default function AccountModal({
  isOpen,
  onClose,
  onSave,
  mode,
  account,
  allowedRoles,
}: AccountModalProps) {
  if (!isOpen) return null;

  return (
    <Modal onClose={onClose} title={mode === 'create' ? 'Add New Account' : 'Edit Account'}>
      <CreateAccountForm
        allowedRoles={allowedRoles}
        onSubmit={onSave}
        initialData={account ?? undefined}
      />
    </Modal>
  );
}

