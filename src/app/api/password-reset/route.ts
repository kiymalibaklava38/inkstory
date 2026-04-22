import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  // ── 1. Email al ─────────────────────────────────────────
  let email: string
  try {
    const body = await req.json()
    email = body?.email
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 })
  }

  if (!email || typeof email !== 'string' || !email.includes('@'))
    return NextResponse.json({ error: 'Geçerli bir e-posta adresi gir.' }, { status: 400 })

  email = email.trim().toLowerCase()

  // ── 2. ENV kontrol ──────────────────────────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  const resendKey   = process.env.RESEND_API_KEY
  const siteUrl     = (process.env.NEXT_PUBLIC_SITE_URL || 'https://inkstory.com.tr').replace(/\/$/, '')

  if (!supabaseUrl || !serviceKey) {
    console.error('[PW Reset] NEXT_PUBLIC_SUPABASE_URL veya SUPABASE_SERVICE_ROLE_KEY eksik')
    return NextResponse.json({ error: 'Sunucu yapılandırma hatası. (supabase)' }, { status: 500 })
  }
  if (!resendKey) {
    console.error('[PW Reset] RESEND_API_KEY eksik')
    return NextResponse.json({ error: 'Sunucu yapılandırma hatası. (resend)' }, { status: 500 })
  }

  try {
    // ── 3. Supabase admin ile recovery link üret ────────────
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${siteUrl}/auth/callback?type=recovery`,
      },
    })

    if (linkError) {
      console.error('[PW Reset] generateLink error:', linkError.message)
      // Güvenlik: kullanıcıya kayıtlı değil bilgisi verme, yine de success döndür
      return NextResponse.json({ success: true })
    }

    const resetLink = data?.properties?.action_link
    if (!resetLink) {
      console.error('[PW Reset] action_link yok:', JSON.stringify(data))
      return NextResponse.json({ error: 'Link üretilemedi.' }, { status: 500 })
    }

    console.log('[PW Reset] Link üretildi, mail gönderiliyor...')

    // ── 4. Resend ile mail gönder ───────────────────────────
    const resend = new Resend(resendKey)
    const { data: mailData, error: mailError } = await resend.emails.send({
      from: 'InkStory <noreply@inkstory.com.tr>',
      to: email,
      subject: '🔑 InkStory — Şifre Sıfırlama',
      html: `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Şifre Sıfırlama</title>
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f4f5;margin:0;padding:20px">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto">
    <tr>
      <td style="background:linear-gradient(135deg,#d4840f,#e8a030);padding:36px 32px;border-radius:12px 12px 0 0;text-align:center">
        <h1 style="color:white;margin:0;font-size:22px;font-weight:700;letter-spacing:-0.3px">
          🔑 Şifreni Sıfırla
        </h1>
      </td>
    </tr>
    <tr>
      <td style="background:white;padding:36px 32px">
        <p style="color:#374151;line-height:1.6;margin:0 0 12px 0;font-size:15px">Merhaba,</p>
        <p style="color:#374151;line-height:1.6;margin:0 0 28px 0;font-size:15px">
          InkStory hesabın için şifre sıfırlama isteği aldık.<br>
          Yeni şifre belirlemek için aşağıdaki butona tıkla:
        </p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding:8px 0 28px">
              <a href="${resetLink}"
                style="display:inline-block;background:linear-gradient(135deg,#d4840f,#e8a030);color:white;padding:14px 40px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px;letter-spacing:0.2px">
                Şifre Sıfırla
              </a>
            </td>
          </tr>
        </table>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;margin-bottom:20px">
          <p style="color:#6b7280;font-size:12px;margin:0 0 6px;font-weight:600">Buton çalışmıyor mu? Bu linki kopyala:</p>
          <p style="color:#d4840f;font-size:11px;margin:0;word-break:break-all">${resetLink}</p>
        </div>
        <div style="background:#fffbeb;border:1px solid #fcd34d;color:#92400e;padding:12px 16px;border-radius:8px;font-size:13px">
          ⏰ <strong>Bu link 1 saat geçerlidir.</strong> Bu isteği sen yapmadıysan bu maili görmezden gelebilirsin.
        </div>
      </td>
    </tr>
    <tr>
      <td style="background:#f9fafb;padding:20px 32px;border-radius:0 0 12px 12px;border-top:1px solid #e5e7eb;text-align:center">
        <p style="color:#9ca3af;font-size:12px;margin:0">© 2024 InkStory · Bu otomatik bir maildir, yanıt vermeyin.</p>
      </td>
    </tr>
  </table>
</body>
</html>`,
    })

    if (mailError) {
      console.error('[PW Reset] Resend error:', JSON.stringify(mailError))
      return NextResponse.json({
        error: 'Mail gönderilemedi: ' + ((mailError as any)?.message || JSON.stringify(mailError))
      }, { status: 500 })
    }

    console.log('[PW Reset] ✅ Mail gönderildi. ID:', mailData?.id, 'To:', email)
    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('[PW Reset] Beklenmeyen hata:', err?.message || err)
    return NextResponse.json({ error: 'Hata: ' + (err?.message || 'bilinmiyor') }, { status: 500 })
  }
}
