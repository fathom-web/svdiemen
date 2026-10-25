# SV Diemen JO16-3 Team Manager

Een mobiele webapp voor het beheren van spelers, trainingsaanwezigheid, blessures, wedstrijden, opstellingen, wisselschema's en wedstrijdberichten.

## Eerste versie
- Spelers en primaire/secundaire posities beheren
- Aanwezigheid op dinsdag en donderdag registreren
- Blessures uitsluiten
- Automatische 4-3-3-opstelling en drie volledige wisselrondes (20 minuten eerste helft, rust na 40 minuten, en 20 minuten tweede helft; alle reserves erin)
- Trainingsopkomst en eerdere speelminuten meewegen
- Vaste keeper
- Grensrechter- en scheidsrechterrotatie
- Wedstrijdbericht kopiëren voor WhatsApp
- Speelminuten en wedstrijdhistorie bijhouden
- JSON-back-up exporteren en importeren

## Gebruik
Open `index.html` in een browser, of activeer **Settings → Pages → Build and deployment → Deploy from a branch → main / (root)** in GitHub om de website online te zetten.

## Belangrijk: huidige beperkingen
Deze eerste versie is een **prototype**. Gegevens worden via `localStorage` lokaal op één apparaat opgeslagen. Traineraccounts, gedeelde database, automatische vrijdagdeadline, serverplanning, automatische verzending naar ouders en wisselcorrecties tijdens de wedstrijd bestaan nog **niet**. Een opstelling moet nu handmatig worden gegenereerd en gecontroleerd. De wisselplanning wisselt per ronde alle beschikbare veldreserves in. Positievoorkeur en speelminuten worden meegewogen, maar optimale verdeling of positiebezetting kan niet altijd gegarandeerd worden. Blessureveranderingen of wijzigingen na genereren vereisen opnieuw genereren.

Voer geen gevoelige gegevens van jeugdspelers in op gedeelde apparaten. Gebruik geen persoonsgegevens van ouders totdat toegangsbeveiliging is toegevoegd.

## Volgende stap
Bouw gedeelde opslag met authenticatie (bijvoorbeeld Supabase), voeg de vrijdag-19:00 Europe/Amsterdam servertaak toe, verbeter het wisselalgoritme en maak trainersrollen.
