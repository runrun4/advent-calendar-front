import { useState } from 'react'
import { Modal } from '../../components/common/Modal'
import './EventAddModal.css'

type EventType = 'public' | 'private'

type EventAddModalProps = {
  isOpen: boolean
  onClose: () => void
}

const MIN_COUNTDOWN_DAYS = 0
const MAX_COUNTDOWN_DAYS = 30

export function EventAddModal({ isOpen, onClose }: EventAddModalProps) {
  const [eventType, setEventType] = useState<EventType>('public')

  // パブリックイベント
  const [publicEventName, setPublicEventName] = useState('')
  const [publicEventStartDate, setPublicEventStartDate] = useState('')
  const [publicEventEndDate, setPublicEventEndDate] = useState('')
  const [publicEventLocation, setPublicEventLocation] = useState('')
  const [publicCountdownDays, setPublicCountdownDays] = useState(15)

  // プライベートイベント
  const [privateEventName, setPrivateEventName] = useState('')
  const [privateEventStartDate, setPrivateEventStartDate] = useState('')
  const [privateEventEndDate, setPrivateEventEndDate] = useState('')
  const [privateEventLocation, setPrivateEventLocation] = useState('')
  const [privateCountdownDays, setPrivateCountdownDays] = useState(15)

  const [countdownTouchStartX, setCountdownTouchStartX] = useState<
    number | null
  >(null)

  const currentCountdownDays =
    eventType === 'public' ? publicCountdownDays : privateCountdownDays

  const setCurrentCountdownDays = (value: number) => {
    if (eventType === 'public') {
      setPublicCountdownDays(value)
    } else {
      setPrivateCountdownDays(value)
    }
  }

  const handleCountdownTouchStart = (
    event: React.TouchEvent<HTMLDivElement>,
  ) => {
    setCountdownTouchStartX(event.touches[0].clientX)
  }

  const handleCountdownTouchEnd = (
    event: React.TouchEvent<HTMLDivElement>,
  ) => {
    if (countdownTouchStartX === null) {
      return
    }

    const touchEndX = event.changedTouches[0].clientX
    const difference = touchEndX - countdownTouchStartX

    if (Math.abs(difference) < 30) {
      setCountdownTouchStartX(null)
      return
    }

    if (difference > 0) {
      setCurrentCountdownDays(
        Math.max(MIN_COUNTDOWN_DAYS, currentCountdownDays - 1),
      )
    } else {
      setCurrentCountdownDays(
        Math.min(MAX_COUNTDOWN_DAYS, currentCountdownDays + 1),
      )
    }

    setCountdownTouchStartX(null)
  }

  const countdownNumbers = []

  for (
    let day = currentCountdownDays - 3;
    day <= currentCountdownDays + 3;
    day += 1
  ) {
    if (day >= MIN_COUNTDOWN_DAYS && day <= MAX_COUNTDOWN_DAYS) {
      countdownNumbers.push(day)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      title="イベント追加"
      onClose={onClose}
      variant="sheet"
    >
      <div className="event-add-modal">
        {/* イベント種類選択 */}
        <div className="event-add-modal__type-selector">
          <button
            type="button"
            className={`event-add-modal__type-button ${
              eventType === 'public'
                ? 'event-add-modal__type-button--selected'
                : ''
            }`}
            onClick={() => setEventType('public')}
          >
            パブリックイベント
          </button>

          <button
            type="button"
            className={`event-add-modal__type-button ${
              eventType === 'private'
                ? 'event-add-modal__type-button--selected'
                : ''
            }`}
            onClick={() => setEventType('private')}
          >
            プライベート
          </button>
        </div>

        {/* 選択したイベント種類に応じた内容 */}
        <div className="event-add-modal__content">
          {eventType === 'public' ? (
            <div className="event-add-modal__questionnaire">
              {/* イベント名 */}
              <div className="event-add-modal__question">
                <input
                  id="public-event-name"
                  type="text"
                  className="event-add-modal__input"
                  value={publicEventName}
                  onChange={(e) => setPublicEventName(e.target.value)}
                  placeholder="イベント名(最大10文字)"
                  maxLength={10}
                />
              </div>

              {/* 日付 */}
              <div className="event-add-modal__question">
                <label className="event-add-modal__label">
                  日付
                </label>

                <div className="event-add-modal__date-inputs">
                  <input
                    id="public-event-start-date"
                    type="date"
                    className="event-add-modal__input"
                    value={publicEventStartDate}
                    onChange={(e) =>
                      setPublicEventStartDate(e.target.value)
                    }
                    aria-label="開始日"
                  />

                  <input
                    id="public-event-end-date"
                    type="date"
                    className="event-add-modal__input"
                    value={publicEventEndDate}
                    onChange={(e) =>
                      setPublicEventEndDate(e.target.value)
                    }
                    aria-label="終了日"
                  />
                </div>

                <p className="event-add-modal__date-note">
                  ※一日の場合は開始日のみを入力してください
                </p>
              </div>

              {/* 場所 */}
              <div className="event-add-modal__question">
                <label
                  htmlFor="public-event-location"
                  className="event-add-modal__label"
                >
                  場所
                </label>

                <input
                  id="public-event-location"
                  type="text"
                  className="event-add-modal__input"
                  value={publicEventLocation}
                  onChange={(e) => setPublicEventLocation(e.target.value)}
                  placeholder="会場名などを入力"
                />
              </div>

              {/* カウントダウン開始日 */}
              <div className="event-add-modal__question">
                <p className="event-add-modal__countdown-label">
                  ＞何日前からカウントダウン
                  <br />
                  &nbsp;&nbsp;を開始しますか？
                </p>

                <div
                  className="event-add-modal__countdown-picker"
                  onTouchStart={handleCountdownTouchStart}
                  onTouchEnd={handleCountdownTouchEnd}
                >
                  <div className="event-add-modal__countdown-list">
                    {countdownNumbers.map((day) => {
                      const distance = Math.abs(
                        day - currentCountdownDays,
                      )

                      return (
                        <div
                          key={day}
                          className={`event-add-modal__countdown-item ${
                            day === currentCountdownDays
                              ? 'event-add-modal__countdown-item--selected'
                              : ''
                          }`}
                          style={{
                            opacity:
                              distance === 0
                                ? 1
                                : distance === 1
                                  ? 0.7
                                  : distance === 2
                                    ? 0.4
                                    : 0.2,
                          }}
                        >
                          {day}
                        </div>
                      )
                    })}
                  </div>
                </div>

                <span className="event-add-modal__unit">
                  日前
                </span>
              </div>

              {/* 検索ボタン */}
              <button
                type="button"
                className="event-add-modal__submit-button"
              >
                検索する
              </button>
            </div>
          ) : (
            <div className="event-add-modal__questionnaire">
              {/* イベント名 */}
              <div className="event-add-modal__question">
                <input
                  id="private-event-name"
                  type="text"
                  className="event-add-modal__input"
                  value={privateEventName}
                  onChange={(e) => setPrivateEventName(e.target.value)}
                  placeholder="イベント名(最大10文字)"
                  maxLength={10}
                />
              </div>

              {/* 日付 */}
              <div className="event-add-modal__question">
                <label className="event-add-modal__label">
                  日付
                </label>

                <div className="event-add-modal__date-inputs">
                  <input
                    id="private-event-start-date"
                    type="date"
                    className="event-add-modal__input"
                    value={privateEventStartDate}
                    onChange={(e) =>
                      setPrivateEventStartDate(e.target.value)
                    }
                    aria-label="開始日"
                  />

                  <input
                    id="private-event-end-date"
                    type="date"
                    className="event-add-modal__input"
                    value={privateEventEndDate}
                    onChange={(e) =>
                      setPrivateEventEndDate(e.target.value)
                    }
                    aria-label="終了日"
                  />
                </div>

                <p className="event-add-modal__date-note">
                  ※一日の場合は開始日のみを入力してください
                </p>
              </div>

              {/* 場所 */}
              <div className="event-add-modal__question">
                <label
                  htmlFor="private-event-location"
                  className="event-add-modal__label"
                >
                  場所
                </label>

                <input
                  id="private-event-location"
                  type="text"
                  className="event-add-modal__input"
                  value={privateEventLocation}
                  onChange={(e) => setPrivateEventLocation(e.target.value)}
                  placeholder="会場名などを入力"
                />
              </div>

              {/* カウントダウン開始日 */}
              <div className="event-add-modal__question">
                <p className="event-add-modal__countdown-label">
                  ＞何日前からカウントダウン
                  <br />
                  &nbsp;&nbsp;を開始しますか？
                </p>

                <div
                  className="event-add-modal__countdown-picker"
                  onTouchStart={handleCountdownTouchStart}
                  onTouchEnd={handleCountdownTouchEnd}
                >
                  <div className="event-add-modal__countdown-list">
                    {countdownNumbers.map((day) => {
                      const distance = Math.abs(
                        day - currentCountdownDays,
                      )

                      return (
                        <div
                          key={day}
                          className={`event-add-modal__countdown-item ${
                            day === currentCountdownDays
                              ? 'event-add-modal__countdown-item--selected'
                              : ''
                          }`}
                          style={{
                            opacity:
                              distance === 0
                                ? 1
                                : distance === 1
                                  ? 0.7
                                  : distance === 2
                                    ? 0.4
                                    : 0.2,
                          }}
                        >
                          {day}
                        </div>
                      )
                    })}
                  </div>
                </div>

                <span className="event-add-modal__unit">
                  日前
                </span>
              </div>

              {/* 次に進むボタン */}
              <button
                type="button"
                className="event-add-modal__submit-button"
              >
                次に進む
              </button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}