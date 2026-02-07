interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export default function Card({ title, children, className = '' }: CardProps) {
  return (
    <div className={`bg-gywd-surface border border-gywd-border rounded-lg ${className}`}>
      {title && (
        <div className="px-4 py-3 border-b border-gywd-border">
          <h3 className="text-sm font-medium text-gywd-muted">{title}</h3>
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}
