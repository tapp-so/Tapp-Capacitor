package so.tapp.capacitor

import com.example.tapp.Tapp
import com.example.tapp.models.Affiliate
import com.example.tapp.models.Environment
import com.example.tapp.services.affiliate.tapp.DeferredLinkDelegate
import com.example.tapp.services.network.RequestModels
import com.example.tapp.utils.TappConfiguration
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import org.json.JSONObject

@CapacitorPlugin(name = "Tapp")
class TappPlugin : Plugin() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var tapp: Tapp? = null
    private var started = false
    @Volatile private var destroyed = false

    private val delegate = object : DeferredLinkDelegate {
        override fun didReceiveDeferredLink(linkDataResponse: RequestModels.TappLinkDataResponse) {
            emit("deferredLinkReceived", TappMapping.linkData(linkDataResponse))
        }

        override fun didFailResolvingUrl(response: RequestModels.FailResolvingUrlResponse) {
            emit("didFailResolvingURL", mapOf("url" to response.url, "error" to response.error))
        }

        override fun testListener(test: String) = Unit
    }

    @PluginMethod
    fun start(call: PluginCall) {
        if (started) {
            call.resolve()
            return
        }
        val authToken = string(call, "authToken")
        val tappToken = string(call, "tappToken")
        val environment = when (string(call, "env")) {
            "PRODUCTION" -> Environment.PRODUCTION
            "SANDBOX" -> Environment.SANDBOX
            else -> null
        }
        if (authToken.isNullOrBlank() || tappToken.isNullOrBlank() || environment == null) {
            call.reject("Nonempty authToken and tappToken and env PRODUCTION or SANDBOX are required.", "INVALID_ARGUMENT")
            return
        }
        try {
            val sdk = instance()
            sdk.deferredLinkDelegate = delegate
            sdk.start(TappConfiguration(authToken, environment, tappToken, Affiliate.TAPP_NATIVE))
            started = true
            call.resolve()
        } catch (_: Exception) {
            // Do not expose configuration or credentials from native exception messages.
            call.reject("Unable to start Tapp.", "START_ERROR")
        }
    }

    @PluginMethod
    fun url(call: PluginCall) {
        val sdk = requireStarted(call) ?: return
        val influencer = string(call, "influencer")
        if (influencer.isNullOrBlank()) {
            call.reject("A nonempty influencer is required.", "INVALID_ARGUMENT")
            return
        }
        val adGroup = string(call, "adGroup")
        val creative = string(call, "creative")
        val data = TappMapping.stringData(objectMap(call.data.optJSONObject("data")))
        scope.launch {
            try {
                val result = sdk.url(influencer, adGroup, creative, data)
                if (result.error) {
                    call.reject(result.message.ifBlank { "Unable to generate Tapp URL." }, "URL_ERROR")
                } else if (result.influencer_url.isBlank()) {
                    call.reject("No Tapp URL returned.", "URL_ERROR")
                } else {
                    call.resolve(jsObject(mapOf("url" to result.influencer_url)))
                }
            } catch (cancelled: CancellationException) {
                throw cancelled
            } catch (_: Exception) {
                call.reject("Unable to generate Tapp URL.", "URL_ERROR")
            }
        }
    }

    @PluginMethod
    fun handleTappEvent(call: PluginCall) {
        val sdk = requireStarted(call) ?: return
        val action = TappMapping.eventAction(call.data.opt("eventAction"), string(call, "customValue"))
        if (action == null) {
            call.reject("eventAction must be an integer from 0 through 40.", "INVALID_ARGUMENT")
            return
        }
        val metadata = TappMapping.metadata(objectMap(call.data.optJSONObject("metadata")))
        try {
            sdk.handleTappEvent(RequestModels.TappEvent(eventName = action, metadata = metadata))
            call.resolve()
        } catch (_: Exception) {
            call.reject("Unable to handle Tapp event.", "HANDLE_EVENT_ERROR")
        }
    }

    @PluginMethod
    fun shouldProcess(call: PluginCall) {
        val url = requiredUrl(call) ?: return
        try {
            call.resolve(jsObject(mapOf("value" to instance().shouldProcess(url))))
        } catch (_: Exception) {
            call.resolve(jsObject(mapOf("value" to false)))
        }
    }

    @PluginMethod
    fun fetchLinkData(call: PluginCall) {
        val sdk = startedForLinkData(call) ?: return
        val url = requiredUrl(call) ?: return
        fetch(call) { sdk.fetchLinkData(url) }
    }

    @PluginMethod
    fun fetchOriginLinkData(call: PluginCall) {
        val sdk = startedForLinkData(call) ?: return
        fetch(call) { sdk.fetchOriginalLinkData() }
    }

    private fun fetch(call: PluginCall, request: suspend () -> RequestModels.TappLinkDataResponse?) {
        scope.launch {
            try {
                call.resolve(jsObject(TappMapping.linkData(request())))
            } catch (cancelled: CancellationException) {
                throw cancelled
            } catch (error: Exception) {
                call.resolve(jsObject(TappMapping.error(error.message)))
            }
        }
    }

    private fun instance(): Tapp = tapp ?: Tapp(context).also { tapp = it }

    private fun requireStarted(call: PluginCall): Tapp? {
        if (started) return tapp
        call.reject(TappMapping.NOT_STARTED, "NOT_STARTED")
        return null
    }

    private fun startedForLinkData(call: PluginCall): Tapp? {
        if (started) return tapp
        call.resolve(jsObject(TappMapping.error(TappMapping.NOT_STARTED)))
        return null
    }

    private fun requiredUrl(call: PluginCall): String? {
        val url = string(call, "url")
        if (!url.isNullOrBlank()) return url
        call.reject("A nonempty URL is required.", "INVALID_URL")
        return null
    }

    private fun string(call: PluginCall, key: String): String? = call.data.opt(key) as? String

    private fun objectMap(value: JSONObject?): Map<String, Any?>? = value?.let {
        buildMap {
            val keys = it.keys()
            while (keys.hasNext()) {
                val key = keys.next()
                put(key, it.opt(key))
            }
        }
    }

    private fun jsObject(values: Map<String, *>): JSObject = JSObject().apply {
        values.forEach { (key, value) ->
            // Explicitly wrap nested data so the bridge emits a JSON object.
            put(key, if (value is Map<*, *>) JSONObject(value) else value)
        }
    }

    private fun emit(name: String, payload: Map<String, Any>) {
        if (destroyed) return
        // Serialize event delivery with Capacitor's listener registration.
        bridge.execute {
            if (!destroyed) notifyListeners(name, jsObject(payload), true)
        }
    }

    override fun handleOnDestroy() {
        destroyed = true
        tapp?.deferredLinkDelegate = null
        scope.cancel()
        started = false
        tapp = null
        super.handleOnDestroy()
    }
}
