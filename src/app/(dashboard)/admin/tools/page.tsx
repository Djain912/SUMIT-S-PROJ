import { AdminToolsClient } from '@/components/admin/admin-tools-client';

export default function AdminToolsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">Practice Tools</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
          Interactive indicator calculators (price chart + indicator + step-by-step table). Open them, or copy a link to drop into any note.
        </p>
      </div>
      <AdminToolsClient />
    </div>
  );
}
