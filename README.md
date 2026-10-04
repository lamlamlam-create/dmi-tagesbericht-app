# DMI Tagesbericht

Eine installierbare Web-App für Tagesberichte, Bonus-Prognose und Standortauswertung. Sie bildet die Felder der Arbeitsmappe ab: Rummelsbg, Hof, München, Pegnitz, Pegnitz 008, Cham, Arbeitszeit, Gesamtstückzahl und die Bonusstufen 1,2 / 2,0 / 2,3 / 2,6.

## Einsatz auf PC und Handy

1. Den Ordner als Website veröffentlichen, zum Beispiel über Netlify Drop oder GitHub Pages.
2. Auf dem PC und auf dem Handy dieselbe Webadresse öffnen. Auf dem Handy im Browser „Zum Home-Bildschirm“ wählen, damit die App wie eine normale App startet.
3. In der App unter **Synchronisation** die Projekt-URL und den Anon-Key eines Supabase-Projekts eintragen.
4. In Supabase den Inhalt von `supabase-setup.sql` im SQL-Editor einmal ausführen.

Ohne eingerichtete Cloud-Verbindung läuft die Anwendung vollständig offline und speichert Daten nur auf dem jeweiligen Gerät. Mit Supabase werden die Tagesberichte nach dem Speichern zwischen den Geräten abgeglichen.

Hinweis: Die Beispiel-Startwerte stammen bewusst nicht aus den leeren Tageszeilen der Excel-Datei. Dadurch wird die Excel-Mappe nicht verändert und die App beginnt mit eigenen, sauber gepflegten Einträgen.
