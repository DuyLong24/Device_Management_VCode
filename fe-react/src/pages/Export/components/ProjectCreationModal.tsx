import { SharedDataCreationModal } from '../../../components/shared/SharedDataCreationModal';

interface ProjectCreationModalProps {
    open: boolean;
    onCancel: () => void;
    initialName?: string;
    onSuccess: (code: string, name: string) => void;
}


export const ProjectCreationModal = ({ open, onCancel, initialName, onSuccess }: ProjectCreationModalProps) => (
    <SharedDataCreationModal
        open={open}
        onCancel={onCancel}
        initialName={initialName}
        groupCode="PROJECT"
        title="Tạo Dự án Mới"
        onSuccess={onSuccess}
    />
);
