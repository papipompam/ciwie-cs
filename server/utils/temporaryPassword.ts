import { randomInt } from 'node:crypto'

const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
const PASSWORD_LENGTH = 16

export const generateTemporaryPassword = () => Array.from({ length: PASSWORD_LENGTH }, () => PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)]).join('')
