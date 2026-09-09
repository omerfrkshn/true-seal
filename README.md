# Mühür Hafızası

Tarayıcıda oynanan bir hafıza oyunu. Her seviyede rastgele bir el mührü dizisi
gösteriliyor; diziyi ezberleyip aynı sırayla tekrar etmen gerekiyor. Dizi
uzadıkça ve gösterim hızlandıkça zorlaşıyor, sabit bir bitiş yok.

Build adımı yok — saf HTML, CSS ve JavaScript.

## Oynanış

1. Ekranın ortasında **3 · 2 · 1** geri sayımı oynar.
2. Kısaca **"EZBERLE!"** belirir.
3. Mühür Dizisi Ekranı'nda o seviyenin dizisi sırayla gösterilir.
4. Sıra sende: alttaki 12 mühür butonuna aynı sırayla bas.
   - Her basışta rastgele bir el mührü sesi çalar ve mührün büyük görseli
     ekranın ortasında Japonca adıyla belirip söner.
   - Doğru basışta ayrıca mührün Japonca telaffuzu duyulur.
   - Dizi eksiksiz tamamlanınca jutsu aktivasyon sesi çalar ve bir sonraki
     seviyeye geçilir.
   - Yanlış basışta hata sesi + butonlarda titreşim, oyun biter.

`Esc` ana menüye döner. Ulaşılan en yüksek seviye tarayıcıda saklanır.

## Zorluk eğrisi

| | Seviye 1 | Artış | Sınır |
|---|---|---|---|
| Dizi uzunluğu | 3 mühür | seviye başına +1 | 12 |
| Mühür gösterimi | 900 ms | seviye başına −60 ms | 300 ms |
| Mühürler arası boşluk | 250 ms | seviye başına −15 ms | 120 ms |

Değerler [`js/game.js`](js/game.js) dosyasının en üstündeki sabitlerde.

## Mühürler

| Hayvan | Romaji | Katakana |
|---|---|---|
| Fare | Ne | ネ |
| Öküz | Ushi | ウシ |
| Kaplan | Tora | トラ |
| Tavşan | U | ウ |
| Ejderha | Tatsu | タツ |
| Yılan | Mi | ミ |
| At | Uma | ウマ |
| Koç | Hitsuji | ヒツジ |
| Maymun | Saru | サル |
| Kuş | Tori | トリ |
| Köpek | Inu | イヌ |
| Yaban Domuzu | I | イ |

## Yerel çalıştırma

Sesler `fetch` + Web Audio ile yükleniyor, bu yüzden `index.html`'i dosya
olarak açmak yetmez — küçük bir HTTP sunucusu gerekiyor:

```bash
python -m http.server 8123
```

Sonra `http://127.0.0.1:8123` adresini aç.

## Yayınlama

Statik dosyalar; Vercel veya Netlify'a repoyu bağlaman yeterli. Build komutu
yok, çıktı dizini reponun kökü.

## Dosya yapısı

```
index.html
css/
  base.css        renk/font değişkenleri, reset, iki panelli yatay ray
  landing.css     giriş animasyonu, kanji, başlat butonu
  game.css        HUD, mühür dizisi ekranı, 12 buton
  overlays.css    geri sayım, tıklama parlaması, oyun bitti ekranı
js/
  seals.js        12 mührün verisi ve dosya yolları
  audio.js        Web Audio veri yolu (hata sesi kod içinde sentezlenir)
  assets.js       görsel + ses ön yükleyici
  game.js         seviye döngüsü ve durum makinesi
  main.js         mürekkep arka planı, panel geçişi, ses/rekor kontrolleri
assets/
  seals/png       şeffaf mühür kesitleri (320 ve 640 px)
  seals/color     renkli arka planlı mühür kareleri
  audio/click     el mührü sesleri + jutsu aktivasyon sesi
  audio/names     Japonca mühür adları
  cursor          kunai imleci
```

## Notlar

- Hata sesi için ayrı bir dosya yok; Web Audio ile kod içinde üretiliyor
  (`AudioBus.playError`). Yerine bir dosya koymak istersen tek fonksiyon
  değiştirmek yeterli.
- Mühür kesitleri iki boyutta üretildi; tarayıcı `srcset` ile ekrana uygun
  olanı indiriyor (mobilde ~600 KB, masaüstünde ~2 MB).
- `prefers-reduced-motion` açıksa animasyonlar ve arka plan parçacıkları
  devre dışı kalır.
- `assets/` altındaki görsel ve ses dosyalarının hakları sahiplerine aittir.
