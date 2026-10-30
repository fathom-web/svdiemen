# FootballForge · SV Diemen

FootballForge is de teammanager voor **JO16-3, JO16-2 en JO14-3** op GitHub Pages.

## Starten
Open https://fathom-web.github.io/svdiemen/, klik een team en voer code **1111** in. Daarna verschijnt het eigen dashboard. De knop **← Teams** gaat terug naar de startpagina.

JO16-3 behoudt de bestaande spelers, wedstrijden en Supabase-opslag. JO16-2 en JO14-3 beginnen met lege teams die je zelf kunt vullen.

## Gedeelde opslag
Alle teams gebruiken de bestaande Supabase-tabel `public.jo163_app_state`, record `id = 1`. **Geen extra SQL nodig** als `supabase-setup.sql` eerder is uitgevoerd.

De opslag is zo ingericht:
- **JO16-3** blijft het bestaande hoofddocument; alle eerdere gegevens blijven beschikbaar.
- **JO16-2** staat apart onder `data.footballforgeTeams["jo16-2"]`.
- **JO14-3** staat apart onder `data.footballforgeTeams["jo14-3"]`.

Nieuwe teams worden bij de eerste databaseverbinding automatisch aangemaakt. Bij opslaan wordt eerst de nieuwste gedeelde versie opgehaald en vervolgens met een `updated_at`-vergelijking alleen de actuele teamgegevens samengevoegd. Op die manier overschrijft een wijziging in JO16-2 niet de data van JO16-3.

Elke 30 seconden worden teamgegevens opnieuw geladen als er niet wordt getypt of gesynchroniseerd. Er blijft ook een lokale reservekopie op het apparaat. Op het teamdashboard staat de status van de Supabase-verbinding.

**Beveiliging:** code 1111 is uitsluitend een client-side toegangsdrempel, geen veilige login. De bestaande testdatabase is toegankelijk voor anonieme clients. Sla geen gevoelige persoonsgegevens op; echte gebruikersauthenticatie en toegangsregels zijn nodig vóór uitgebreider gebruik.

## Functies
- Training dinsdag/donderdag en blessurestatus
- Wedstrijden en wedstrijd-aanwezigheid
- 4-3-3 met twee controlerende middenvelders
- Volledige wisselrondes na 20 minuten eerste helft, rust en 20 minuten tweede helft; JO16 speelt 2×40 minuten, JO14 speelt 2×35 minuten
- Officials en speelminuten
- WhatsApp-ouderbericht met Google Maps-route
- Downloadbare PNG-wedstrijdposter met logo's, weer, veld en officials
- Import/export als JSON

## Bestanden
- `index.html`: hoofdpagina, teamkeuze en toegangscode
- `team.html`: teamdashboard, Supabase-synchronisatie
- `lineup-engine.js`: opstellingen en wissels
- `parent-message.js`: wedstrijdberichten en posters
- `club-logos.js`: clublogo's
- `supabase-setup.sql`: oorspronkelijke databaseaanmaak
- `scripts/friday-lineup.cjs`: automatische vrijdagopstelling voor JO16-3

## Synchronisatie testen
1. Open een team, voer code 1111 in en kijk of Supabase onderaan als verbonden wordt gemeld.
2. Klik op **Test database-sync**. FootballForge schrijft een onschuldige controlewaarde naar dit team en leest die rechtstreeks terug uit Supabase. Succes is: **lezen én schrijven in Supabase geslaagd**.
3. Voeg op apparaat A een testspeler toe (bijvoorbeeld in JO16-2).
4. Open hetzelfde team op apparaat B en controleer of de speler verschijnt na verversen of maximaal 30 seconden.
5. Controleer dat wijzigingen in JO16-2 en JO14-3 geen JO16-3-gegevens vervangen.

Als de database niet reageert, blijft lokale opslag werken maar synchroniseert het team niet. Controleer dan de foutmelding onderaan het dashboard.

Sportlink/VoetbalAssist is nog niet gekoppeld. De automatische opstellingen draaien **vrijdag vanaf 11:00 uur Europe/Amsterdam** met GitHub Actions en herhalingscontroles tijdens de late ochtend. Dit geldt voor alle drie de teams. De taak werkt alleen als er een zaterdagwedstrijd én minstens elf inzetbare spelers (inclusief keeper) zijn. Hij slaat teams zonder programma over en overschrijft bestaande opstellingen voor dezelfde wedstrijd niet. GitHub Actions kan vertraging hebben. Handmatig testen kan via **Actions → FootballForge – vrijdag 11:00 opstellingen → Run workflow → dry_run=true**. Sportlink/VoetbalAssist is nog niet gekoppeld.
