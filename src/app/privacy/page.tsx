import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Gizlilik Politikası — InkStory',
  description: 'InkStory gizlilik politikası ve kişisel veri işleme koşulları.',
}

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-14">
      <div className="mb-10">
        <h1 className="font-display text-4xl font-bold text-[var(--fg)] mb-3">Gizlilik Politikası</h1>
        <p className="text-[var(--fg-muted)] text-sm">Son güncelleme: Mart 2026</p>
      </div>

      <div className="space-y-8 text-[var(--fg-muted)] leading-relaxed">

        <section>
          <h2 className="font-display text-xl font-bold text-[var(--fg)] mb-3">1. Giriş</h2>
          <p>InkStory olarak gizliliğinize saygı duyuyor ve kişisel verilerinizi korumayı taahhüt ediyoruz. Bu politika, <strong className="text-[var(--fg)]">inkstory.com.tr</strong> adresinde sunulan hizmetlerimizi kullanırken toplanan verilerin nasıl işlendiğini açıklar.</p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-[var(--fg)] mb-3">2. Topladığımız Veriler</h2>
          <ul className="space-y-2 list-disc list-inside">
            <li><strong className="text-[var(--fg)]">Hesap bilgileri:</strong> E-posta adresi, kullanıcı adı, profil fotoğrafı</li>
            <li><strong className="text-[var(--fg)]">İçerik verileri:</strong> Yazdığınız hikayeler, yorumlar, beğeniler</li>
            <li><strong className="text-[var(--fg)]">Kullanım verileri:</strong> Okuma geçmişi, sayfa görüntüleme, oturum bilgileri</li>
            <li><strong className="text-[var(--fg)]">Ödeme bilgileri:</strong> Paddle üzerinden işlenen ödeme verileri (kart bilgileri bizde saklanmaz)</li>
            <li><strong className="text-[var(--fg)]">Teknik veriler:</strong> IP adresi, tarayıcı tipi, cihaz bilgisi</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-[var(--fg)] mb-3">3. Verilerin Kullanım Amacı</h2>
          <ul className="space-y-2 list-disc list-inside">
            <li>Hizmetlerin sağlanması ve kişiselleştirilmesi</li>
            <li>Premium üyelik yönetimi ve fatura işlemleri</li>
            <li>E-posta bildirimleri (hikaye güncellemeleri, takipçi bildirimleri)</li>
            <li>Platform güvenliği ve kötüye kullanım önleme</li>
            <li>Hizmet iyileştirme ve analitik</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-[var(--fg)] mb-3">4. Verilerin Paylaşımı</h2>
          <p>Kişisel verilerinizi üçüncü taraflara satmayız. Veriler yalnızca şu hizmet sağlayıcılarla paylaşılır:</p>
          <ul className="space-y-2 list-disc list-inside mt-3">
            <li><strong className="text-[var(--fg)]">Paddle:</strong> Ödeme işlemleri — <a href="https://www.paddle.com/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">Paddle Gizlilik Politikası</a></li>
            <li><strong className="text-[var(--fg)]">Supabase:</strong> Veritabanı ve kimlik doğrulama hizmetleri</li>
            <li><strong className="text-[var(--fg)]">Resend:</strong> E-posta bildirimleri</li>
            <li><strong className="text-[var(--fg)]">Vercel:</strong> Hosting hizmetleri</li>
            <li>Yasal zorunluluk durumlarında yetkili kurumlara</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-[var(--fg)] mb-3">5. Ödeme Güvenliği</h2>
          <p>Tüm ödeme işlemleri <strong className="text-[var(--fg)]">Paddle</strong> altyapısı üzerinden güvenli şekilde gerçekleştirilir. Kredi kartı ve banka kartı bilgileriniz InkStory sunucularında saklanmaz. Paddle, PCI DSS uyumlu bir ödeme işlemcisidir ve tüm işlemler SSL/TLS şifrelemesiyle korunur.</p>
          <p className="mt-3">Desteklenen ödeme yöntemleri: Visa, Mastercard, American Express, PayPal ve yerel ödeme yöntemleri.</p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-[var(--fg)] mb-3">6. Çerezler</h2>
          <p>Platform işlevselliği için zorunlu çerezler kullanırız. Oturum yönetimi için Supabase auth token'ları tarayıcınızda saklanır. Analitik çerez kullanmıyoruz.</p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-[var(--fg)] mb-3">7. Haklarınız (KVKK)</h2>
          <p>6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında aşağıdaki haklara sahipsiniz:</p>
          <ul className="space-y-2 list-disc list-inside mt-3">
            <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
            <li>Kişisel verilerinize erişim ve düzeltme talep etme</li>
            <li>Kişisel verilerinizin silinmesini talep etme</li>
            <li>Veri işlemeye itiraz etme hakkı</li>
            <li>Veri taşınabilirliği hakkı</li>
          </ul>
          <p className="mt-3">Haklarınızı kullanmak için <a href="mailto:privacy@inkstory.com.tr" className="text-[var(--accent)] hover:underline">privacy@inkstory.com.tr</a> adresine başvurabilirsiniz.</p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-[var(--fg)] mb-3">8. Premium Abonelik ve İade Politikası</h2>
          <p>Premium abonelikler Paddle üzerinden işlenir. Abonelik başladıktan sonra 14 gün içinde iade talep edebilirsiniz.</p>
          <ul className="space-y-2 list-disc list-inside mt-3">
            <li>Aylık planlar: İptal sonraki dönemde geçerli olur</li>
            <li>Yıllık planlar: 14 gün içinde tam iade, sonrasında kalan süre oranında iade</li>
          </ul>
          <p className="mt-3">İade talepleri için <a href="mailto:support@inkstory.com.tr" className="text-[var(--accent)] hover:underline">support@inkstory.com.tr</a> adresine yazın.</p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-[var(--fg)] mb-3">9. Veri Saklama</h2>
          <p>Hesabınız aktif olduğu sürece verileriniz saklanır. Hesap silme talebinde verileriniz 30 gün içinde kalıcı olarak silinir. Ödeme kayıtları yasal zorunluluk nedeniyle 5 yıl saklanabilir.</p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-[var(--fg)] mb-3">10. Değişiklikler</h2>
          <p>Bu politikada yapılacak önemli değişiklikler e-posta ile bildirilir. Güncel politika her zaman bu sayfada yayımlanır.</p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-[var(--fg)] mb-3">11. İletişim</h2>
          <ul className="space-y-1 list-disc list-inside">
            <li>E-posta: <a href="mailto:contact@inkstory.com.tr" className="text-[var(--accent)] hover:underline">coontact@inkstory.com.tr</a></li>
            <li>Web: <a href="https://inkstory.com.tr" className="text-[var(--accent)] hover:underline">inkstory.com.tr</a></li>
          </ul>
        </section>

      </div>

      <div className="mt-12 pt-8 border-t border-[var(--border)] flex gap-6 text-sm text-[var(--fg-muted)]">
        <Link href="/terms" className="hover:text-[var(--accent)] transition-colors">Kullanım Koşulları</Link>
        <Link href="/premium" className="hover:text-[var(--accent)] transition-colors">Premium</Link>
        <Link href="/" className="hover:text-[var(--accent)] transition-colors">Ana Sayfa</Link>
      </div>
    </div>
  )
}
