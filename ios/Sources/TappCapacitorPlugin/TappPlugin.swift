import Foundation
import Capacitor
import Tapp
import TappNetworking

@objc(TappPlugin)
public class TappPlugin: CAPPlugin, CAPBridgedPlugin, TappDelegate {
    public let identifier = "TappPlugin"
    public let jsName = "Tapp"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "url", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "handleTappEvent", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "shouldProcess", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "fetchLinkData", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "fetchOriginLinkData", returnType: CAPPluginReturnPromise)
    ]

    // Accessed only on the main queue, including concurrent JS start calls.
    private var started = false
    private static let notStartedMessage = "Tapp has not been started. Call start() first."

    @objc public func start(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard !self.started else {
                call.resolve()
                return
            }
            guard let authToken = call.getString("authToken"), !authToken.isEmpty,
                  let tappToken = call.getString("tappToken"), !tappToken.isEmpty,
                  let env = call.getString("env"), ["PRODUCTION", "SANDBOX"].contains(env) else {
                call.reject("authToken and tappToken must be nonempty strings; env must be PRODUCTION or SANDBOX.", "INVALID_ARGUMENT")
                return
            }
            let config = TappConfiguration(
                authToken: authToken, env: env == "PRODUCTION" ? .production : .sandbox,
                tappToken: tappToken, affiliate: .tapp, bundleID: Bundle.main.bundleIdentifier
            )
            // Match RN's main-queue initialization; the SDK starts its own asynchronous work.
            Tapp.start(config: config, delegate: self)
            self.started = true
            call.resolve()
        }
    }

    @objc public func url(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard self.started else {
                call.reject(Self.notStartedMessage, "NOT_STARTED")
                return
            }
            guard let influencer = call.getString("influencer"), !influencer.isEmpty else {
                call.reject("influencer must be a nonempty string.", "INVALID_ARGUMENT")
                return
            }
            let config = AffiliateURLConfiguration(
                influencer: influencer, adgroup: call.getString("adGroup"),
                creative: call.getString("creative"), data: TappMapping.stringData(call.getObject("data"))
            )
            Tapp.url(config: config) { result in
                DispatchQueue.main.async {
                    switch result {
                    case .success(let response): call.resolve(["url": response.url.absoluteString])
                    case .failure(let error):
                        // URL generation rejects as RN does; it is not a link-data resolution.
                        call.reject(error.localizedDescription, "URL_ERROR", error)
                    }
                }
            }
        }
    }

    @objc public func handleTappEvent(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard self.started else {
                call.reject(Self.notStartedMessage, "NOT_STARTED")
                return
            }
            guard let name = TappMapping.eventName(
                action: call.getValue("eventAction"), customValue: call.getString("customValue")
            ) else {
                call.reject("eventAction must be an integer from 0 through 40.", "INVALID_ARGUMENT")
                return
            }
            // Use the Swift initializer: the Any-based initializer can coerce Bool to Int.
            let event = TappEvent(
                eventAction: EventActionMapper(eventActionName: name).eventAction,
                metadata: TappMapping.metadata(call.getObject("metadata"))
            )
            Tapp.handleTappEvent(event: event)
            call.resolve()
        }
    }

    @objc public func shouldProcess(_ call: CAPPluginCall) {
        guard let url = TappMapping.parsedURL(call.getString("url")) else {
            call.reject("url must be a nonempty, valid URL.", "INVALID_URL")
            return
        }
        DispatchQueue.main.async {
            call.resolve(["value": Tapp.shouldProcess(url: url)])
        }
    }

    @objc public func fetchLinkData(_ call: CAPPluginCall) {
        guard let url = TappMapping.parsedURL(call.getString("url")) else {
            call.reject("url must be a nonempty, valid URL.", "INVALID_URL")
            return
        }
        DispatchQueue.main.async {
            guard self.started else {
                call.resolve(TappMapping.failure(message: Self.notStartedMessage))
                return
            }
            Tapp.fetchLinkData(for: url) { result in
                self.resolveLinkData(call, result: result)
            }
        }
    }

    @objc public func fetchOriginLinkData(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard self.started else {
                call.resolve(TappMapping.failure(message: Self.notStartedMessage))
                return
            }
            Tapp.fetchOriginLinkData { result in
                self.resolveLinkData(call, result: result)
            }
        }
    }

    private func resolveLinkData(_ call: CAPPluginCall, result: Result<TappDeferredLinkData, Error>) {
        DispatchQueue.main.async {
            switch result {
            case .success(let data): call.resolve(self.dictionary(from: data))
            case .failure(let error): call.resolve(TappMapping.failure(message: error.localizedDescription))
            }
        }
    }

    private func dictionary(from data: TappDeferredLinkData) -> [String: Any] {
        TappMapping.linkData(
            tappURL: data.tappURL, attributedTappURL: data.attributedTappURL,
            influencer: data.influencer, data: data.data, isFirstSession: data.isFirstSession
        )
    }

    public func didOpenApplication(with data: TappDeferredLinkData) {
        DispatchQueue.main.async {
            self.notifyListeners("deferredLinkReceived", data: self.dictionary(from: data), retainUntilConsumed: true)
        }
    }

    public func didFailResolvingURL(url: URL, error: Error) {
        DispatchQueue.main.async {
            self.notifyListeners("didFailResolvingURL", data: [
                "url": url.absoluteString, "error": error.localizedDescription
            ], retainUntilConsumed: true)
        }
    }
}
