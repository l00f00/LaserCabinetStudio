# Laser Cabinet Studio v1

Configuratore parametrico, interamente client-side, per progettare mobiletti in MDF tagliati al laser. Genera modello 3D, incastri compensati per il kerf, nesting su più tavole e file SVG/DXF con livelli separati per taglio e marcatura.

Demo: [laser-cabinet-studio.l00f00.chatgpt.site](https://laser-cabinet-studio.l00f00.chatgpt.site/)

## Funzioni v1

- fianchi da 45° a 135°, ripiani e frontalini configurabili;
- finger joint e code di rondine complementari tra moduli;
- divisione automatica con rondine per pezzi oltre l'area macchina;
- sportelli e cassetti multipli, divisori interni e apertura destra/sinistra;
- maniglie tagliate: foro tondo, ellittico o asola rettangolare;
- nesting con rotazione, conteggio tavole e rendimento materiale;
- pannello Riepilogo con miniatura 3D, ingombro, pezzi, tavole, moduli e taglio stimato;
- versioni del progetto salvabili e richiamabili dal `localStorage` del browser;
- piano completo scaricabile in un unico ZIP con JSON, tutte le tavole SVG e tutti i DXF;
- SVG/DXF per ogni tavola: livello rosso `CUT`, livello blu `MARK`;
- marcatura del nome nell'angolo inferiore destro di ogni pezzo;
- stato condivisibile via URL e progetto JSON scaricabile;
- JavaScript API e strumenti WebMCP per agenti.

## Stack

- HTML5 e CSS responsive, senza framework;
- JavaScript ES2022 per geometria parametrica e interfaccia;
- Canvas 2D per il modello 3D, SVG per il piano di taglio;
- esportazione SVG e DXF generata nel browser;
- Node.js built-in test runner/assert per le verifiche geometriche;
- hosting statico OpenAI Sites, senza database né account utente.

Non ci sono dipendenze runtime o passaggi di build.

## Avvio locale

Richiede Node.js 18 o successivo.

```bash
npm run dev
```

Apri `http://127.0.0.1:4173`. Per verificare il progetto:

```bash
npm test
npm run check
```

## API per agenti

Con la pagina aperta:

```js
LaserCabinetStudio.getState();
LaserCabinetStudio.configure({ width: 600, height: 700, depth: 300, kerf: 0.05 });
LaserCabinetStudio.applyPreset("kitchen");
LaserCabinetStudio.exportSvg(1);
LaserCabinetStudio.listLocalProjects();
LaserCabinetStudio.saveLocal();
LaserCabinetStudio.exportPlanZip();
```

Nei browser compatibili vengono registrati anche quattro strumenti WebMCP: `get_cabinet_state`, `configure_cabinet`, `apply_cabinet_preset` e `get_cut_plan`. Il contratto completo è in [skills/laser-cabinet-studio/references/api.md](skills/laser-cabinet-studio/references/api.md).

La skill Codex associata si trova in [skills/laser-cabinet-studio](skills/laser-cabinet-studio). Può essere copiata nella cartella delle skill di Codex oppure mantenuta insieme al repository.

## Buy Me a Coffee

Inserisci l'URL pubblico del tuo profilo in `dist/config.js`:

```js
window.LaserCabinetConfig = Object.freeze({
  buyMeACoffeeUrl: "https://buymeacoffee.com/tuo-profilo"
});
```

Il pulsante “Offrimi un caffè” è già presente nella testata. Finché il campo resta vuoto mostra soltanto un promemoria e non porta a un profilo inesistente.

## Pubblicazione su GitHub

La root del repository è questa cartella. Dopo aver creato un repository GitHub vuoto:

```bash
git remote add origin https://github.com/TUO-UTENTE/laser-cabinet-studio.git
git push -u origin main
```

Se `origin` esiste già, usa un nome diverso oppure sostituiscilo consapevolmente dopo averne verificato l'URL.

## Sicurezza macchina

Velocità, potenza, kerf e interferenza sono parametri di progetto. Prima del mobile definitivo esegui sempre un provino sullo stesso materiale e verifica quote, fuoco, ventilazione e compatibilità dei file con il software del laser.
