import { Modal } from '../../components/common/Modal'

type EventAddModalProps = {
  isOpen: boolean
  onClose: () => void
}

export function EventAddModal({ isOpen, onClose }: EventAddModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      title="イベント追加"
      onClose={onClose}
      variant="sheet"
    >
      <div className="event-add-modal">
        <p className="event-add-modal__lead">
          新しいイベントを追加する画面です。
        </p>
      </div>
    </Modal>
  )
}
