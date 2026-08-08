import type { User } from '../types/user'

export async function login(_email: string, _password: string): Promise<User> {
  throw new Error('Not implemented')
}

export async function register(
  _email: string,
  _password: string,
): Promise<User> {
  throw new Error('Not implemented')
}

export async function logout(): Promise<void> {
  throw new Error('Not implemented')
}
