import { useEffect, useRef, useState } from 'react'
import './AdventCalendar.css'

export const AdventCalendar = () => {
  const unlockedDays = 8
  const cells = Array.from({ length: 30 })

  const EVENT_NAME = 'ライブ'
  const EVENT_NAME_MAX_LENGTH = 10
  const TITLE_SHRINK_MIN_LENGTH = 8

  const eventTitle = [...EVENT_NAME]
    .slice(0, EVENT_NAME_MAX_LENGTH)
    .join('')

  const [titleFontSize, setTitleFontSize] =
    useState<number | null>(null)

  const titleRef =
    useRef<HTMLHeadingElement>(null)

  const calendarGridRef =
    useRef<HTMLDivElement>(null)

  useEffect(() => {
    const title = titleRef.current
    const calendar = calendarGridRef.current

    if (!title || !calendar) return

    const getDefaultFontSize = () => {
      const previous = title.style.fontSize
      title.style.fontSize = ''
      const size = parseFloat(
        window.getComputedStyle(title).fontSize
      )
      title.style.fontSize = previous
      return size
    }

    const measureTextWidth = (text: string, fontSize: number) => {
      const computedStyle = window.getComputedStyle(title)
      const probe = document.createElement('span')

      probe.textContent = text
      probe.style.cssText = [
        'position:absolute',
        'visibility:hidden',
        'white-space:nowrap',
        `font-weight:${computedStyle.fontWeight}`,
        `font-size:${fontSize}px`,
        `font-family:${computedStyle.fontFamily}`,
        `letter-spacing:${computedStyle.letterSpacing}`,
      ].join(';')

      document.body.appendChild(probe)
      const width = probe.getBoundingClientRect().width
      probe.remove()

      return width
    }

    const adjustTitleSize = () => {
      const maxWidth = calendar.getBoundingClientRect().width
      const charCount = [...eventTitle].length
      const defaultFontSize = getDefaultFontSize()

      if (charCount < TITLE_SHRINK_MIN_LENGTH) {
        setTitleFontSize(null)
        return
      }

      const textWidth = measureTextWidth(eventTitle, defaultFontSize)

      if (textWidth <= maxWidth) {
        setTitleFontSize(null)
        return
      }

      setTitleFontSize(
        Math.max(20, defaultFontSize * (maxWidth / textWidth))
      )
    }

    let cancelled = false
    const fontsReady = document.fonts?.ready ?? Promise.resolve()

    const start = async () => {
      await fontsReady
      if (cancelled) return
      adjustTitleSize()
    }

    void start()

    window.addEventListener('resize', adjustTitleSize)

    const resizeObserver = new ResizeObserver(adjustTitleSize)
    resizeObserver.observe(calendar)

    return () => {
      cancelled = true
      window.removeEventListener('resize', adjustTitleSize)
      resizeObserver.disconnect()
    }
  }, [eventTitle])

  return (
    <div className="advent-calendar">
      <button
        className="advent-calendar__icon-button advent-calendar__back-button"
        type="button"
      >
        <span className="advent-calendar__icon">←</span>
      </button>

      <div className="advent-calendar__top-buttons">
        <button className="advent-calendar__icon-button" type="button">
          <span className="advent-calendar__icon">⚙</span>
        </button>
        <button className="advent-calendar__icon-button" type="button">
          <span className="advent-calendar__icon">💬</span>
        </button>
      </div>

      <div className="advent-calendar__event-info">
        <p className="advent-calendar__event-date">8/30</p>
        <h1
          ref={titleRef}
          className="advent-calendar__event-title"
          style={
            titleFontSize != null
              ? { fontSize: `${titleFontSize}px` }
              : undefined
          }
        >
          {eventTitle}
        </h1>
      </div>

      <div className="advent-calendar__calendar-area">
        <div className="advent-calendar__calendar-wrapper">
          <div ref={calendarGridRef} className="advent-calendar__grid">
            {cells.map((_, index) => {
              const day = index + 1
              const isUnlocked = day <= unlockedDays

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

          <div className="advent-calendar__progress">
            {unlockedDays} / {cells.length}
          </div>
        </div>
      </div>

      <button
        className="advent-calendar__icon-button advent-calendar__collection-button"
        type="button"
      >
        <span className="advent-calendar__icon">🎁</span>
      </button>
    </div>
  )
}
