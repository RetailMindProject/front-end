import Modal from "../sessions/Modal";
import CreateAccountForm from "../CreateAccountForm";
import EditAccountForm from "../EditAccountForm";
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
      {mode === 'edit' ? (
        <EditAccountForm
          allowedRoles={allowedRoles}
          onSubmit={onSave}
          initialData={account ?? undefined}
        />
      ) : (
        <CreateAccountForm
          allowedRoles={allowedRoles}
          onSubmit={onSave}
          initialData={account ?? undefined}
        />
      )}
    </Modal>
  );
}

