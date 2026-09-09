import { getUserSession } from '../../utils/session'

export default defineEventHandler(async event => ({ account: await getUserSession(event) }))
