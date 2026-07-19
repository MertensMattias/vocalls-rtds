# Non-exception TTS reconciliation — needs confirmation

The exception op (00070) TTS was applied automatically from each flow's `Scheduler_ExceptionDisconnect` (domain markdown).

The Welcome / AdHoc / PreQueue / Menu texts below were **NOT auto-applied** — the op→prompt-key match is a judgment call. Confirm which to apply.


## DA_CC_MELDJEAAN.json  (`MELDJEAAN`)

- **00021 Play: Transfer Announcement (Lager)** — candidate key `MELDJEAAN/NL/Adhoc_Transfer`
  - current: 'U wordt zo dadelijk doorverbonden'
  - domain:  'U wordt zo dadelijk doorverbonden.'
- **00022 Play: Transfer Announcement (Middelbaar)** — candidate key `MELDJEAAN/NL/Adhoc_Transfer`
  - current: 'U wordt zo dadelijk doorverbonden'
  - domain:  'U wordt zo dadelijk doorverbonden.'
- **00023 Play: Transfer Announcement (Buitengewoon)** — candidate key `MELDJEAAN/NL/Adhoc_Transfer`
  - current: 'U wordt zo dadelijk doorverbonden'
  - domain:  'U wordt zo dadelijk doorverbonden.'
- **00050 Menu: Inschrijvingen Onderwijs** — candidate key `MELDJEAAN/NL/Menu_Main`
  - current: '\nVoor vragen over inschrijven in het kleuter of lager onderwijs, druk 1.\nVoor vragen over inschrijven in het secundair onderwijs, druk 2.\nVoor vragen over inschrijven in het buitengewoon onderwijs, druk 3.'
  - domain:  'Welkom bij de helpdesk Meld je aan. Voor vragen over inschrijven in het kleuter of lager onderwijs, druk 1. Voor vragen over inschrijven in het secundair onderwijs, druk twee. Voor vragen over inschrijven in het buitengewoon onderwijs, druk 3.'

## DA_MPA.json  (`GAPA`)

- **00001 Play: Welcome** — candidate key `GAPA/NL/Welcome`
  - current: 'Welkom bij Mobiliteit en Parkeren Antwerpen.'
  - domain:  'Goeiedag, welkom bij Mobiliteit en Parkeren Antwerpen.'
- **00024 Play: AdHoc Welcome** — candidate key `GAPA/NL/Welcome`
  - current: 'Dit is een variabele boodschap die geactiveerd kan worden.'
  - domain:  'Goeiedag, welkom bij Mobiliteit en Parkeren Antwerpen.'
- **00025 Play: AdHoc After Main Menu** — candidate key `GAPA/NL/Adhoc_Extra`
  - current: 'Dit is een variabele boodschap die geactiveerd kan worden.'
  - domain:  'Beste klant, het informaticasysteem van Stad Antwerpen werd getroffen door een cyberaanval. Hierdoor werken sommige systemen minder of niet meer. Kijk op www.antwerpen.be, schuine streep, cyberaanval, voor een overzicht van de impact op de dienstverlening.'
- **00026 Play: Please Hold** — candidate key `GAPA/NL/Menu_Transfer`
  - current: 'Blijf aan de lijn, een medewerker staat u zo dadelijk te woord.'
  - domain:  'Blijf aan de lijn. Een medewerker staat u zo dadelijk te woord.'
- **00050 Menu: Main** — candidate key `GAPA/NL/Menu_Main`
  - current: 'Ontving u een gasboete, druk 1.\nWil u bezwaar indienen voor een parkeerretributie of een parkeervergoeding,druk 2.\nHeeft u een informatieve vraag over een parkeervergunning voor bewoners, of een andere infovraag rond parkeren? druk 3.'
  - domain:  'Ontving u een gasboete? Druk 1. Wilt u bezwaar indienen voor een parkeerretributie of een parkeervergunning? Druk 2. Heeft u een informatieve vraag over een parkeervergunning voor bewoners of een andere infovraag rond parkeren? Druk 3.'

## DA_SW_LEZ_OMGEVING.json  (`SV`)

- **00020 Play: Welcome** — candidate key `SV/NL/Welcome`
  - current: 'Welkom bij de afdeling Omgeving!\nWist je dat je op onze website uitgebreide informatie over omgevingsvergunningen vindt: ga naar omgeving punt antwerpen punt b e,.\nBlijf aan de lijn als je telefonisch verder geholpen wil worden, bedankt voor jouw geduld en begrip.\nWe helpen je zo snel mogelijk verder.\nOm onze dienstverlening te verbeteren, registreren we je klantvraag en vragen we enkele persoonsgegevens op.'
  - domain:  'Welkom bij de afdeling Omgeving. U vindt alle informatie ook op onze website www.antwerpen.be. Typ in de zoekbalk Vergunningen. Wilt u toch een medewerker spreken? Blijf dan aan het toestel en maak uw keuze uit de volgende zes opties.'
- **00060 Play: Transfer Announcement** — candidate key `SV/NL/Menu_Transfer`
  - current: 'U wordt zo dadelijk doorverbonden'
  - domain:  'U wordt zo dadelijk doorverbonden.'

## DA_SW_OMGEVING.json  (`SV`)

- **00001 Play: Welcome** — candidate key `SV/NL/Welcome`
  - current: 'Welkom bij de afdeling Omgeving!\nWist je dat je op onze website uitgebreide informatie over omgevingsvergunningen vindt: ga naar omgeving punt antwerpen punt b e,.\nBlijf aan de lijn als je telefonisch verder geholpen wil worden, bedankt voor jouw geduld en begrip.\nWe helpen je zo snel mogelijk verder.\nOm onze dienstverlening te verbeteren, registreren we je klantvraag en vragen we enkele persoonsgegevens op.'
  - domain:  'Welkom bij de afdeling Omgeving. U vindt alle informatie ook op onze website www.antwerpen.be. Typ in de zoekbalk Vergunningen. Wilt u toch een medewerker spreken? Blijf dan aan het toestel en maak uw keuze uit de volgende zes opties.'
- **00025 Play: Transfer Announcement** — candidate key `SV/NL/Menu_Transfer`
  - current: 'U wordt zo dadelijk doorverbonden'
  - domain:  'U wordt zo dadelijk doorverbonden.'

## DA_SW_OMGEVING_2NDLINE.json  (`SV_2NDLINE`)

- **00020 Play: Welcome** — candidate key `SV_2NDLINE/NL/Welcome_Welcome`
  - current: 'Welkom bij de afdeling Omgeving!\nWist je dat je op onze website uitgebreide informatie over omgevingsvergunningen vindt: ga naar omgeving punt antwerpen.be..\nBlijf aan de lijn als je telefonisch verder geholpen wil worden, bedankt voor jouw geduld en begrip.\nWe helpen je zo snel mogelijk verder.\nOm onze dienstverlening te verbeteren, registreren we je klantvraag en vragen we enkele persoonsgegevens op.'
  - domain:  'Welkom bij de afdeling Omgeving. We staan klaar om je te helpen met al jouw vragen met betrekking tot omgevingsvergunningen. Wist je dat je op onze website uitgebreide informatie over omgevingsvergunningen vindt? Ga naar www.antwerpen.be, schuine streep, vergunningen. Blijf aan de lijn als je telefonisch verder geholpen wil worden. Bedankt voor jouw geduld en begrip. We helpen je zo snel mogelijk verder.'

## DA_SW_TS.json  (`TS`)

- **00024 Play: AdHoc** — candidate key `TS/NL/Adhoc_Extra`
  - current: 'Dit is een variabele boodschap die geactiveerd kan worden.'
  - domain:  "Welkom bij de dienst Tijdelijke Signalisatie. Vanaf vrijdag 24 april wijzigen onze telefoonpermanentie-uren. Wij zijn bereikbaar van maandag tot en met vrijdag tussen 9 uur 's ochtends en 1 uur 's middags, uitgezonderd feest- en brugdagen."
