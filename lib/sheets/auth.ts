import 'server-only'

/**
 * Orders authenticates with the shared service account.
 *
 * The implementation moved to lib/google/auth when the farm workbook arrived:
 * one token cache for one service account, however many spreadsheets it
 * touches. Re-exported here so existing imports and tests keep working.
 */
export { getAccessToken, resetTokenCache } from '@/lib/google/auth'
