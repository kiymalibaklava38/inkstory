import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM   = 'InkStory <bildirim@inkstory.com.tr>'
const BASE   = 'https://inkstory.com.tr'

// ── Ortak HTML şablonu ────────────────────────────────────
function template(title: string, body: string, ctaText: string, ctaUrl: string) {
  return `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="margin:0;padding:0;background:#060d18;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#0d1829;border-radius:16px;overflow:hidden;border:1px solid #1e2d42;">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#0d1829,#162236);padding:28px 32px;border-bottom:1px solid #1e2d42;">
          <a href="${BASE}" style="text-decoration:none;">
            <span style="font-size:22px;font-weight:800;color:#e8a030;">✒ InkStory</span>
          </a>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#f0f4f8;">${title}</h1>
          <div style="color:#8ba3be;font-size:15px;line-height:1.6;">${body}</div>
          <div style="margin-top:28px;">
            <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,#d4840f,#e8a030);color:#fff;font-weight:700;font-size:14px;padding:14px 28px;border-radius:10px;text-decoration:none;">${ctaText}</a>
          </div>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid #1e2d42;">
          <p style="margin:0;font-size:12px;color:#4a6280;">
            Bu e-postayı almak istemiyorsan <a href="${BASE}/profile/edit" style="color:#d4840f;">bildirim ayarlarını</a> değiştirebilirsin.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

// ── 1. Yeni bölüm bildirimi ───────────────────────────────
export async function sendNewChapterEmail(opts: {
  toEmail: string
  toName:  string
  authorName: string
  storyTitle: string
  storySlug:  string
  chapterTitle: string
  chapterNo:    number
}) {
  const url  = `${BASE}/story/${opts.storySlug}`
  const body = `
    <p>Merhaba <strong style="color:#f0f4f8;">${opts.toName}</strong>,</p>
    <p>Takip ettiğin <strong style="color:#e8a030;">${opts.authorName}</strong> adlı yazarın 
    <strong style="color:#f0f4f8;">${opts.storyTitle}</strong> hikayesine yeni bir bölüm eklendi!</p>
    <div style="background:#0a1523;border-left:3px solid #d4840f;padding:16px 20px;border-radius:8px;margin:20px 0;">
      <p style="margin:0;color:#f0f4f8;font-weight:600;">📖 ${opts.chapterNo}. Bölüm: ${opts.chapterTitle}</p>
    </div>
    <p>Okumaya hemen başla!</p>`

  return resend.emails.send({
    from:    FROM,
    to:      opts.toEmail,
    subject: `📖 ${opts.storyTitle} — Yeni bölüm yayınlandı!`,
    html:    template(`${opts.storyTitle} — Yeni Bölüm!`, body, 'Hemen Oku', url),
  })
}

// ── 2. Yeni takipçi bildirimi ─────────────────────────────
export async function sendNewFollowerEmail(opts: {
  toEmail:      string
  toName:       string
  followerName: string
  followerUsername: string
}) {
  const url  = `${BASE}/profile/${opts.followerUsername}`
  const body = `
    <p>Merhaba <strong style="color:#f0f4f8;">${opts.toName}</strong>,</p>
    <p><strong style="color:#e8a030;">${opts.followerName}</strong> seni takip etmeye başladı! 🎉</p>
    <p>Profilini ziyaret ederek sen de onun hikayelerini keşfedebilirsin.</p>`

  return resend.emails.send({
    from:    FROM,
    to:      opts.toEmail,
    subject: `${opts.followerName} seni takip etmeye başladı!`,
    html:    template('Yeni Takipçin Var! 🎉', body, 'Profili Görüntüle', url),
  })
}

// ── 3. Yeni yorum bildirimi ───────────────────────────────
export async function sendNewCommentEmail(opts: {
  toEmail:      string
  toName:       string
  commenterName: string
  storyTitle:   string
  storySlug:    string
  commentSnippet: string
}) {
  const url  = `${BASE}/story/${opts.storySlug}`
  const body = `
    <p>Merhaba <strong style="color:#f0f4f8;">${opts.toName}</strong>,</p>
    <p><strong style="color:#e8a030;">${opts.commenterName}</strong> adlı okuyucu 
    <strong style="color:#f0f4f8;">${opts.storyTitle}</strong> hikayene yorum yaptı:</p>
    <div style="background:#0a1523;border-left:3px solid #5ba3d9;padding:16px 20px;border-radius:8px;margin:20px 0;font-style:italic;">
      <p style="margin:0;color:#c0d4e8;">"${opts.commentSnippet}"</p>
    </div>`

  return resend.emails.send({
    from:    FROM,
    to:      opts.toEmail,
    subject: `💬 ${opts.commenterName}, "${opts.storyTitle}" hikayene yorum yaptı`,
    html:    template('Yeni Yorum Aldın! 💬', body, 'Yorumu Gör', url),
  })
}
