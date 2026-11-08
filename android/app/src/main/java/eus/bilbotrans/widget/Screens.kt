package eus.bilbotrans.widget

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.AutoCompleteTextView
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

private fun Activity.dp(v: Int) = (v * resources.displayMetrics.density).toInt()

/** Pantalla para elegir origen y destino al añadir (o reconfigurar) un widget. */
class ConfigActivity : Activity() {
    private var widgetId = AppWidgetManager.INVALID_APPWIDGET_ID

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setResult(RESULT_CANCELED)
        widgetId = intent?.extras?.getInt(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
            ?: AppWidgetManager.INVALID_APPWIDGET_ID
        if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            finish()
            return
        }

        val stations = Stations.all(this)
        val names = stations.map { it.name }
        val existing = Store.config(this, widgetId)

        fun field(hint: String, initial: String?) = AutoCompleteTextView(this).apply {
            setAdapter(ArrayAdapter(this@ConfigActivity, android.R.layout.simple_dropdown_item_1line, names))
            threshold = 1
            this.hint = hint
            setSingleLine()
            setText(initial ?: "")
            setTextColor(Color.WHITE)
            setHintTextColor(Color.parseColor("#98989F"))
            textSize = 17f
            setPadding(dp(14), dp(14), dp(14), dp(14))
            setBackgroundColor(Color.parseColor("#2C2C2E"))
            setOnFocusChangeListener { _, focus -> if (focus) selectAll() }
        }

        val origin = field("Origen", existing?.fromName)
        val dest = field("Destino", existing?.toName)
        val error = TextView(this).apply { setTextColor(Color.parseColor("#F0583A")); textSize = 13f }

        fun find(text: String): Station? = stations.firstOrNull { Stations.norm(it.name) == Stations.norm(text) }

        val save = Button(this).apply {
            text = "Guardar"
            setOnClickListener {
                val o = find(origin.text.toString())
                val d = find(dest.text.toString())
                when {
                    o == null -> error.text = "Elige el origen de la lista"
                    d == null -> error.text = "Elige el destino de la lista"
                    o.code == d.code -> error.text = "El origen y el destino no pueden ser el mismo"
                    else -> {
                        Store.saveConfig(this@ConfigActivity, widgetId, WidgetConfig(o.code, o.name, d.code, d.name))
                        Render.update(this@ConfigActivity, AppWidgetManager.getInstance(this@ConfigActivity), widgetId)
                        Refresh.schedulePeriodic(this@ConfigActivity)
                        Refresh.enqueueNow(this@ConfigActivity)
                        setResult(RESULT_OK, Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId))
                        finish()
                    }
                }
            }
        }

        val column = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(20), dp(48), dp(20), dp(20))
            addView(TextView(context).apply { text = "Trayecto del widget"; setTextColor(Color.WHITE); textSize = 22f; setPadding(0, 0, 0, dp(16)) })
            addView(origin, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { bottomMargin = dp(10) })
            addView(dest, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { bottomMargin = dp(10) })
            addView(error)
            addView(save, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(8) })
        }
        setContentView(column)
    }
}

/** Al abrir la app: instrucciones para añadir el widget y acceso a la web. */
class MainActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val column = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(28), dp(28), dp(28), dp(28))
            addView(TextView(context).apply { text = "BilboTrans"; setTextColor(Color.WHITE); textSize = 30f })
            addView(TextView(context).apply {
                text = "Mantén pulsada la pantalla de inicio, elige Widgets y añade «BilboTrans» para ver los próximos trenes entre dos estaciones de Metro Bilbao."
                setTextColor(Color.parseColor("#C7C7CC"))
                textSize = 16f
                setPadding(0, dp(12), 0, dp(24))
            })
            addView(Button(context).apply {
                text = "Abrir BilboTrans"
                setOnClickListener { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://bilbotrans.vercel.app"))) }
            })
        }
        setContentView(column)
    }
}
