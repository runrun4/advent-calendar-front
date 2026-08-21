import { useState } from 'react'
import './PublicEventRequestPage.css'

export function PublicEventRequestPage() {
  const [detail, setDetail] = useState('')
  const [eventUrl, setEventUrl] = useState('')
  const [eventUrl2, setEventUrl2] = useState('')

  return (
    <div className="public-event-request">
      {/* パブリックイベント表示 */}
      <div className="public-event-request__type">
        パブリックイベント
      </div>

      {/* メッセージ */}
      <p className="public-event-request__message">
        ＞イベントが見つかりません；；
        <br />
        &nbsp;&nbsp;そのイベントについて
        <br />
        &nbsp;&nbsp;教えてくれますか？
      </p>

      {/* 詳細 */}
      <section className="public-event-request__section">
        <h2 className="public-event-request__heading">
          詳細を書く
        </h2>

        <textarea
          className="public-event-request__textarea"
          value={detail}
          onChange={(event) =>
            setDetail(event.target.value)
          }
          placeholder="例)東京ドームで〇月〇日にある、○○というアーティストのライブです。ライブの名前は○○ツアーFinalです。"
          enterKeyHint="done"
        />
      </section>

      {/* イベントURL */}
      <section className="public-event-request__section public-event-request__section--url">
        <h2 className="public-event-request__heading">
          イベントのURL(任意)
        </h2>

        <div className="public-event-request__url-inputs">
          {/* URL入力欄 1 */}
          <input
            type="url"
            className="public-event-request__input"
            value={eventUrl}
            onChange={(event) =>
              setEventUrl(event.target.value)
            }
            inputMode="url"
            enterKeyHint="done"
          />

          {/* URL入力欄 2 */}
          <input
            type="url"
            className="public-event-request__input"
            value={eventUrl2}
            onChange={(event) =>
              setEventUrl2(event.target.value)
            }
            inputMode="url"
            enterKeyHint="done"
          />
        </div>
      </section>
    </div>
  )
}