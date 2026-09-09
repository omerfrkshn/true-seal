# True Seal

Tarayıcıda oynanan bir hafıza oyunu. Her seviyede rastgele bir el mührü dizisi
gösteriliyor; diziyi ezberleyip aynı sırayla örmen gerekiyor. Dizi uzadıkça,
gösterim hızlandıkça ve süre daraldıkça zorlaşıyor. Sabit bir bitiş yok.

Build adımı yok — saf HTML, CSS ve JavaScript.

## Oynanış

1. Ekranın ortasında geri sayım oynar (sayaç sesiyle senkron).
2. Kısaca **"EZBERLE!"** belirir.
3. Üstteki parşömende o seviyenin dizisi sırayla gösterilir.
4. Sıra sende: alttaki parşömendeki 12 mühür butonuna aynı sırayla bas.
   - Her basışta rastgele bir el mührü sesi çalar ve mührün büyük görseli
     ekranın ortasında Japonca adıyla belirip söner.
   - Doğru basışta ayrıca mührün Japonca telaffuzu duyulur.
   - Dizi eksiksiz tamamlanınca jutsu aktivasyon sesi çalar, puan yazılır ve
     bir sonraki seviyeye geçilir.
   - Yanlış basışta hata sesi + butonlarda titreşim, oyun biter.

**Tekrar Göster** diziyi baştan oynatır; seviye başına 3 hakkın var ve her
kullanım puanını düşürür. `Esc` ana menüye döner.

## Zorluk

Seviyeler 7'şerlik bloklar hâlinde ilerler. Her blokta dizi bir mühür uzar;
blok içinde gösterim `t^1.9` eğrisiyle hızlanır — ilk beş seviye rahat, altıncı
sıkışır, yedinci gerçekten zorlar. Yeni blok hızı biraz geri verir, çünkü dizi
uzamıştır.

İlk blok (3 mühür), mühür başına gösterim süresi:

| Seviye | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|
| ms | 900 | 882 | 834 | 760 | 655 | 518 | **340** |

Mühürler arası boşluk her zaman gösterimin %28'i. Dizi 12 mühürde sabitlenir.

## Puan ve kombo

Bir seviyeyi geçince:

```
temel      = 100 × mühür sayısı + 25 × seviye
hız bonusu = temel × 0.6 × (kalan sürenin oranı)
ceza       = temel × 0.25 × kullanılan tekrar hakkı
çarpan     = 1 + 0.1 × kombo          (en fazla 2.0×)
puan       = (temel + hız bonusu − ceza) × çarpan
```

Her seviyenin bir **maksimum süresi** var: `mühür × 1000 + 1200 ms`, blok
sonuna doğru %15'e kadar kısalıyor. Süre dolmadan bitirirsen kombo bir artar;
süre aşılırsa kombo anında sıfırlanır.

Giriş sırasında süre çubuğu boşalır: yeşil → altın → kırmızı. Kombon varken son
%40'ta panel kenarları kırmızı zonklamaya başlar ve tik sesi hızlanır — kaybedecek
bir şeyin olduğunda baskı da oluyor. Kombo 2 ve üzerinde ekrana `KOMBO xN`
şok dalgasıyla çakılıyor, kombo büyüdükçe rengi turuncudan kırmızıya kayıyor.

## Ses ve müzik

İki döngülü müzik var: açılış ekranında `hero.mp3`, oyun ekranında `game.mp3`.
Panel değişince araya 900 ms'lik çapraz geçiş giriyor, kesme yok. Müzik kendi
alt yoluna bağlı ve efektlerin altında kalsın diye seviyesi düşük tutulmuş
(`MUSIC_LEVEL`, `js/audio.js`).

Açılış müziği dosyalar çözülür çözülmez başlıyor, tıklama beklemiyor. Tarayıcı
otomatik oynatmayı engelliyorsa kaynak yine de kuruluyor ve bağlam açıldığı anda
baştan çalıyor; bu durumda sayfaya ilk dokunuş sesi açıyor. Müzik dosyaları
engelleyici ön yüklemeye girmiyor; birkaç megabayt oldukları için arkada
yüklenip hazır olunca giriyorlar, "Oyuna Başla" onları beklemiyor.

Buton sesleri:

| Ne zaman | Ses |
|---|---|
| Oyuna Başla / Tekrar Dene | `ui/start_*.mp3` havuzundan rastgele biri |
| Yanlış mühre basınca | kod içinde üretilen hata uğultusu (anında) |
| "Mühür bozuldu" kartı belirince | `ui/muhur_bozuldu.mp3` (950 ms sonra) |

Yanlış basışta iki ayrı ses var çünkü iki ayrı an: uğultu tıklamaya anında
cevap veriyor, telli çalgı ise kartın belirdiği ana denk geliyor.

Sessize alma düğmesi ana yolu kısıyor — müzik durmuyor, sadece susuyor, açınca
kaldığı yerden devam ediyor.

## Dil

Sağ üstteki **TR / EN** düğmesiyle site tamamen Türkçe veya İngilizce
kullanılabilir. Düğme hem açılış ekranında hem oyun HUD'unda var; ikisi aynı
durumu paylaşır. Geçiş oyunu kesmez — seviye ortasında dil değiştirsen bile
ipuçları, mühür adları ve oyun sonu kartı anında yeniden yazılır.

İlk ziyarette tarayıcı dili Türkçeyse Türkçe, değilse İngilizce açılır; seçim
sonrasında `localStorage`'da saklanır. Metinler `js/i18n.js` içindeki tek
sözlükte; statik olanlar `data-i18n` öznitelikleriyle bağlanır.

Mühür adları da çevrilir (Fare/Rat, Öküz/Ox, Tavşan/Hare…), Japonca romaji ve
katakana ise iki dilde de aynı kalır.

## Mühürler

| Hayvan | English | Romaji | Katakana |
|---|---|---|---|
| Fare | Rat | Ne | ネ |
| Öküz | Ox | Ushi | ウシ |
| Kaplan | Tiger | Tora | トラ |
| Tavşan | Hare | U | ウ |
| Ejderha | Dragon | Tatsu | タツ |
| Yılan | Snake | Mi | ミ |
| At | Horse | Uma | ウマ |
| Koç | Ram | Hitsuji | ヒツジ |
| Maymun | Monkey | Saru | サル |
| Kuş | Bird | Tori | トリ |
| Köpek | Dog | Inu | イヌ |
| Yaban Domuzu | Boar | I | イ |

## Arka plan görselleri

Açılış ve oyun ekranı arka planları isteğe bağlı. Şu adlarla koyarsan
otomatik devreye girerler:

```
assets/bg/hero.png    açılış ekranı (mouse parallax'ı kod tarafında)
assets/bg/game.png    oyun ekranı
```

Dosya yoksa iki panel de kod içinde üretilen gradyan + kor parçacığı arka
planına düşer, yani eksik dosya hata değil.

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
  lang.css        TR/EN geçiş düğmesi
  title.css       oyun isminin kontur + dolgu animasyonu
  landing.css     açılış ekranı ve intro'nun zaman çizelgesi
  scroll.css      CSS ile çizilmiş açılmış parşömen çerçevesi
  hud.css         üst bar: seviye, mühür, puan, kombo, ses
  game.css        dizi ekranı, süre çubuğu, tekrar butonu, 12 mühür butonu
  overlays.css    geri sayım, tıklama parlaması, puan, kombo, oyun bitti
js/
  i18n.js         TR/EN sözlüğü ve dil değiştirme
  seals.js        12 mührün verisi, dosya yolları, geri sayım vuruş anları
  rules.js        zorluk eğrisi, süre limiti, puan formülü
  audio.js        Web Audio veri yolu; hata/kombo/tik sesleri kodda üretilir
  assets.js       görsel + ses ön yükleyici
  game.js         seviye döngüsü ve durum makinesi
  main.js         başlık animasyonu, mouse parallax, kor alanı, panel geçişi
assets/
  seals/png       şeffaf mühür kesitleri (728 px, orijinal)
  seals/color     renkli arka planlı mühür kareleri
  audio/click     el mührü sesleri + jutsu aktivasyon sesi
  audio/names     Japonca mühür adları
  audio/ui        geri sayım, başlangıç sesleri, mühür bozuldu sesi
  audio/music     açılış ve oyun ekranı döngüleri
  bg              arka plan görselleri (isteğe bağlı)
  favicon.svg     sekme ikonu (kod içinde çizilmiş çakra spirali)
  icon-180.png    iOS ana ekran ikonu
  og-image.jpg    paylaşım önizleme görseli
  cursor          kunai imleci
  fonts           başlık ve geri sayım fontu + lisansı
```

## Notlar

- **Fontlar.** Başlık ve geri sayım rakamları *Ninja Naruto* (sk89q), geri
  kalan her şey *Noto Serif JP*. Ninja Naruto yalnızca ASCII kapsıyor, Türkçe
  karakteri yok; bu yüzden yalnız bu iki yerde kullanılıyor. Lisansı
  değiştirilmeden ve ücretsiz dağıtılmasını şart koştuğu için `.ttf` olduğu
  gibi, `assets/fonts/njnaruto-license.txt` ile birlikte duruyor.
- **Geri sayım senkronu.** `sayac_sesi.wav` dosyasının dalga formundan çıkarılan
  vuruş anları (210 / 1100 / 2210 / 3200 ms) `js/seals.js` içinde sabit; rakamlar
  bu anlara oturuyor. Sesi değiştirirsen bu değerleri de güncelle.
- **Hata, kombo ve tik sesleri** için ayrı dosya yok; Web Audio ile kod içinde
  üretiliyorlar (`js/audio.js`).
- **Müzik döngüsü.** `source.loop` ile dönüyor; mp3'lerin başında/sonunda kodlayıcı
  dolgusu varsa döngü noktasında ufak bir boşluk duyulabilir. Duyulursa dosyanın
  başı ile sonu arasına kısa bir crossfade uygulamak yeterli.
- **Parşömen çerçevesi** görsel değil, CSS. Token'larla yeniden renklendirilebilir
  ve her boyutta keskin kalır.
- `prefers-reduced-motion` açıksa animasyonlar ve kor parçacıkları devre dışı kalır.
- `assets/` altındaki görsel ve ses dosyalarının hakları sahiplerine aittir.
