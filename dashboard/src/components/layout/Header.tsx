import Badge from '@/components/shared/Badge';

interface HeaderProps {
  title: string;
  projectName?: string;
  phase?: string;
  status?: string;
}

export default function Header({ title, projectName, phase, status }: HeaderProps) {
  return (
    <header className="h-14 border-b border-gywd-border bg-gywd-surface px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-gywd-text">{title}</h2>
        {projectName && (
          <span className="text-sm text-gywd-muted">{projectName}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {phase && <Badge label={phase} variant="blue" />}
        {status && (
          <Badge
            label={status}
            variant={status === 'Complete' ? 'green' : status === 'Not Started' ? 'muted' : 'amber'}
          />
        )}
      </div>
    </header>
  );
}
