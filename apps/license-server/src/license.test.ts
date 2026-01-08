import { describe, expect, it } from 'vitest'
import { formatLicenseKey } from './license'

describe('formatLicenseKey', () => {
    it('formats a key into uppercase groups', () => {
        const key = 'eyJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20ifQ.c2lnbmF0dXJl'
        const formatted = formatLicenseKey(key)

        // Should be uppercase
        expect(formatted).toBe(formatted.toUpperCase())

        // Should contain dashes separating groups
        expect(formatted).toContain('-')
    })

    it('produces consistent output for the same input', () => {
        const key = 'someTestKey.signature'
        const result1 = formatLicenseKey(key)
        const result2 = formatLicenseKey(key)

        expect(result1).toBe(result2)
    })
})
