package eus.bilbotrans.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.SystemClock
import android.widget.RemoteViews
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit

const val ACTION_REFRESH = "eus.bilbotrans.widget.REFRESH"
private const val WEB = "https://bilbotrans.vercel.app"

/** Pinta un widget con lo último guardado. Los minutos corren solos (Chronometer): no hace falta pedir datos para que bajen. */
object Render {
    fun update(ctx: Context, mgr: AppWidgetManager, id: Int) {
        val views = RemoteViews(ctx.packageName, R.layout.widget_metro)
        val cfg = Store.config(ctx, id)
        views.removeAllViews(R.id.rows)

        if (cfg == null) {
            views.setTextViewText(R.id.title, "BilboTrans")
            views.setTextViewText(R.id.updated, "")
            views.setViewVisibility(R.id.empty, android.view.View.VISIBLE)
            views.setTextViewText(R.id.empty, "Toca para elegir origen y destino")
            views.setOnClickPendingIntent(R.id.root, configIntent(ctx, id))
            mgr.updateAppWidget(id, views)
            return
        }

        views.setTextViewText(R.id.title, "${cfg.fromName} → ${cfg.toName}")
        views.setOnClickPendingIntent(R.id.refresh, refreshIntent(ctx, id))
        views.setOnClickPendingIntent(R.id.root, openWebIntent(ctx, id, cfg))

        val data = Store.route(ctx, cfg.from, cfg.to)
        val now = System.currentTimeMillis()
        val minHeight = mgr.getAppWidgetOptions(id).getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 110)
        val maxRows = ((minHeight - 52) / 44).coerceIn(1, 4)
        // Un tren que acaba de salir se queda 20 s; después se descarta
        val upcoming = data?.trains?.filter { it.atMs > now - 20_000 }?.take(maxRows).orEmpty()

        if (data == null) {
            views.setViewVisibility(R.id.empty, android.view.View.VISIBLE)
            views.setTextViewText(R.id.empty, "Cargando trenes…")
            views.setTextViewText(R.id.updated, "")
        } else if (upcoming.isEmpty()) {
            views.setViewVisibility(R.id.empty, android.view.View.VISIBLE)
            views.setTextViewText(R.id.empty, "Sin trenes próximos. Toca ↻ para actualizar.")
            views.setTextViewText(R.id.updated, clock(data.fetchedAt))
        } else {
            views.setViewVisibility(R.id.empty, android.view.View.GONE)
            views.setTextViewText(R.id.updated, clock(data.fetchedAt))
            upcoming.forEach { t ->
                val row = RemoteViews(ctx.packageName, R.layout.widget_row)
                row.setTextViewText(R.id.clock, t.clock)
                row.setTextViewText(R.id.dest, if (t.towards.isBlank()) "" else "hacia ${t.towards}")
                row.setTextViewText(R.id.arrival, if (data.durationMin > 0) "llega ~${arrivalClock(t.atMs, data.durationMin)}" else "")
                row.setChronometerCountDown(R.id.count, true)
                row.setChronometer(R.id.count, SystemClock.elapsedRealtime() + (t.atMs - now), null, true)
                views.addView(R.id.rows, row)
            }
        }
        mgr.updateAppWidget(id, views)
    }

    fun updateAll(ctx: Context) {
        val mgr = AppWidgetManager.getInstance(ctx)
        mgr.getAppWidgetIds(ComponentName(ctx, MetroWidgetProvider::class.java)).forEach { update(ctx, mgr, it) }
    }

    private val fmt get() = SimpleDateFormat("HH:mm", Locale.getDefault())
    private fun clock(ms: Long) = fmt.format(Date(ms))
    private fun arrivalClock(departMs: Long, minutes: Int) = fmt.format(Date(departMs + minutes * 60_000L))

    private const val FLAGS = PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT

    private fun refreshIntent(ctx: Context, id: Int): PendingIntent =
        PendingIntent.getBroadcast(ctx, id, Intent(ctx, MetroWidgetProvider::class.java).setAction(ACTION_REFRESH), FLAGS)

    private fun openWebIntent(ctx: Context, id: Int, c: WidgetConfig): PendingIntent =
        PendingIntent.getActivity(ctx, id, Intent(Intent.ACTION_VIEW, Uri.parse("$WEB/metro/route?origin=${c.from}&dest=${c.to}")), FLAGS)

    private fun configIntent(ctx: Context, id: Int): PendingIntent =
        PendingIntent.getActivity(
            ctx, id,
            Intent(ctx, ConfigActivity::class.java).putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id),
            FLAGS,
        )
}

/** Trabajos en segundo plano: cada 15 min (el mínimo de Android) y cuando se pulsa ↻. */
object Refresh {
    private const val PERIODIC = "bt-periodic"
    private const val NOW = "bt-now"
    private val online = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()

    fun schedulePeriodic(ctx: Context) {
        val req = PeriodicWorkRequestBuilder<RefreshWorker>(15, TimeUnit.MINUTES).setConstraints(online).build()
        WorkManager.getInstance(ctx).enqueueUniquePeriodicWork(PERIODIC, ExistingPeriodicWorkPolicy.KEEP, req)
    }

    fun cancelPeriodic(ctx: Context) {
        WorkManager.getInstance(ctx).cancelUniqueWork(PERIODIC)
    }

    fun enqueueNow(ctx: Context) {
        val req = OneTimeWorkRequestBuilder<RefreshWorker>().setConstraints(online).build()
        WorkManager.getInstance(ctx).enqueueUniqueWork(NOW, ExistingWorkPolicy.KEEP, req)
    }
}

class RefreshWorker(private val ctx: Context, params: WorkerParameters) : Worker(ctx, params) {
    override fun doWork(): Result {
        val mgr = AppWidgetManager.getInstance(ctx)
        val ids = mgr.getAppWidgetIds(ComponentName(ctx, MetroWidgetProvider::class.java))
        // Un mismo trayecto en varios widgets se pide una sola vez
        val pairs = ids.mapNotNull { Store.config(ctx, it) }.map { it.from to it.to }.toSet()
        var failed = false
        for ((from, to) in pairs) {
            try {
                Store.saveRoute(ctx, from, to, MetroApi.fetch(from, to))
            } catch (_: Exception) {
                failed = true
            }
        }
        Render.updateAll(ctx)
        return if (failed) Result.retry() else Result.success()
    }
}

class MetroWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        appWidgetIds.forEach { Render.update(context, appWidgetManager, it) }
        Refresh.enqueueNow(context)
    }

    override fun onAppWidgetOptionsChanged(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, newOptions: android.os.Bundle) {
        Render.update(context, appWidgetManager, appWidgetId)
    }

    override fun onEnabled(context: Context) = Refresh.schedulePeriodic(context)

    override fun onDisabled(context: Context) = Refresh.cancelPeriodic(context)

    override fun onDeleted(context: Context, appWidgetIds: IntArray) = Store.forget(context, appWidgetIds)

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_REFRESH) {
            // Pulsaciones seguidas dentro de 20 s no repiten la petición
            if (System.currentTimeMillis() - Store.lastManualRefresh(context) > 20_000) {
                Store.markManualRefresh(context)
                Refresh.enqueueNow(context)
            }
        }
    }
}
