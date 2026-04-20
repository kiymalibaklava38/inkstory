-- ============================================================
-- InkStory — DM Sistemi + Engelleme + Yorum Cevaplama
-- Supabase SQL Editor → New Query → Run
-- ============================================================

-- ── 1. Engelleme tablosu ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.engellemeler (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engelleyen_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  engellenen_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at    timestamptz DEFAULT now(),
  UNIQUE(engelleyen_id, engellenen_id),
  CHECK (engelleyen_id != engellenen_id)
);

ALTER TABLE public.engellemeler ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kendi engellemelerini gör" ON public.engellemeler
  FOR SELECT USING (auth.uid() = engelleyen_id);
CREATE POLICY "Engelle" ON public.engellemeler
  FOR INSERT WITH CHECK (auth.uid() = engelleyen_id AND engelleyen_id != engellenen_id);
CREATE POLICY "Engeli kaldır" ON public.engellemeler
  FOR DELETE USING (auth.uid() = engelleyen_id);

-- ── 2. DM konuşmaları tablosu ────────────────────────────
CREATE TABLE IF NOT EXISTS public.konusmalar (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  katilimci_1  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  katilimci_2  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  son_mesaj_at timestamptz DEFAULT now(),
  created_at   timestamptz DEFAULT now(),
  UNIQUE(katilimci_1, katilimci_2),
  CHECK (katilimci_1 < katilimci_2)
);

ALTER TABLE public.konusmalar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kendi konuşmalarını gör" ON public.konusmalar
  FOR SELECT USING (auth.uid() = katilimci_1 OR auth.uid() = katilimci_2);
CREATE POLICY "Konuşma başlat" ON public.konusmalar
  FOR INSERT WITH CHECK (auth.uid() = katilimci_1 OR auth.uid() = katilimci_2);
CREATE POLICY "Konuşmayı güncelle" ON public.konusmalar
  FOR UPDATE USING (auth.uid() = katilimci_1 OR auth.uid() = katilimci_2);

-- ── 3. DM mesajları tablosu ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.mesajlar (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  konusma_id   uuid NOT NULL REFERENCES public.konusmalar(id) ON DELETE CASCADE,
  gonderen_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  icerik       text NOT NULL CHECK (char_length(icerik) BETWEEN 1 AND 2000),
  okundu       boolean DEFAULT false,
  silinmis     boolean DEFAULT false,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE public.mesajlar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Konuşma üyesi mesajları görebilir" ON public.mesajlar
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.konusmalar k
      WHERE k.id = konusma_id
      AND (k.katilimci_1 = auth.uid() OR k.katilimci_2 = auth.uid())
    )
  );
CREATE POLICY "Mesaj gönder" ON public.mesajlar
  FOR INSERT WITH CHECK (
    auth.uid() = gonderen_id AND
    EXISTS (
      SELECT 1 FROM public.konusmalar k
      WHERE k.id = konusma_id
      AND (k.katilimci_1 = auth.uid() OR k.katilimci_2 = auth.uid())
    )
  );
CREATE POLICY "Kendi mesajını güncelle (sil)" ON public.mesajlar
  FOR UPDATE USING (auth.uid() = gonderen_id);

-- ── 4. Yorumlara cevap sütunu ────────────────────────────
ALTER TABLE public.yorumlar
  ADD COLUMN IF NOT EXISTS ust_yorum_id uuid REFERENCES public.yorumlar(id) ON DELETE SET NULL;

-- ── 5. Yorum beğeni tablosu ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.yorum_begeniler (
  user_id    uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  yorum_id   uuid REFERENCES public.yorumlar(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, yorum_id)
);

ALTER TABLE public.yorum_begeniler ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Herkes görebilir" ON public.yorum_begeniler FOR SELECT USING (true);
CREATE POLICY "Kendi beğenisi" ON public.yorum_begeniler FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Beğeni kaldır" ON public.yorum_begeniler FOR DELETE USING (auth.uid() = user_id);

-- ── 6. Index'ler ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_mesajlar_konusma     ON public.mesajlar(konusma_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mesajlar_okunmamis   ON public.mesajlar(konusma_id, okundu) WHERE okundu = false;
CREATE INDEX IF NOT EXISTS idx_konusmalar_k1        ON public.konusmalar(katilimci_1, son_mesaj_at DESC);
CREATE INDEX IF NOT EXISTS idx_konusmalar_k2        ON public.konusmalar(katilimci_2, son_mesaj_at DESC);
CREATE INDEX IF NOT EXISTS idx_engellemeler_kisi    ON public.engellemeler(engelleyen_id);
CREATE INDEX IF NOT EXISTS idx_yorumlar_ust         ON public.yorumlar(ust_yorum_id) WHERE ust_yorum_id IS NOT NULL;

-- ── 7. Realtime ──────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.mesajlar;
ALTER PUBLICATION supabase_realtime ADD TABLE public.konusmalar;
