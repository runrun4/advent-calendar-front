import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import {
  DEFAULT_EVENT_ICON,
  EVENT_ICON_MAP,
  EVENT_ICON_OPTIONS,
  type EventIconId,
} from './eventIcons'
import changeIcon from '../../assets/change.svg'
import './EventNameField.css'

type EventNameFieldProps = {
  id: string
  value: string
  onChange: (value: string) => void
  iconId: EventIconId
  onIconChange: (iconId: EventIconId) => void
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void
}

export function EventNameField({
  id,
  value,
  onChange,
  iconId,
  onIconChange,
  onKeyDown,
}: EventNameFieldProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const pickerId = useId()
  const SelectedIcon = EVENT_ICON_MAP[iconId] ?? DEFAULT_EVENT_ICON

  useEffect(() => {
    if (!isPickerOpen) return

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node
      if (!rootRef.current?.contains(target)) {
        setIsPickerOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [isPickerOpen])

  return (
    <div className="event-name-field" ref={rootRef}>
      <div className="event-name-field__row">
        <button
          type="button"
          className="event-name-field__icon-button"
          aria-label="イベントアイコンを選ぶ"
          aria-expanded={isPickerOpen}
          aria-controls={pickerId}
          onClick={() => setIsPickerOpen((open) => !open)}
        >
          <SelectedIcon
            className="event-name-field__icon"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <img
            className="event-name-field__change-icon"
            src={changeIcon}
            alt=""
            aria-hidden="true"
          />
        </button>

        <input
          id={id}
          type="text"
          className="event-name-field__input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="イベント名"
          inputMode="text"
          enterKeyHint="done"
        />
      </div>

      {isPickerOpen ? (
        <div
          id={pickerId}
          className="event-name-field__picker"
          role="listbox"
          aria-label={`イベントアイコン（${EVENT_ICON_OPTIONS.length}種類）`}
          onWheel={(event) => event.stopPropagation()}
          onTouchMove={(event) => event.stopPropagation()}
        >
          {EVENT_ICON_OPTIONS.map(({ id: optionId, label, Icon }) => {
            const isSelected = optionId === iconId

            return (
              <button
                key={optionId}
                type="button"
                role="option"
                aria-selected={isSelected}
                aria-label={label}
                className={`event-name-field__picker-option${
                  isSelected
                    ? ' event-name-field__picker-option--selected'
                    : ''
                }`}
                onClick={() => {
                  onIconChange(optionId)
                  setIsPickerOpen(false)
                }}
              >
                <Icon
                  className="event-name-field__picker-icon"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
