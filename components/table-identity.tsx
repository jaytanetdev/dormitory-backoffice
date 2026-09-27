type Props = {
  label: string;
  description?: string;
  badge: string;
  avatar?: boolean;
};

export function TableIdentity({
  label,
  description,
  badge,
  avatar = false,
}: Props) {
  return (
    <div className="table-identity">
      <span
        className={"table-identity-badge " + (avatar ? "avatar" : "room")}
        aria-hidden={avatar || undefined}
      >
        {badge}
      </span>
      <div>
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </div>
    </div>
  );
}
