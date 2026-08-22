import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronRight, Link2 } from 'lucide-react'
import { Modal } from '../../components/common/Modal'
import { ApiError } from '../../services/apiClient'
import {
  createInvitation,
  leaveEvent,
  listEventMembers,
  updateEventSettings,
  type BoardOrientation,
  type EventMember,
} from '../../services/eventApi'
import {
  DEFAULT_EVENT_ICON_ID,
  EVENT_ICON_OPTIONS,
  getEventIcon,
  type EventIconId,
} from './EventNameField'
import './EventSettingsModal.css'

const ROOM_NAME_MAX = 10

type EventSettingsModalProps = {
  isOpen: boolean
  eventId: string
  eventTitle: string
  eventMode: string
  eventIconId: string
  boardOrientation: BoardOrientation
  boardEdited: boolean
  onClose: () => void
  onBoardOrientationSaved: (
    boardOrientation: BoardOrientation,
    boardEdited: boolean,
  ) => void
  onEventNameSaved: (name: string) => void
  onEventIconSaved: (iconId: string) => void
  onLeftRoom: () => void
}

export function EventSettingsModal({
  isOpen,
  eventId,
  eventTitle,
  eventMode,
  eventIconId,
  boardOrientation,
  boardEdited,
  onClose,
  onBoardOrientationSaved,
  onEventNameSaved,
  onEventIconSaved,
  onLeftRoom,
}: EventSettingsModalProps) {
  const [roomName, setRoomName] = useState(eventTitle)
  const [selectedIconId, setSelectedIconId] = useState<EventIconId>(
    eventIconId || DEFAULT_EVENT_ICON_ID,
  )
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false)
  const [selectedOrientation, setSelectedOrientation] =
    useState<BoardOrientation>(boardOrientation)
  const [members, setMembers] = useState<EventMember[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [isLoadingInvite, setIsLoadingInvite] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [showOrientationConfirm, setShowOrientationConfirm] = useState(false)
  const [showCopiedToast, setShowCopiedToast] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const toastTimerRef = useRef<number | undefined>(undefined)

  const trimmedName = roomName.trim()
  const isNameValid =
    trimmedName.length > 0 && [...trimmedName].length <= ROOM_NAME_MAX
  const isGroupEvent = eventMode === 'GROUP'
  const SelectedIcon = getEventIcon(selectedIconId)

  const hasNameChange = trimmedName !== eventTitle
  const hasIconChange = selectedIconId !== eventIconId
  const hasOrientationChange = selectedOrientation !== boardOrientation
  const hasChanges = hasNameChange || hasIconChange || hasOrientationChange
  const canSave = isNameValid && hasChanges && !isSaving && !isLeaving

  useEffect(() => {
    if (!isOpen) return
    setRoomName(eventTitle)
    setSelectedIconId(eventIconId || DEFAULT_EVENT_ICON_ID)
    setSelectedOrientation(boardOrientation)
    setErrorMessage(null)
    setShowLeaveConfirm(false)
    setShowOrientationConfirm(false)
    setInviteUrl(null)
    setIsIconPickerOpen(false)
  }, [isOpen, eventTitle, eventIconId, boardOrientation])

  useEffect(() => {
    if (!isOpen) return

    const controller = new AbortController()
    setIsLoadingMembers(true)

    void listEventMembers(eventId, controller.signal)
      .then((response) => {
        setMembers(response.members ?? [])
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        console.error('GET /v1/events/members failed', error)
        setMembers([])
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingMembers(false)
        }
      })

    return () => {
      controller.abort()
    }
  }, [isOpen, eventId])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== undefined) {
        window.clearTimeout(toastTimerRef.current)
      }
    }
  }, [])

  const showCopyToast = () => {
    setShowCopiedToast(true)
    if (toastTimerRef.current !== undefined) {
      window.clearTimeout(toastTimerRef.current)
    }
    toastTimerRef.current = window.setTimeout(() => {
      setShowCopiedToast(false)
    }, 1800)
  }

  const performSave = async (clearBoard: boolean) => {
    setIsSaving(true)
    setErrorMessage(null)

    try {
      const updated = await updateEventSettings(eventId, {
        ...(hasNameChange ? { name: trimmedName } : {}),
        ...(hasIconChange ? { iconId: selectedIconId } : {}),
        ...(hasOrientationChange
          ? {
              boardOrientation: selectedOrientation,
              ...(clearBoard ? { clearBoard: true } : {}),
            }
          : {}),
      })

      if (hasNameChange) {
        onEventNameSaved(updated.name)
      }
      if (hasIconChange) {
        onEventIconSaved(updated.iconId || DEFAULT_EVENT_ICON_ID)
      }
      if (hasOrientationChange) {
        onBoardOrientationSaved(
          updated.boardOrientation ?? 'PORTRAIT',
          updated.boardEdited ?? false,
        )
      }

      setShowOrientationConfirm(false)
      onClose()
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : '設定の保存に失敗しました'
      setErrorMessage(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveChanges = () => {
    if (!canSave) return

    if (hasOrientationChange && boardEdited) {
      setShowOrientationConfirm(true)
      return
    }

    void performSave(false)
  }

  const handleConfirmOrientationSave = () => {
    void performSave(true)
  }

  const handleCopyInviteLink = async () => {
    setErrorMessage(null)

    try {
      let url = inviteUrl
      if (!url) {
        setIsLoadingInvite(true)
        const invitation = await createInvitation(eventId)
        url = invitation.inviteUrl
        setInviteUrl(url)
      }

      await navigator.clipboard.writeText(url)
      showCopyToast()
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'リンクのコピーに失敗しました'
      setErrorMessage(message)
    } finally {
      setIsLoadingInvite(false)
    }
  }

  const handleLeaveRoom = async () => {
    setIsLeaving(true)
    setErrorMessage(null)

    try {
      await leaveEvent(eventId)
      setShowLeaveConfirm(false)
      onClose()
      onLeftRoom()
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : '退室に失敗しました'
      setErrorMessage(message)
    } finally {
      setIsLeaving(false)
    }
  }

  const leaveConfirmDialog =
    showLeaveConfirm && isOpen
      ? createPortal(
          <div
            className="room-settings__confirm-backdrop"
            role="presentation"
            onClick={() => {
              if (!isLeaving) setShowLeaveConfirm(false)
            }}
          >
            <div
              className="room-settings__confirm"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="room-settings-leave-title"
              onClick={(event) => event.stopPropagation()}
            >
              <p
                id="room-settings-leave-title"
                className="room-settings__confirm-title"
              >
                ルームから退室しますか？
              </p>
              <p className="room-settings__confirm-message">
                退室すると、このルームのカレンダーやボードにアクセスできなくなります。再度参加するには招待リンクが必要です。
              </p>
              <div className="room-settings__confirm-actions">
                <button
                  type="button"
                  className="room-settings__confirm-button room-settings__confirm-button--cancel"
                  onClick={() => setShowLeaveConfirm(false)}
                  disabled={isLeaving}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  className="room-settings__confirm-button room-settings__confirm-button--danger"
                  onClick={() => void handleLeaveRoom()}
                  disabled={isLeaving}
                >
                  {isLeaving ? '退室中…' : '退室する'}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null

  const copiedToast =
    showCopiedToast && isOpen
      ? createPortal(
          <div className="room-settings__toast" role="status" aria-live="polite">
            コピーしました
          </div>,
          document.body,
        )
      : null

  const orientationConfirmDialog =
    showOrientationConfirm && isOpen
      ? createPortal(
          <div
            className="room-settings__confirm-backdrop"
            role="presentation"
            onClick={() => {
              if (!isSaving) setShowOrientationConfirm(false)
            }}
          >
            <div
              className="room-settings__confirm"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="room-settings-orientation-title"
              onClick={(event) => event.stopPropagation()}
            >
              <p
                id="room-settings-orientation-title"
                className="room-settings__confirm-title"
              >
                ボードの向きを変更しますか？
              </p>
              <p className="room-settings__confirm-message">
                向きを変更するには、イベントボードの内容をすべて削除する必要があります。よろしいですか？
              </p>
              <div className="room-settings__confirm-actions">
                <button
                  type="button"
                  className="room-settings__confirm-button room-settings__confirm-button--cancel"
                  onClick={() => setShowOrientationConfirm(false)}
                  disabled={isSaving}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  className="room-settings__confirm-button room-settings__confirm-button--danger"
                  onClick={handleConfirmOrientationSave}
                  disabled={isSaving}
                >
                  {isSaving ? '保存中…' : '削除して保存'}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <>
      <Modal
        isOpen={isOpen}
        title="ルーム設定"
        onClose={onClose}
        variant="sheet"
        disableSwipeClose={hasChanges || isSaving}
      >
        <div className="room-settings">
          <div className="room-settings__identity">
            <button
              type="button"
              className="room-settings__icon-button"
              aria-label="ルームアイコンを変更"
              aria-expanded={isIconPickerOpen}
              onClick={() => setIsIconPickerOpen((open) => !open)}
              disabled={isSaving}
            >
              <SelectedIcon
                className="room-settings__icon-image"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            </button>

            {isIconPickerOpen ? (
              <div
                className="room-settings__icon-picker"
                role="listbox"
                aria-label="ルームアイコン"
              >
                {EVENT_ICON_OPTIONS.map(({ id: optionId, label, Icon }) => {
                  const isSelected = optionId === selectedIconId

                  return (
                    <button
                      key={optionId}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      aria-label={label}
                      className={`room-settings__icon-option${
                        isSelected ? ' is-selected' : ''
                      }`}
                      onClick={() => {
                        setSelectedIconId(optionId)
                        setIsIconPickerOpen(false)
                      }}
                      disabled={isSaving}
                    >
                      <Icon strokeWidth={1.75} aria-hidden="true" />
                    </button>
                  )
                })}
              </div>
            ) : null}

            <div className="room-settings__name-field">
              <label
                className="room-settings__label"
                htmlFor="room-settings-name"
              >
                ルーム名変更 (最大10文字まで)
              </label>
              <div className="room-settings__name-input-wrap">
                <input
                  id="room-settings-name"
                  type="text"
                  className="room-settings__name-input"
                  value={roomName}
                  maxLength={ROOM_NAME_MAX}
                  onChange={(event) => setRoomName(event.target.value)}
                  disabled={isSaving}
                />
                {isNameValid ? (
                  <Check
                    className="room-settings__name-check"
                    size={22}
                    strokeWidth={2.5}
                    aria-hidden="true"
                  />
                ) : null}
              </div>
            </div>
          </div>

          <section className="room-settings__section">
            <h3 className="room-settings__section-title">
              イベントボードの向き
            </h3>
            {boardEdited ? (
              <p className="room-settings__orientation-note">
                ボード編集後は、向きを変えると内容が削除されます
              </p>
            ) : null}
            <div
              className="room-settings__orientation"
              role="radiogroup"
              aria-label="イベントボードの向き"
            >
              <button
                type="button"
                role="radio"
                aria-checked={selectedOrientation === 'PORTRAIT'}
                className={`room-settings__orientation-button${
                  selectedOrientation === 'PORTRAIT' ? ' is-selected' : ''
                }`}
                onClick={() => setSelectedOrientation('PORTRAIT')}
                disabled={isSaving}
              >
                縦
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={selectedOrientation === 'LANDSCAPE'}
                className={`room-settings__orientation-button${
                  selectedOrientation === 'LANDSCAPE' ? ' is-selected' : ''
                }`}
                onClick={() => setSelectedOrientation('LANDSCAPE')}
                disabled={isSaving}
              >
                横
              </button>
            </div>
          </section>

          <section className="room-settings__section">
            <div className="room-settings__members-header">
              <h3 className="room-settings__section-title">メンバー</h3>
              <ChevronRight size={22} strokeWidth={2} aria-hidden="true" />
            </div>

            <div className="room-settings__members-row">
              {isLoadingMembers ? (
                <p className="room-settings__members-status">読み込み中…</p>
              ) : members.length === 0 ? (
                <p className="room-settings__members-status">
                  メンバーがいません
                </p>
              ) : (
                members.slice(0, 5).map((member) => (
                  <div
                    key={member.user.id}
                    className="room-settings__member-avatar"
                    title={member.user.displayName}
                  >
                    {member.user.avatarUrl ? (
                      <img
                        src={member.user.avatarUrl}
                        alt=""
                        className="room-settings__member-image"
                      />
                    ) : (
                      <span aria-hidden="true">
                        {member.user.displayName.slice(0, 1)}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          {isGroupEvent ? (
            <button
              type="button"
              className="room-settings__invite-link"
              onClick={() => void handleCopyInviteLink()}
              disabled={isLoadingInvite || isSaving}
            >
              <span className="room-settings__invite-row">
                <Link2 size={20} strokeWidth={2} aria-hidden="true" />
                <span className="room-settings__invite-title">
                  ルームにメンバーを招待する
                </span>
              </span>
              <small className="room-settings__invite-hint">
                タップでリンクをコピー
              </small>
            </button>
          ) : null}

          {errorMessage ? (
            <p className="room-settings__error" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="button"
            className="room-settings__save-button"
            onClick={handleSaveChanges}
            disabled={!canSave}
          >
            {isSaving ? '保存中…' : '変更完了'}
          </button>

          <button
            type="button"
            className="room-settings__leave-button"
            onClick={() => setShowLeaveConfirm(true)}
            disabled={isSaving}
          >
            ルームから退室する
          </button>
        </div>
      </Modal>

      {leaveConfirmDialog}
      {orientationConfirmDialog}
      {copiedToast}
    </>
  )
}
