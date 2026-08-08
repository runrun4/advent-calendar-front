export type AppTab = 'private' | 'event' | 'memories'

type TabNavigationProps = {
  activeTab: AppTab
  onChange: (tab: AppTab) => void
}

const TABS: { id: AppTab; label: string }[] = [
  { id: 'private', label: 'カレンダー' },
  { id: 'event', label: 'イベント' },
  { id: 'memories', label: '思い出' },
]

export function TabNavigation({ activeTab, onChange }: TabNavigationProps) {
  return (
    <nav className="tab-navigation" aria-label="メインタブ">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={
            activeTab === tab.id
              ? 'tab-navigation__item is-active'
              : 'tab-navigation__item'
          }
          aria-current={activeTab === tab.id ? 'page' : undefined}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
