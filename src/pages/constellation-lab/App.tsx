import { ConstellationCalendar } from './components/ConstellationCalendar'

export const App = () => {
  return (
    <ConstellationCalendar
      title="きなこの誕生日"
      onBack={() => {
        // プロトなので戻る先はなし
      }}
    />
  )
}
