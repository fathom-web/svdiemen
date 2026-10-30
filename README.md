# FootballForge · SV Diemen

FootballForge is de teammanager voor **JO16-3, JO16-2 en JO14-3** op GitHub Pages.

## Clubhouse-uitstraling (2026)
- Nieuwe warm-witte, donkergroene voetbalinterface: geen neonblauw IT-dashboard.
- Origineel FootballForge-wapenschild in `footballforge-mark.svg`, gebruikt als logo en favicon.
- Hoofdpagina met drie teamkaarten, elk met dezelfde PIN-flow.
- Teamdashboard met linkerzijbalk op desktop en compacte navigatie op mobiel/tablet.
- Nieuwe snelle acties voor wedstrijd, training en spelers.
- Op mobiel wissel je met vier tabs tussen de vier opstellingen; op desktop vergelijk je ze naast elkaar.
- Alle teamdata, Supabase-synchronisatie, vrijdagautomatisering en PDF-export blijven intact.
- Fotografie is decoratief, gebruikt publieke Unsplash-afbeeldingen en heeft een groene achtergrondkleur als fallback.

## Starten
Open https://fathom-web.github.io/svdiemen/ en kies een team. **JO16-2 heeft code 2222**; JO16-3 en JO14-3 houden code **1111**. Daarna verschijnt het eigen dashboard. De knop **← Teams** gaat terug naar de startpagina.

JO16-3 behoudt de bestaande spelers, wedstrijden en Supabase-opslag. JO16-2 en JO14-3 beginnen met lege teams die je zelf kunt vullen.

## Gedeelde opslag
Alle teams gebruiken de bestaande Supabase-tabel `public.jo163_app_state`, record `id = 1`. **Geen extra SQL nodig** als `supabase-setup.sql` eerder is uitgevoerd.

De opslag is zo ingericht:
- **JO16-3** blijft het bestaande hoofddocument; alle eerdere gegevens blijven beschikbaar.
- **JO16-2** staat apart onder `data.footballforgeTeams["jo16-2"]`.
- **JO14-3** staat apart onder `data.footballforgeTeams["jo14-3"]`.

Nieuwe teams worden bij de eerste databaseverbinding automatisch aangemaakt. Bij opslaan wordt eerst de nieuwste gedeelde versie opgehaald en vervolgens met een `updated_at`-vergelijking alleen de actuele teamgegevens samengevoegd. Op die manier overschrijft een wijziging in JO16-2 niet de data van JO16-3.

Elke 30 seconden worden teamgegevens opnieuw geladen als er niet wordt getypt of gesynchroniseerd. Er blijft ook een lokale reservekopie op het apparaat. Op het teamdashboard staat de status van de Supabase-verbinding.

**Beveiliging:** de teamcodes zijn uitsluitend een client-side toegangsdrempel, geen veilige login. De bestaande testdatabase is toegankelijk voor anonieme clients. Sla geen gevoelige persoonsgegevens op; echte gebruikersauthenticatie en toegangsregels zijn nodig vóór uitgebreider gebruik.

## Functies
- Training dinsdag/donderdag en blessurestatus, met **standaard aanwezig** voor iedere vaste speler. Alleen expliciete afwezigmeldingen (`no`) sluiten uit.
- Herbruikbare **gastspelerslijst** met naam, rugnummer, herkomst en voorkeursposities; gastspelers worden pas meegenomen bij een wedstrijd wanneer ze daar zijn aangevinkt.
- Per wedstrijd standaard alle vaste spelers beschikbaar, tenzij als afwezig of geblesseerd gemarkeerd.
- Wedstrijden en wedstrijd-aanwezigheid
- 4-3-3 met twee controlerende middenvelders
- Volledige wisselrondes na 20 minuten eerste helft, rust en 20 minuten tweede helft; JO16 speelt 2×40 minuten, JO14 speelt 2×35 minuten
- Vier visuele veldopstellingen per wedstrijd: start, 20 minuten 1e helft, rust en 20 minuten 2e helft
- **Download PDF · 4 pagina’s** op het wedstrijdscherm: één A4-pagina per veldopstelling met alle bijbehorende UIT → IN-wissels, datum, tegenstander en verzameltijd. Geen externe PDF-service.
- Bij elk wisselmoment staan de namen van de uitgaande en inkomende spelers inclusief posities; de bestaande wisseltijdlijn blijft staan
- Bij handmatig verwisselen van basisspelers worden de drie volgende veldplaatjes en de wisselteksten opnieuw berekend
- Scheidsrechter- en grensrechterrotatie voor JO16-3 en JO14-3; **niet voor JO16-2** (ook verborgen in oudersbericht, poster, historie en het dashboard).
- Officials en speelminuten
- WhatsApp-ouderbericht met Google Maps-route
- Downloadbare PNG-wedstrijdposter met logo's, weer, veld en officials
- Import/export als JSON

## Bestanden
- `index.html`: Clubhouse-hoofdpagina, teamkeuze en toegangscode
- `clubhouse.css`: gedeelde responsive warm-witte/donkergroene vormgeving
- `footballforge-mark.svg`: originele FootballForge-merkidentiteit
- `team.html`: teamdashboard, Supabase-synchronisatie
- `lineup-engine.js`: opstellingen en wissels
- `matchday-pdf.js`: lokale PDF-export van vier opstellingen en wisselregels
- `parent-message.js`: wedstrijdberichten en posters
- `club-logos.js`: clublogo's
- `supabase-setup.sql`: oorspronkelijke databaseaanmaak
- `scripts/friday-lineup.cjs`: automatische vrijdagopstelling voor JO16-3

## Synchronisatie testen
1. Open een team, voer de bijbehorende teamcode in en kijk of Supabase onderaan als verbonden wordt gemeld.
2. Klik op **Test database-sync**. FootballForge schrijft een onschuldige controlewaarde naar dit team en leest die rechtstreeks terug uit Supabase. Succes is: **lezen én schrijven in Supabase geslaagd**.
3. Voeg op apparaat A een testspeler toe (bijvoorbeeld in JO16-2).
4. Open hetzelfde team op apparaat B en controleer of de speler verschijnt na verversen of maximaal 30 seconden.
5. Controleer dat wijzigingen in JO16-2 en JO14-3 geen JO16-3-gegevens vervangen.

Als de database niet reageert, blijft lokale opslag werken maar synchroniseert het team niet. Controleer dan de foutmelding onderaan het dashboard.

De automatische opstellingen draaien **vrijdag vanaf 11:00 uur Europe/Amsterdam** met GitHub Actions en herhalingscontroles tijdens de late ochtend. Dit geldt voor alle drie de teams. De taak werkt alleen als er een zaterdagwedstrijd én minstens elf inzetbare spelers (inclusief keeper) zijn. Hij slaat teams zonder programma over en overschrijft bestaande opstellingen voor dezelfde wedstrijd niet. GitHub Actions kan vertraging hebben. Handmatig testen kan via **Actions → FootballForge – vrijdag 11:00 opstellingen → Run workflow → dry_run=true**. Sportlink/VoetbalAssist is nog niet gekoppeld.

## Trainingsdagen per team
- **JO16-2:** maandag, woensdag en vrijdag. Drie trainingsdagen zichtbaar op het trainingsscherm én op het dashboard.
- **JO16-3 en JO14-3:** dinsdag en donderdag, ongewijzigd.
- Iedere vaste speler staat standaard op **verwacht**; trainers melden alleen uitzonderingen als **afwezig**.
- Afwezigheden blijven per week en per dag bewaard in Supabase met bestaande dagcodes (`ma`, `wo`, `vr`, `di`, `do`). Er wordt geen bestaande data gewist of omgezet.
- De automatische opstellingsmotor rekent voor JO16-2 met maandag/woensdag/vrijdag en voor de andere teams met dinsdag/donderdag. Het automatische vrijdagmoment blijft 11:00 uur.

## JO16-2 inrichting – belangrijke aandachtspunten
De bestaande JO16-2-spelers en het door de trainers ingevoerde wedstrijdprogramma worden **niet** door een migratie of seed vervangen. Spelers zonder positie blijven bestaan; vul hun posities in voordat je een zinvolle opstelling verwacht. Er moet minimaal één speler voorkeurpositie **1 (keeper)** hebben.

Gastspeler toevoegen: **Spelers → Gastspelers**; naam invullen, eventueel rugnummer, posities en team van herkomst. Selecteren: **Wedstrijd → Gastspelers voor deze wedstrijd**. De gast telt alleen bij die geselecteerde wedstrijd mee, ook in de vrijdag 11:00-automatisering en de vierpagina-PDF.

Zowel dinsdag/donderdag als bij de zaterdagwedstrijd geldt: **iedere vaste speler is automatisch aanwezig/beschikbaar**, tenzij je op Afwezig zet of als geblesseerd markeert. Een gastspeler is juist **standaard niet geselecteerd**.

## Bescherming tegen lege cloudgegevens (30 oktober 2026)
De app bewaart nu bij niet-lege teams een extra herstelkopie in de browser onder `footballforge-recovery-<team>`. Wanneer de Supabase-versie minder teaminhoud bevat dan de lokale browser, wordt de rijkere lokale versie **niet meer stilzwijgend overschreven**. De app toont dan een waarschuwing; de trainer kan zelf besluiten lokale gegevens te publiceren of de cloudversie te gebruiken.

Onder **Historie → Controleer jouw teamgegevens → Controleer gegevens** staan de aantallen spelers en wedstrijden in de browser, Supabase en het herstelpunt. Een historische browserkopie is niet gegarandeerd beschikbaar als de eerdere app die gegevens al overschreef.

Onder **Historie → Voeg spelers/programma toe** kan een JSON met `teamName`, `players` en `fixtures` veilig worden samengevoegd. Spelers met dezelfde naam en wedstrijden met dezelfde datum + tegenstander worden niet nogmaals toegevoegd. De bestaande opstellingen, trainingen en andere gegevens blijven behouden. **Volledige back-up terugzetten** is een aparte actie die wel bestaande teamgegevens kan vervangen.

De incorrecte JO16-3-stafbadge is uit de historiepagina verwijderd (ook voor JO16-3); er worden geen afbeeldingen of namen van stafleden van andere teams meer getoond.

## JO16-2 – éénmalig gegevensherstel uit screenshots (30 oktober 2026)
FootballForge heeft een eenmalige herstelset in `jo16-2-recovery.js` met **16 zichtbaar genoemde spelers** en **6 wedstrijden (7 november t/m 5 december 2026)** uit de door de trainers aangeleverde screenshots. De voorkeursposities blijven leeg, behalve Senna Yildirim (GK). De data worden **alleen aan JO16-2 toegevoegd**, bestaande spelers op naam en wedstrijden op datum/tegenstander worden niet dubbel aangemaakt. Het veld `jo162ScreenshotSeedVersion=1` voorkomt opnieuw toevoegen wanneer een trainer later bewust een speler of wedstrijd verwijdert.

De eerste keer dat JO16-2 wordt geopend na publicatie, vult de app de ontbrekende gegevens automatisch aan via de bestaande Supabase-rij met compare-and-swap. De andere teams blijven ongewijzigd. Testgevallen met een volledig lege cloud en met al bestaande spelers/wedstrijden zijn doorlopen. De daadwerkelijke productie-run moet nog worden bevestigd via het dashboard.

**Privacy:** de huidige GitHub Pages- en Supabase-testopzet heeft geen echte gebruikersauthenticatie. De publieke herstelset bevat namen van jeugdspelers; verplaats de spelersgegevens naar een beveiligde gegevensbron en stel Supabase Auth + teamgebonden RLS in voordat de website buiten de trainersgroep wordt gebruikt.
