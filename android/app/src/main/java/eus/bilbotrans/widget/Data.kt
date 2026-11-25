package eus.bilbotrans.widget

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.text.Normalizer
import java.time.LocalDateTime
import java.time.ZoneId

data class Station(val code: String, val name: String)

data class Train(val atMs: Long, val clock: String, val towards: String)

data class RouteData(val fetchedAt: Long, val line: String, val durationMin: Int, val trains: List<Train>)

data class WidgetConfig(val from: String, val fromName: String, val to: String, val toName: String)

/** Las 42 estaciones (código y nombre), copiadas del catálogo de la web a `assets/stations.json`. */
object Stations {
    @Volatile private var cache: List<Station>? = null

    fun all(ctx: Context): List<Station> = cache ?: synchronized(this) {
        cache ?: run {
            val text = ctx.assets.open("stations.json").bufferedReader().use { it.readText() }
            val arr = JSONArray(text)
            List(arr.length()) { i -> arr.getJSONObject(i).let { Station(it.getString("code"), it.getString("name")) } }
                .sortedBy { it.name }
                .also { cache = it }
        }
    }

    fun norm(s: String): String =
        Normalizer.normalize(s.trim(), Normalizer.Form.NFD).replace(Regex("\\p{M}+"), "").lowercase()
}

/**
 * Tiempo real directo contra la API pública de Metro Bilbao: el widget no pasa por Vercel, así que no gasta
 * peticiones del servidor de la web. Una llamada devuelve unos 8 trenes con su hora prevista.
 */
object MetroApi {
    private val zone = ZoneId.of("Europe/Madrid")

    fun fetch(from: String, to: String): RouteData {
        val conn = URL("https://api.metrobilbao.eus/metro/real-time/$from/$to").openConnection() as HttpURLConnection
        try {
            conn.connectTimeout = 6000
            conn.readTimeout = 6000
            conn.useCaches = false
            conn.setRequestProperty("Accept", "application/json")
            // Sin reutilizar conexiones: una conexión «viva» que el móvil ya cerró da «unexpected end of stream»
            conn.setRequestProperty("Connection", "close")
            if (conn.responseCode != 200) error("HTTP ${conn.responseCode}")
            val root = JSONObject(conn.inputStream.bufferedReader().use { it.readText() })
            val trip = root.getJSONObject("trip")
            val arr = root.getJSONArray("trains")
            val trains = List(arr.length()) { i ->
                val t = arr.getJSONObject(i)
                // "time" es la hora local de Bilbao sin zona: 2026-11-08T21:13:05
                val ms = LocalDateTime.parse(t.getString("time")).atZone(zone).toInstant().toEpochMilli()
                Train(ms, t.getString("timeRounded"), t.optString("direction"))
            }.sortedBy { it.atMs }
            return RouteData(System.currentTimeMillis(), trip.optString("line"), trip.optInt("duration"), trains)
        } finally {
            conn.disconnect()
        }
    }
}

/** Configuración de cada widget y último dato recibido por trayecto, en SharedPreferences. */
object Store {
    private const val FILE = "bt_widgets"
    private fun prefs(ctx: Context) = ctx.getSharedPreferences(FILE, Context.MODE_PRIVATE)

    fun saveConfig(ctx: Context, id: Int, c: WidgetConfig) {
        prefs(ctx).edit()
            .putString("cfg_$id", JSONObject().put("f", c.from).put("fn", c.fromName).put("t", c.to).put("tn", c.toName).toString())
            .apply()
    }

    fun config(ctx: Context, id: Int): WidgetConfig? {
        val raw = prefs(ctx).getString("cfg_$id", null) ?: return null
        return runCatching {
            val o = JSONObject(raw)
            WidgetConfig(o.getString("f"), o.getString("fn"), o.getString("t"), o.getString("tn"))
        }.getOrNull()
    }

    fun forget(ctx: Context, ids: IntArray) {
        val e = prefs(ctx).edit()
        ids.forEach { e.remove("cfg_$it") }
        e.apply()
    }

    private fun key(from: String, to: String) = "route_${from}_$to"

    fun saveRoute(ctx: Context, from: String, to: String, d: RouteData) {
        val trains = JSONArray()
        d.trains.forEach { trains.put(JSONObject().put("at", it.atMs).put("c", it.clock).put("d", it.towards)) }
        prefs(ctx).edit()
            .putString(key(from, to), JSONObject().put("at", d.fetchedAt).put("l", d.line).put("m", d.durationMin).put("trains", trains).toString())
            .apply()
    }

    fun route(ctx: Context, from: String, to: String): RouteData? {
        val raw = prefs(ctx).getString(key(from, to), null) ?: return null
        return runCatching {
            val o = JSONObject(raw)
            val arr = o.getJSONArray("trains")
            RouteData(
                o.getLong("at"), o.optString("l"), o.optInt("m"),
                List(arr.length()) { i -> arr.getJSONObject(i).let { Train(it.getLong("at"), it.getString("c"), it.optString("d")) } },
            )
        }.getOrNull()
    }

    fun saveError(ctx: Context, msg: String?) {
        prefs(ctx).edit().apply { if (msg == null) remove("last_error") else putString("last_error", msg) }.apply()
    }

    fun lastError(ctx: Context): String? = prefs(ctx).getString("last_error", null)

    fun lastManualRefresh(ctx: Context) = prefs(ctx).getLong("last_manual", 0L)
    fun markManualRefresh(ctx: Context) = prefs(ctx).edit().putLong("last_manual", System.currentTimeMillis()).apply()
}
