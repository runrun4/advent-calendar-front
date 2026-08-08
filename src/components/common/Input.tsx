import type { InputHTMLAttributes } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
}

export function Input({ label, id, ...props }: InputProps) {
  return (
    <label htmlFor={id}>
      {label ? <span>{label}</span> : null}
      <input id={id} {...props} />
    </label>
  )
}
