export default function SettingsPage({ profile }) {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold">Settings</h2>
      <div className="mt-6 grid max-w-3xl gap-4">
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Signed in as</p>
          <p className="font-semibold">{profile.email}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Role</p>
          <p className="font-semibold capitalize">{profile.role}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Retrieval policy</p>
          <p className="text-sm text-slate-700">Top 6 chunks, visibility filtered by role, fallback message when no strong source is found.</p>
        </div>
      </div>
    </div>
  );
}
