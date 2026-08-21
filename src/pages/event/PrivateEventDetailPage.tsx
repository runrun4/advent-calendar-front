import { useState } from 'react'
import './PrivateEventDetailPage.css'

type PrivateEventDetailPageProps = {
  onCreate?: () => void
}

export function PrivateEventDetailPage({
  onCreate,
}: PrivateEventDetailPageProps) {
  const [detail, setDetail] = useState('')
  const [eventUrl, setEventUrl] = useState('')
  const [eventUrl2, setEventUrl2] = useState('')

  return (
    <div className="private-event-detail">
      <p className="private-event-detail__message">
        ＞そのイベントについて、もっと詳しく
        <br />
        &nbsp;&nbsp;教えてくれますか？
      </p>

      <section className="private-event-detail__section">
        <h2 className="private-event-detail__heading">
          詳細を書く
        </h2>

        <textarea
          className="private-event-detail__textarea"
          value={detail}
          onChange={(event) => setDetail(event.target.value)}
          placeholder="例）〇〇ちゃんと〇〇くんと、梅田に遊びに行きます。〇〇というカフェに行きます。"
          enterKeyHint="done"
        />
      </section>

      <section className="private-event-detail__section private-event-detail__section--url">
        <h2 className="private-event-detail__heading">
          イベントのURL（任意）
        </h2>

        <div className="private-event-detail__url-inputs">
          <input
            type="url"
            className="private-event-detail__input"
            value={eventUrl}
            onChange={(event) =>
              setEventUrl(event.target.value)
            }
            inputMode="url"
            enterKeyHint="done"
            aria-label="イベントのURL 1"
          />

          <input
            type="url"
            className="private-event-detail__input"
            value={eventUrl2}
            onChange={(event) =>
              setEventUrl2(event.target.value)
            }
            inputMode="url"
            enterKeyHint="done"
            aria-label="イベントのURL 2"
          />
        </div>
      </section>

      <button
        type="button"
        className="private-event-detail__submit"
        onClick={onCreate}
      >
        作成する
      </button>
    </div>
  )
}
