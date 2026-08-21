import { useEffect, useRef, useState } from 'react'
import './AdventCalendar.css'

export const AdventCalendar = () => {
  // 現在解放されている日数
  const unlockedDays = 8

  // 縦6 × 横5のマスを作成
  const cells = Array.from({ length: 30 })

  /*
   * ==========================================
   * タイトル設定
   * ==========================================
   */

  // 標準フォントサイズ
  const DEFAULT_TITLE_FONT_SIZE = 45

  // タイトルの現在のフォントサイズ
  const [titleFontSize, setTitleFontSize] =
    useState(DEFAULT_TITLE_FONT_SIZE)

  // タイトル要素
  const titleRef =
    useRef<HTMLHeadingElement>(null)

  // アドベント枠
  const calendarGridRef =
    useRef<HTMLDivElement>(null)

  /*
   * ==========================================
   * タイトルサイズ自動調整
   * ==========================================
   */

  useEffect(() => {
    const title = titleRef.current
    const calendar = calendarGridRef.current

    if (!title || !calendar) return

    const adjustTitleSize = () => {
      /*
       * --------------------------------------
       * ① アドベント枠の横幅を取得
       * --------------------------------------
       */

      const maxWidth =
        calendar.getBoundingClientRect().width

      /*
       * --------------------------------------
       * ② タイトルの文字列を取得
       * --------------------------------------
       */

      const text = title.textContent ?? ''

      /*
       * --------------------------------------
       * ③ 45pxで表示した場合の
       *    「文字そのものの横幅」を測定
       * --------------------------------------
       */

      const canvas =
        document.createElement('canvas')

      const context =
        canvas.getContext('2d')

      if (!context) return

      /*
       * 現在のタイトルと同じフォントを使用
       */
      const computedStyle =
        window.getComputedStyle(title)

      context.font =
        `${computedStyle.fontWeight} ${DEFAULT_TITLE_FONT_SIZE}px ${computedStyle.fontFamily}`

      const textWidth =
        context.measureText(text).width

      /*
       * --------------------------------------
       * ④ 45pxのままで枠に収まる場合
       * --------------------------------------
       *
       * ★ここが重要
       *
       * 枠を超えない限り必ず45px
       */

      if (textWidth <= maxWidth) {
        setTitleFontSize(
          DEFAULT_TITLE_FONT_SIZE
        )

        return
      }

      /*
       * --------------------------------------
       * ⑤ 枠を超えた場合だけ縮小
       * --------------------------------------
       */

      const calculatedFontSize =
        DEFAULT_TITLE_FONT_SIZE *
        (maxWidth / textWidth)

      /*
       * 少し余裕を持たせる
       */
      const newFontSize =
        calculatedFontSize - 0.5

      /*
       * 最低20px
       */
      setTitleFontSize(
        Math.max(20, newFontSize)
      )
    }

    /*
     * 初回
     */
    adjustTitleSize()

    /*
     * 画面サイズ変更
     */
    window.addEventListener(
      'resize',
      adjustTitleSize
    )

    /*
     * アドベント枠のサイズ変更
     */
    const resizeObserver =
      new ResizeObserver(adjustTitleSize)

    resizeObserver.observe(calendar)

    return () => {
      window.removeEventListener(
        'resize',
        adjustTitleSize
      )

      resizeObserver.disconnect()
    }
  }, [])

  return (
    <div className="advent-calendar">

      {/* =========================
          左上：戻るボタン
          ========================= */}

      <button
        className="
          advent-calendar__icon-button
          advent-calendar__back-button
        "
      >
        <span className="advent-calendar__icon">
          ←
        </span>
      </button>

      {/* =========================
          右上：設定・チャット
          ========================= */}

      <div className="advent-calendar__top-buttons">

        <button className="advent-calendar__icon-button">
          <span className="advent-calendar__icon">
            ⚙
          </span>
        </button>

        <button className="advent-calendar__icon-button">
          <span className="advent-calendar__icon">
            💬
          </span>
        </button>

      </div>

      {/* =========================
          イベント情報
          ========================= */}

      <div className="advent-calendar__event-info">

        {/* 日付 */}
        <p className="advent-calendar__event-date">
          8/30
        </p>

        {/* 題名 */}
        <h1
          ref={titleRef}
          className="advent-calendar__event-title"
          style={{
            fontSize: `${titleFontSize}px`,
          }}
        >
          ライブ
        </h1>

      </div>

      {/* =========================
          アドベントカレンダー
          ========================= */}

      <div
        className="advent-calendar__calendar-wrapper"
      >
        <div
          ref={calendarGridRef}
          className="advent-calendar__grid"
        >

          {cells.map((_, index) => {
            const day = index + 1

            const isUnlocked =
              day <= unlockedDays

            return (
              <div
                className={`advent-calendar__cell ${
                  isUnlocked
                    ? 'advent-calendar__cell--unlocked'
                    : 'advent-calendar__cell--locked'
                }`}
                key={day}
              />
            )
          })}

        </div>

        {/* 解放数 */}
        <div className="advent-calendar__progress">
          {unlockedDays} / {cells.length}
        </div>

      </div>

      {/* =========================
          右下：獲得アイテム一覧
          ========================= */}

      <button
        className="
          advent-calendar__icon-button
          advent-calendar__collection-button
        "
      >
        <span className="advent-calendar__icon">
          🎁
        </span>
      </button>

    </div>
  )
}