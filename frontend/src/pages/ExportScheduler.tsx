import { useState } from "react";
import { ScheduleForm, ScheduleList } from "../components/ExportScheduler";

export default function ExportScheduler() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Export Scheduler</h1>
          <p className="mt-2 text-stellar-text-secondary">
            Schedule recurring report exports for delivery to email or in-app download.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-stellar-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-stellar-blue/90 transition-colors focus:outline-none focus:ring-2 focus:ring-stellar-blue"
          aria-expanded={showForm}
        >
          {showForm ? "Cancel" : "+ New Schedule"}
        </button>
      </header>

      {showForm && (
        <section
          className="bg-stellar-card border border-stellar-border rounded-lg p-6"
          aria-label="New schedule form"
        >
          <h2 className="text-lg font-semibold text-white mb-5">Create Schedule</h2>
          <ScheduleForm onCreated={() => setShowForm(false)} />
        </section>
      )}

      <section aria-label="Scheduled exports">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-semibold text-white">Scheduled Exports</h2>
        </div>
        <ScheduleList />
      </section>

      {/* Info panel */}
      <section className="bg-stellar-card border border-stellar-border rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-3">How it works</h2>
        <div className="grid sm:grid-cols-3 gap-4 text-sm text-stellar-text-secondary">
          {[
            {
              icon: (
                <svg className="w-5 h-5 text-stellar-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              ),
              title: "Set frequency",
              body: "Choose daily, weekly, or monthly runs. Specify the exact time and timezone.",
            },
            {
              icon: (
                <svg className="w-5 h-5 text-stellar-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              ),
              title: "Choose delivery",
              body: "Send to an email address or keep it available as an in-app download.",
            },
            {
              icon: (
                <svg className="w-5 h-5 text-stellar-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              ),
              title: "Manage jobs",
              body: "Pause, activate, run on demand, or delete any scheduled job at any time.",
            },
          ].map((item) => (
            <div key={item.title} className="flex gap-3">
              <div className="flex-shrink-0 mt-0.5">{item.icon}</div>
              <div>
                <p className="text-white font-medium">{item.title}</p>
                <p className="mt-0.5">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
