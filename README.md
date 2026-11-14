# Pamiętam

Osobisty dziennik i asystent pracy. Napisz albo powiedz — porządek później.

Aplikacja PWA w czystym JavaScripcie: bez instalacji zależności i bez kroku budowania.
Dane (teksty i nagrania) zostają lokalnie w przeglądarce (IndexedDB).
Architektura, model danych, plan etapów i ryzyka: [docs/ARCHITEKTURA.md](docs/ARCHITEKTURA.md).

## Uruchomienie

```
powershell -NoProfile -ExecutionPolicy Bypass -File serve.ps1
```

Następnie otwórz w **Chrome** `http://localhost:5173/`
(Chrome jest potrzebny do transkrypcji; w Firefoksie działa nagrywanie bez transkrypcji).

## Testy

Przy uruchomionym serwerze otwórz `http://localhost:5173/tests/`.
Tytuł karty pokazuje wynik, np. `PASS 22/22`.

## iPhone

Mikrofon działa tylko przez HTTPS (albo `localhost`). Katalog trzeba opublikować
na statycznym hostingu z HTTPS pod stałym adresem (np. GitHub Pages) — dane i tak
zostają w telefonie. Potem w Safari: Udostępnij → „Do ekranu początkowego”
i uruchamiaj aplikację z ikony (tak dane są chronione przed automatycznym usuwaniem).
Szczegóły i ograniczenia: [docs/ARCHITEKTURA.md](docs/ARCHITEKTURA.md#11-iphone-15-pro--konsekwencje).
