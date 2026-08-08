import { Modal } from '../common/Modal'
import type { User } from '../../types/user'

type ProfileModalProps = {
  isOpen: boolean
  user: User | null
  onClose: () => void
}

export function ProfileModal({ isOpen, user, onClose }: ProfileModalProps) {
  return (
    <Modal isOpen={isOpen} title="プロフィール" onClose={onClose}>
      {user ? (
        <p>{user.displayName}</p>
      ) : (
        <p>ユーザー情報がありません</p>
      )}
    </Modal>
  )
}
