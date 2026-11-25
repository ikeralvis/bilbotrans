// BilboTrans · widget de iOS para la app Scriptable (https://scriptable.app)
// 1) Instala Scriptable. 2) Crea un script nuevo y pega este código.
// 3) Edita STATIONS. 4) Añade un widget de Scriptable a la pantalla de inicio,
//    elige este script y, en "Parameter", opcionalmente "ABA,PLE" para sobrescribir las estaciones.
const BASE = "https://bilbotrans.vercel.app";
const STATIONS = ["ABA", "PLE"]; // hasta 4 en widget mediano, 2 en pequeño
const L1 = new Color("#f97316");
const L2 = new Color("#3a3a3f");

const codes = (args.widgetParameter || STATIONS.join(",")).split(",").map((s) => s.trim().toUpperCase()).slice(0, 4);

async function load() {
  const req = new Request(`${BASE}/api/metro/widget?stations=${codes.join(",")}`);
  req.timeoutInterval = 8;
  return await req.loadJSON();
}

const w = new ListWidget();
w.backgroundColor = Color.dynamic(new Color("#f2f2f7"), new Color("#1c1c1e"));
w.setPadding(12, 12, 12, 12);
w.refreshAfterDate = new Date(Date.now() + 5 * 60 * 1000); // iOS decide el ritmo real

try {
  const data = await load();
  const compact = config.widgetFamily === "small";
  for (const st of data.stations) {
    const title = w.addText(st.name ?? st.code);
    title.font = Font.boldSystemFont(compact ? 13 : 14);
    title.textColor = Color.dynamic(Color.black(), Color.white());
    if (st.error || !st.next.length) {
      const t = w.addText(st.error ? "Sin datos" : "Sin trenes");
      t.font = Font.systemFont(12);
      t.textColor = Color.gray();
    } else {
      for (const n of st.next) {
        const row = w.addStack();
        row.centerAlignContent();
        const chip = row.addStack();
        chip.backgroundColor = n.line === "L1" ? L1 : L2;
        chip.cornerRadius = 4;
        chip.setPadding(1, 4, 1, 4);
        const c = chip.addText(n.line);
        c.font = Font.boldSystemFont(10);
        c.textColor = Color.white();
        row.addSpacer(6);
        const d = row.addText(n.destination);
        d.font = Font.systemFont(12);
        d.lineLimit = 1;
        d.textColor = Color.dynamic(Color.black(), Color.white());
        row.addSpacer();
        const m = row.addText(n.minutes <= 0 ? "ya" : `${n.minutes} min`);
        m.font = Font.boldMonospacedSystemFont(12);
        m.textColor = Color.dynamic(Color.black(), Color.white());
      }
    }
    w.addSpacer(6);
  }
  const hh = new Date(data.updatedAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  const foot = w.addText(`Actualizado ${hh}`);
  foot.font = Font.systemFont(9);
  foot.textColor = Color.gray();
} catch (e) {
  const t = w.addText("Sin conexión");
  t.textColor = Color.gray();
}

if (config.runsInWidget) Script.setWidget(w);
else await w.presentMedium();
Script.complete();
