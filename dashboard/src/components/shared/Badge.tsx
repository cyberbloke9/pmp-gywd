interface BadgeProps {
  label: string;
  variant?: 'blue' | 'green' | 'amber' | 'red' | 'muted' | 'purple';
}

const variantMap = {
  blue: 'bg-gywd-blue/10 text-gywd-blue',
  green: 'bg-gywd-green/10 text-gywd-green',
  amber: 'bg-gywd-amber/10 text-gywd-amber',
  red: 'bg-gywd-red/10 text-gywd-red',
  muted: 'bg-gywd-border text-gywd-muted',
  purple: 'bg-gywd-purple/10 text-gywd-purple',
};

export default function Badge({ label, variant = 'muted' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${variantMap[variant]}`}>
      {label}
    </span>
  );
}
