export function ApiNotice({ loading, error }: { loading: boolean; error: string | null }) {
  if (loading) return <div className="api-state loading" role="status"><span className="loading-dots" />กำลังโหลดข้อมูล</div>;
  if (error) return <div className="api-state" role="alert">โหลดข้อมูลไม่สำเร็จ: {error}</div>;
  return null;
}
