import type { Tab } from './types'
import { tabs } from './types'

export function PageTabs({ activeTab, onChange }: { activeTab: Tab; onChange: (tab: Tab) => void }) {
  return (
    <nav className="flex gap-2 overflow-x-auto border-b border-slate-200">
      {tabs.map((tab) => {
        const Icon = tab.icon
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`inline-flex h-11 min-w-fit items-center gap-2 border-b-2 px-3 text-sm font-semibold ${
              activeTab === tab.id
                ? 'border-teal-700 text-teal-800'
                : 'border-transparent text-slate-600'
            }`}
          >
            <Icon size={16} />
            {tab.label}
          </button>
        )
      })}
    </nav>
  )
}
