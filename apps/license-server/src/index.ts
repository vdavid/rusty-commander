import { Hono } from 'hono'
import { generateLicenseKey, formatLicenseKey } from './license'
import { sendLicenseEmail } from './email'
import { verifyPaddleWebhookMulti } from './paddle'

type Bindings = {
    // Paddle webhook secrets (both optional to support gradual rollout)
    PADDLE_WEBHOOK_SECRET_LIVE?: string
    PADDLE_WEBHOOK_SECRET_SANDBOX?: string
    // Crypto keys
    ED25519_PRIVATE_KEY: string
    // Email
    RESEND_API_KEY: string
    // Config
    PRODUCT_NAME: string
    SUPPORT_EMAIL: string
}

interface PaddleWebhookPayload {
    event_type: string
    data?: {
        id?: string
        customer?: {
            email?: string
            name?: string
        }
    }
}

const app = new Hono<{ Bindings: Bindings }>()

// Health check
app.get('/', (c) => {
    return c.json({ status: 'ok', service: 'cmdr-license-server' })
})

// Paddle webhook - called when purchase completes
app.post('/webhook/paddle', async (c) => {
    const body = await c.req.text()
    const signature = c.req.header('Paddle-Signature') ?? ''

    // Verify webhook signature against both live and sandbox secrets
    const isValid = await verifyPaddleWebhookMulti(body, signature, [
        c.env.PADDLE_WEBHOOK_SECRET_LIVE,
        c.env.PADDLE_WEBHOOK_SECRET_SANDBOX,
    ])
    if (!isValid) {
        return c.json({ error: 'Invalid signature' }, 401)
    }

    const payload = JSON.parse(body) as PaddleWebhookPayload

    // Only handle completed purchases
    if (payload.event_type !== 'transaction.completed') {
        return c.json({ status: 'ignored', event: payload.event_type })
    }

    const customerEmail = payload.data?.customer?.email
    const customerName = payload.data?.customer?.name ?? 'there'
    const transactionId = payload.data?.id

    if (!customerEmail || !transactionId) {
        return c.json({ error: 'Missing customer email or transaction ID' }, 400)
    }

    // Generate license key
    const licenseData = {
        email: customerEmail,
        transactionId,
        issuedAt: new Date().toISOString(),
    }

    const licenseKey = await generateLicenseKey(licenseData, c.env.ED25519_PRIVATE_KEY)
    const formattedKey = formatLicenseKey(licenseKey)

    // Send license email
    await sendLicenseEmail({
        to: customerEmail,
        customerName,
        licenseKey: formattedKey,
        productName: c.env.PRODUCT_NAME,
        supportEmail: c.env.SUPPORT_EMAIL,
        resendApiKey: c.env.RESEND_API_KEY,
    })

    return c.json({ status: 'ok', email: customerEmail })
})

// Manual license generation (for testing or customer service)
// Protected by bearer token matching either live or sandbox webhook secret
app.post('/admin/generate', async (c) => {
    const authHeader = c.req.header('Authorization')
    const validSecrets = [c.env.PADDLE_WEBHOOK_SECRET_LIVE, c.env.PADDLE_WEBHOOK_SECRET_SANDBOX].filter(Boolean)
    const isAuthorized = validSecrets.some((secret) => authHeader === `Bearer ${secret}`)
    if (!isAuthorized) {
        return c.json({ error: 'Unauthorized' }, 401)
    }

    const { email } = await c.req.json<{ email: string }>()

    const licenseData = {
        email,
        transactionId: `manual-${String(Date.now())}`,
        issuedAt: new Date().toISOString(),
    }

    const licenseKey = await generateLicenseKey(licenseData, c.env.ED25519_PRIVATE_KEY)
    const formattedKey = formatLicenseKey(licenseKey)

    return c.json({ licenseKey: formattedKey })
})

export default app
