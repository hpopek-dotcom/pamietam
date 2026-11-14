# Pamiętam — analiza środowiska i architektura

Stan na 2026-10-31.

## 1. Wykryte środowisko

| Element | Stan |
|---|---|
| System | Windows 11 Pro (26300), i9-8950HK, 32 GB RAM |
| Katalog projektu | pusty, bez repozytorium git |
| Node / npm / Python / Flutter / Dart | **brak** |
| Android SDK / adb / Xcode | **brak** |
| Java | 1.8 (za stara dla współczesnego Androida/Gradle) |
| Git | 2.55 |
| Przeglądarki | Chrome (Web Speech API, MediaRecorder, IndexedDB), Firefox, Opera |
| Shell | PowerShell 5.1 (+ Git Bash) |
| winget | dostępny (można doinstalować Node, gdy będzie potrzebny) |

Wniosek: nie ma żadnego natywnego SDK mobilnego. Najszybsza droga do działającej
aplikacji na telefon, bez instalowania niczego, to **PWA** (Progressive Web App):
działa w przeglądarce telefonu, instaluje się na ekranie głównym, działa offline,
ma dostęp do mikrofonu i lokalnej bazy danych.

## 2. Architektura

```
UI (widoki, komponenty)            src/ui/
   │  wywołuje
Usługi domenowe (EntryService)     src/services/
   │  korzysta z                       │ korzysta z
Repozytoria (IndexedDB)            Dostawcy AI (abstrakcje)
src/data/                          src/ai/
   │                                  ├─ transcription/  TranscriptionProvider
Model + czyste funkcje             │  ├─ (etap 2) AIProvider
src/core/  (bez zależności od DOM) │  └─ (etap 2) EmbeddingProvider
                                   Audio  src/audio/  (MediaRecorder)
```

Zasady:

- **Warstwa danych jest oddzielona od AI.** Usługi przyjmują dostawców przez parametry
  (wstrzykiwanie zależności), więc model/dostawcę/silnik lokalny można wymienić.
- **AI sugeruje, człowiek decyduje.** Wyniki AI trafiają do pól `ai*` / relacji
  o statusie `suggested`; nigdy nie nadpisują treści użytkownika.
- **Oryginał jest nienaruszalny.** Wpis głosowy przechowuje `transcript.original`
  (surowy wynik rozpoznawania) osobno od edytowalnego `content`, a także oryginalne audio.
- **Dwa światy:** każdy wpis/projekt ma pole `space: 'personal' | 'work'`.
  Wspólny silnik, ale listy, wyszukiwanie i UI zawsze filtrują po przestrzeni.
- **Local-first:** wszystko w IndexedDB na urządzeniu. Brak serwera. Synchronizacja
  i AI z chmury tylko jako opcja, z jawną informacją, co jest wysyłane.

## 3. Model danych

Wspólne pola wszystkich encji: `id` (UUID), `createdAt`, `updatedAt` (ISO 8601),
`schemaVersion`.

**Entry** — `space`, `type` (`note` | później `idea`, `task`, `event`, `remark`…),
`source` (`text` | `voice`), `title`, `content`,
`transcript` `{ original, confidence, lang, provider, createdAt } | null`,
`audioId`, `attachmentIds[]`, `tags[]`, `category`, `projectId`, `taskId`,
`people[]`, `location`, `eventDate`, `dueDate`, `importance`,
`aiSummary`, `aiClassification`.

Relacje nie są polem wpisu, tylko osobnym magazynem — dzięki temu działają w obie
strony (Entry ↔ Entry) i dla dowolnych typów.

| Magazyn (IndexedDB) | Zawartość |
|---|---|
| `entries` | wpisy (indeksy: `space`, `createdAt`, `updatedAt`) |
| `audio` | AudioRecording `{ id, entryId, blob, mimeType, durationMs, recordedAt, size }` |
| `attachments` | Attachment `{ id, entryId, blob, mimeType, name, kind }` |
| `relations` | Relation `{ id, fromType, fromId, toType, toId, kind, origin: user/ai, status: suggested/accepted }` |
| `projects` | Project `{ space, name, description, status, dueDate }` |
| `tasks` | Task `{ space, projectId, title, description, status, priority, dueDate, person }` |
| `checklistTemplates` | `{ name, items[] }` |
| `checklistInstances` | kopia szablonu `{ templateId, projectId, items[{ text, done }] }` |
| `calendarEvents` | `{ title, start, end, entryId, externalId }` |
| `people` | Person `{ name, aliases[] }` |
| `meta` | ustawienia, wersje migracji |

Etap 2+: `embeddings`, `aiAnalyses`, `conversations`. Wszystkie magazyny etapu 1
są zakładane od razu (schemat v1), więc kolejne moduły nie wymagają migracji.

## 4. Stack technologiczny

- **HTML + CSS + JavaScript (moduły ES), bez frameworka i bez kroku budowania.**
  Zero zależności, zero instalacji, kod działa wprost w przeglądarce.
  Typy opisane w JSDoc — przejście na TypeScript/Vite później nie wymaga przepisywania.
- **IndexedDB** — lokalna baza (teksty i pliki audio jako Blob).
- **MediaRecorder** — nagrywanie audio.
- **Web Speech API** — transkrypcja w MVP (za abstrakcją `TranscriptionProvider`).
- **Service Worker + manifest** — tryb offline i instalacja na telefonie.
- Serwer deweloperski: `serve.ps1` (PowerShell `HttpListener`, bez instalacji).
- Testy: własny mini-runner w przeglądarce, uruchamiany headless w Chrome.

Ścieżka rozwoju: gdy potrzebny będzie dostęp do natywnego kalendarza lub
lepsze nagrywanie w tle — opakowanie tej samej aplikacji w **Capacitor**
(wymaga Node + Android SDK), bez przepisywania warstw `core/data/services`.

## 5. Struktura katalogów

```
index.html              punkt wejścia aplikacji
manifest.webmanifest    PWA
sw.js                   service worker (offline)
serve.ps1               serwer deweloperski
styles/app.css
icons/
src/
  main.js               start aplikacji, routing
  core/                 model, tekst, oś czasu — czyste funkcje
  data/                 IndexedDB + repozytoria
  services/             logika domenowa (EntryService)
  search/               wyszukiwanie tekstowe (później semantyczne)
  audio/                nagrywanie
  ai/transcription/     dostawcy transkrypcji
  ui/                   router, helpery DOM, komponenty, widoki
tests/                  testy uruchamiane w przeglądarce
docs/
```

## 6. Audio

`getUserMedia` → `MediaRecorder` (`audio/webm;codecs=opus` w Chrome/Android,
`audio/mp4` w Safari) → Blob zapisywany w magazynie `audio` razem z czasem trwania
i datą nagrania. Odtwarzanie przez `<audio>` z `URL.createObjectURL`.

## 7. Transkrypcja

Interfejs `TranscriptionProvider` ma dwa warianty:

- **live** — `start({ lang, onUpdate }) → session.stop() → { text, confidence, … }`
  (MVP: Web Speech API, `pl-PL`, rozpoznawanie równolegle z nagrywaniem),
- **file** — `transcribe(blob, { lang })` (etap 2: Whisper przez API albo lokalnie).

Pewność rozpoznania (`confidence`) jest zapisywana, jeżeli silnik ją podaje.
Wynik trafia do edytowalnego pola — użytkownik zawsze może go poprawić.

**Prywatność:** w Chrome Web Speech wysyła dźwięk do serwerów Google. Aplikacja
pokazuje tę informację na ekranie nagrywania. Docelowo: Whisper lokalnie (na
komputerze/telefonie) albo świadomie wybrany dostawca API.

## 8. Przechowywanie danych

Całość w IndexedDB przeglądarki na urządzeniu; aplikacja prosi o
`navigator.storage.persist()`, aby przeglądarka nie usuwała danych przy braku
miejsca. Eksport (JSON/MD/CSV/ZIP z audio) i backup — etap 1b, zaraz po
kamieniu milowym, bo dane w przeglądarce trzeba umieć wynieść.

## 9. Plan MVP (etapy)

| Etap | Zakres | Stan |
|---|---|---|
| **M1** | Nowa notatka, Powiedz (nagranie + transkrypcja + edycja), oś czasu, wyszukiwanie tekstowe, podgląd wpisu z odtwarzaniem audio, edycja, usuwanie, tagi, przestrzeń Osobiste/Praca | ten etap |
| M1b | Eksport JSON/Markdown/CSV, pełny backup ZIP i odtwarzanie, zdjęcia w notatce | |
| M2 | Moduł Praca: projekty, zadania, terminy, szablony checklist i ich kopie | |
| M3 | Warstwa AI (`AIProvider`): streszczenie, tagi, daty, sugestie projektu/zadania — jako karty „Rozpoznałem… Dodać?” | |
| M4 | Embeddings + wyszukiwanie semantyczne, relacje Entry ↔ Entry, projekty osobiste | |
| M5 | Kalendarz (eksport .ics, potem natywny przez Capacitor), „Porozmawiaj z dziennikiem” ze źródłami | |
| M6 | Podsumowania okresowe, mapa myśli, synchronizacja i szyfrowane backupy | |

## 10. Ryzyka techniczne

1. **Web Speech API** — działa tylko w przeglądarkach z rodziny Chrome (i Safari);
   Firefox nie ma rozpoznawania mowy. Wysyła audio do Google. Po kilku sekundach
   ciszy sam się zatrzymuje (aplikacja wznawia go automatycznie).
2. **Android: konflikt mikrofonu** — na części telefonów rozpoznawanie mowy
   i MediaRecorder nie mogą jednocześnie używać mikrofonu. Wtedy zostaje samo
   nagranie (treść można wpisać). Docelowe rozwiązanie: transkrypcja pliku (Whisper).
3. **Telefon wymaga HTTPS** — mikrofon działa tylko w bezpiecznym kontekście
   (`localhost` lub HTTPS). Do testów na telefonie potrzebny hosting statyczny z HTTPS
   (np. GitHub Pages/Netlify — dane i tak zostają w telefonie) albo tunel.
4. **Trwałość danych w przeglądarce** — wyczyszczenie danych witryny usuwa dziennik.
   Stąd `storage.persist()` i wysoki priorytet eksportu/backupu (M1b).
5. **iPhone (docelowe urządzenie: iPhone 15 Pro)** — patrz sekcja 11.
6. **Kalendarz** — przeglądarka nie ma dostępu do kalendarza systemowego;
   do etapu Capacitor: plik `.ics`.
7. **Brak kroku budowania** — prostota kosztem braku TypeScriptu i bundlera;
   świadomie odwracalne (patrz pkt 4).

## 11. iPhone 15 Pro — konsekwencje

- **Każda przeglądarka na iOS to WebKit** (także Chrome). Liczy się zachowanie Safari.
- **Instalacja:** Safari → Udostępnij → „Do ekranu początkowego”. To ważne nie tylko
  dla wygody: strony otwierane w samej przeglądarce Safari mogą stracić dane po
  7 dniach nieużywania, aplikacje z ekranu początkowego są z tej reguły wyłączone.
- **Nagrywanie:** MediaRecorder w Safari zapisuje `audio/mp4` (AAC) — aplikacja
  wybiera format automatycznie, odtwarzanie działa natywnie.
- **Transkrypcja na żywo:** Safari ma `webkitSpeechRecognition` (rozpoznawanie przez
  Apple), ale jednoczesne nagrywanie i rozpoznawanie na iOS bywa zawodne,
  a tryb ciągły potrafi się urywać. Aplikacja zawsze zachowuje nagranie, więc nic
  nie ginie, ale transkrypcja może być pusta. **Wniosek: na iPhonie docelowo
  transkrypcja pliku po nagraniu** (`kind: 'file'`, np. Whisper przez API —
  z jawną zgodą na wysłanie audio — albo lokalnie przez WebGPU, co na 15 Pro jest
  możliwe, ale ciężkie: model 75–250 MB). Ten krok warto przyspieszyć.
- **Doraźnie:** w „Nowej notatce” działa systemowe dyktowanie z klawiatury iOS
  (przycisk mikrofonu) — rozpoznaje po polsku, częściowo na urządzeniu.
- **Zgoda na mikrofon:** w trybie aplikacji z ekranu początkowego iOS może pytać
  o mikrofon częściej niż natywna aplikacja.
- **HTTPS wymagane:** iPhone nie otworzy mikrofonu z `http://` po sieci lokalnej.
  Potrzebny stały adres HTTPS (np. GitHub Pages). Adres musi być stały, bo dane
  w IndexedDB są przypisane do adresu — zmiana adresu = pusty dziennik.
- **Aplikacja natywna (Swift / Capacitor / Expo) wymaga Maca** albo usługi budowania
  w chmurze (np. EAS Build) i konta Apple Developer (99 USD/rok). Daje to natywne
  rozpoznawanie mowy na urządzeniu i dostęp do kalendarza — rozważyć na etapie M5.
